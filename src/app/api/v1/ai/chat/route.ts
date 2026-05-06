import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { anthropic } from "@/lib/anthropic";
import { db } from "@/lib/prisma";
import { getApiAuth } from "@/middleware/api-auth";
import { orchestrate } from "@/lib/orchestrator";

// ── Tool definitions ──────────────────────────────────────────────────────────

const TOOLS: Anthropic.Tool[] = [
  {
    name: "get_projects",
    description: "Get list of active projects with health scores and EVM metrics",
    input_schema: {
      type: "object",
      properties: {
        status: { type: "string", enum: ["ON_TRACK", "AT_RISK", "OFF_TRACK"], description: "Filter by health status" },
        limit:  { type: "number", description: "Max projects to return (default 10)" },
      },
    },
  },
  {
    name: "get_project_detail",
    description: "Get full details of a specific project including sprints, risks, and team",
    input_schema: {
      type: "object",
      required: ["projectId"],
      properties: {
        projectId: { type: "string" },
      },
    },
  },
  {
    name: "create_risk",
    description: "Add a new risk to a project",
    input_schema: {
      type: "object",
      required: ["projectId", "title", "probability", "impact"],
      properties: {
        projectId:   { type: "string" },
        title:       { type: "string" },
        description: { type: "string" },
        probability: { type: "number", description: "1-5 scale" },
        impact:      { type: "number", description: "1-5 scale" },
        category:    { type: "string", enum: ["TECHNICAL", "RESOURCES", "DEPENDENCY", "QUALITY", "SCOPE", "FINANCIAL"] },
        mitigation:  { type: "string" },
      },
    },
  },
  {
    name: "update_feature_status",
    description: "Update the status of a task or feature",
    input_schema: {
      type: "object",
      required: ["featureId", "status"],
      properties: {
        featureId: { type: "string" },
        status:    { type: "string", enum: ["TODO", "IN_PROGRESS", "DONE", "BLOCKED"] },
      },
    },
  },
  {
    name: "create_feature",
    description: "Add a new task/feature to a sprint",
    input_schema: {
      type: "object",
      required: ["sprintId", "title"],
      properties: {
        sprintId:   { type: "string" },
        title:      { type: "string" },
        priority:   { type: "string", enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"] },
        assigneeId: { type: "string" },
      },
    },
  },
  {
    name: "update_project_status",
    description: "Update the status of a project",
    input_schema: {
      type: "object",
      required: ["projectId", "status"],
      properties: {
        projectId: { type: "string" },
        status:    { type: "string", enum: ["ACTIVE", "PAUSED", "COMPLETED", "ARCHIVED"] },
      },
    },
  },
  {
    name: "get_alerts",
    description: "Get active alerts for the organisation or a specific project",
    input_schema: {
      type: "object",
      properties: {
        projectId: { type: "string" },
        level:     { type: "string", enum: ["critical", "warning", "info"] },
      },
    },
  },
  {
    name: "run_guardian_analysis",
    description: "Trigger Guardian AI analysis for a project and return health metrics",
    input_schema: {
      type: "object",
      required: ["projectId"],
      properties: {
        projectId: { type: "string" },
      },
    },
  },
  {
    name: "update_ui_config",
    description: "Update the user interface configuration — colors, theme, compact mode, language",
    input_schema: {
      type: "object",
      properties: {
        primaryColor: { type: "string", description: "Hex color e.g. #006D6B" },
        theme:        { type: "string", enum: ["light", "auto"] },
        compactMode:  { type: "boolean" },
        language:     { type: "string", enum: ["en", "it", "es", "fr"] },
        currency:     { type: "string", enum: ["EUR", "USD", "GBP"] },
        dateFormat:   { type: "string", enum: ["DD/MM/YYYY", "MM/DD/YYYY", "YYYY-MM-DD"] },
        defaultRole:  { type: "string", enum: ["PMO", "CEO", "STK", "DEV"] },
      },
    },
  },
];

// ── Context builders (CORE PRODUCT RULE) ─────────────────────────────────────

async function buildProjectContext(projectId: string, orgId: string) {
  return db.project.findFirst({
    where: { id: projectId, organisationId: orgId },
    include: {
      sprints: {
        where:   { status: { in: ["ACTIVE", "UPCOMING"] } },
        include: { features: true },
        orderBy: { startDate: "asc" },
        take:    1,
      },
      risks:       { where: { status: "OPEN" }, select: { id: true, title: true, probability: true, impact: true } },
      assignments: { include: { resource: { select: { name: true, role: true } } } },
    },
  });
}

type ProjectContext = Awaited<ReturnType<typeof buildProjectContext>>;

function buildSystemPrompt(
  ctx: { org: { name: string }; user: { name?: string | null; email: string; preferredView?: string | null } },
  project: ProjectContext,
): string {
  const activeSprint = project?.sprints[0];
  const features     = activeSprint?.features ?? [];
  const risks        = project?.risks ?? [];

  const projectSection = project
    ? `\n--- CURRENT PROJECT CONTEXT ---
Project: ${project.name} (ID: ${project.id})
Status: ${project.status} | Health: ${(project as any).healthScore ?? "N/A"}/100
Budget: €${(project as any).budgetTotal ?? 0}

Active Sprint: ${activeSprint ? activeSprint.name : "None"}${activeSprint ? `
  Tasks: ${features.length} total · ${features.filter(f => f.status === "DONE").length} done · ${features.filter(f => f.status === "IN_PROGRESS").length} in progress · ${features.filter(f => f.status === "BLOCKED").length} blocked` : ""}

Open Risks: ${risks.length}${risks.length > 0 ? "\n" + risks.slice(0, 5).map(r => `  · ${r.title} (score ${r.probability * r.impact})`).join("\n") : ""}

Team: ${project.assignments.length > 0 ? project.assignments.map((a: any) => `${a.resource.name} (${a.resource.role})`).join(", ") : "No assignments"}
--- END PROJECT CONTEXT ---`
    : "No specific project selected — use get_projects to discover projects";

  return `You are Guardian AI, the intelligent PMO assistant for RoadmapAI.
You help PMOs, CEOs, and project teams manage projects through natural language.
You can read project data, create risks, update task statuses, and trigger analyses.

Organisation: ${ctx.org.name}
User: ${ctx.user.name ?? ctx.user.email} (${ctx.user.preferredView ?? "PMO"} view)${projectSection}

Instructions:
- When asked to do something, use tools to execute it, then confirm with specifics.
- Always include project names, scores, and IDs in your response.
- Be concise and professional. Prefer bullet points for lists.
- If the user writes in Italian, respond in Italian.
- After executing write operations (create_risk, create_feature, update_feature_status, etc.), confirm what was done.
- If you need a project ID and don't have one, call get_projects first.`;
}

// ── Tool execution ────────────────────────────────────────────────────────────

async function executeTool(
  toolName: string,
  toolInput: Record<string, unknown>,
  orgId: string,
  userId: string,
): Promise<unknown> {
  switch (toolName) {

    case "get_projects":
      return db.project.findMany({
        where:   { organisationId: orgId, status: { notIn: ["ARCHIVED", "CLOSED"] } },
        select:  { id: true, name: true, healthScore: true, status: true, budgetTotal: true, startDate: true, endDate: true },
        orderBy: { updatedAt: "desc" },
        take:    (toolInput.limit as number | undefined) ?? 10,
      });

    case "get_project_detail":
      return db.project.findFirst({
        where:   { id: toolInput.projectId as string, organisationId: orgId },
        include: {
          phases:      true,
          sprints:     { include: { features: true } },
          risks:       { where: { status: "OPEN" } },
          assignments: { include: { resource: true } },
        },
      });

    case "create_risk": {
      const risk = await db.risk.create({
        data: {
          projectId:   toolInput.projectId as string,
          title:       toolInput.title as string,
          description: (toolInput.description as string | undefined) ?? "",
          probability: toolInput.probability as number,
          impact:      toolInput.impact as number,
          category:    (toolInput.category as string | undefined) ?? "TECHNICAL",
          mitigation:  (toolInput.mitigation as string | undefined) ?? "",
          status:      "OPEN",
          ownerName:   "AI Assistant",
        },
      });
      await db.activity.create({
        data: {
          projectId:      toolInput.projectId as string,
          organisationId: orgId,
          userId,
          userName:       "AI Assistant",
          action:         "RISK_ADDED",
          entity:         "risk",
          entityId:       risk.id,
          entityName:     risk.title,
          meta:           { source: "ai_chat", score: (toolInput.probability as number) * (toolInput.impact as number) },
        },
      });
      orchestrate("feature_updated", toolInput.projectId as string, orgId);
      return risk;
    }

    case "update_feature_status": {
      const feature = await db.feature.update({
        where:   { id: toolInput.featureId as string },
        data:    { status: toolInput.status as "TODO" | "IN_PROGRESS" | "DONE" | "BLOCKED" },
        include: { sprint: { select: { projectId: true } } },
      });
      orchestrate("feature_updated", (feature as any).sprint.projectId, orgId);
      return feature;
    }

    case "create_feature": {
      const feature = await db.feature.create({
        data: {
          sprintId: toolInput.sprintId as string,
          title:    toolInput.title as string,
          priority: (toolInput.priority as "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" | undefined) ?? "MEDIUM",
          status:   "TODO",
          order:    999,
        },
      });
      const sprint = await db.sprint.findUnique({
        where:  { id: toolInput.sprintId as string },
        select: { projectId: true },
      });
      if (sprint) orchestrate("feature_updated", sprint.projectId, orgId);
      return feature;
    }

    case "update_project_status": {
      const project = await db.project.update({
        where: { id: toolInput.projectId as string, organisationId: orgId },
        data:  { status: toolInput.status as "ACTIVE" | "PAUSED" | "COMPLETED" | "ARCHIVED" },
      });
      orchestrate("feature_updated", toolInput.projectId as string, orgId);
      return project;
    }

    case "get_alerts":
      return db.alert.findMany({
        where: {
          organisationId: orgId,
          resolved:       false,
          ...(toolInput.projectId ? { projectId: toolInput.projectId as string } : {}),
          ...(toolInput.level     ? { level: toolInput.level as string }          : {}),
        },
        orderBy: { createdAt: "desc" },
        take:    20,
      });

    case "run_guardian_analysis": {
      const { triggerAgents } = await import("@/lib/agent-triggers");
      triggerAgents("feature_updated", toolInput.projectId as string, orgId);
      return { triggered: true, projectId: toolInput.projectId, message: "Guardian analysis triggered in background" };
    }

    case "update_ui_config": {
      const data: Record<string, unknown> = {};
      if (toolInput.primaryColor !== undefined) data.uiPrimaryColor = toolInput.primaryColor;
      if (toolInput.theme        !== undefined) data.uiTheme        = toolInput.theme;
      if (toolInput.language     !== undefined) data.uiLanguage     = toolInput.language;
      if (toolInput.currency     !== undefined) data.uiCurrency     = toolInput.currency;
      if (toolInput.dateFormat   !== undefined) data.uiDateFormat   = toolInput.dateFormat;
      if (toolInput.defaultRole  !== undefined) data.uiDefaultRole  = toolInput.defaultRole;
      if (toolInput.compactMode  !== undefined) data.uiCompactMode  = toolInput.compactMode;
      if (Object.keys(data).length === 0) return { error: "No valid fields provided" };
      await db.organisation.update({ where: { id: orgId }, data });
      return { ok: true, updated: Object.keys(data), message: "UI config updated. Reload or navigate to see changes." };
    }

    default:
      return { error: `Unknown tool: ${toolName}` };
  }
}

// ── Main handler ──────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  try {
    const auth = await getApiAuth(req);
    if (!auth.valid || !auth.ctx)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json() as { message?: string; projectId?: string; sessionId?: string };
    if (!body.message?.trim())
      return NextResponse.json({ error: "message required" }, { status: 400 });

    const { ctx } = auth;
    const { message, projectId } = body;

    const project    = projectId ? await buildProjectContext(projectId, ctx.org.id) : null;
    const systemPrompt = buildSystemPrompt(ctx, project);

    const messages: Anthropic.MessageParam[] = [{ role: "user", content: message }];
    const actionsLog: { tool: string; input: unknown; result: unknown }[] = [];

    let finalText = "";
    let iterations = 0;
    const MAX_ITERATIONS = 5;

    while (iterations < MAX_ITERATIONS) {
      iterations++;

      const response = await anthropic.messages.create({
        model:      process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6",
        max_tokens: 1024,
        system:     systemPrompt,
        tools:      TOOLS,
        messages,
      });

      // Append assistant turn
      messages.push({ role: "assistant", content: response.content as Anthropic.ContentBlock[] });

      // Extract tool calls
      const toolCalls = response.content.filter(
        (b): b is Anthropic.ToolUseBlock => b.type === "tool_use"
      );

      if (toolCalls.length === 0 || response.stop_reason === "end_turn") {
        const textBlock = response.content.find(b => b.type === "text") as Anthropic.TextBlock | undefined;
        finalText = textBlock?.text ?? "";
        break;
      }

      // Execute tools in parallel
      const toolResults: Anthropic.ToolResultBlockParam[] = await Promise.all(
        toolCalls.map(async block => {
          const result = await executeTool(
            block.name,
            block.input as Record<string, unknown>,
            ctx.org.id,
            ctx.user.id,
          );
          actionsLog.push({ tool: block.name, input: block.input, result });
          return {
            type:        "tool_result" as const,
            tool_use_id: block.id,
            content:     JSON.stringify(result),
          };
        })
      );

      messages.push({ role: "user", content: toolResults });
    }

    return NextResponse.json({
      message: finalText,
      actionsPerformed: actionsLog.map(a => ({
        tool:    a.tool,
        summary: `${a.tool} executed`,
      })),
      ok: true,
    });

  } catch (err) {
    console.error("AI chat error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
