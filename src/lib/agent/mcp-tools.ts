import { db } from "@/lib/prisma";
import { calculateHealth } from "@/lib/health";
import { semanticSearch } from "@/lib/knowledge-graph";
import { orchestrate } from "@/lib/orchestrator";

export interface MCPTool {
  name: string;
  description: string;
  input_schema: {
    type: "object";
    required: string[];
    properties: Record<string, unknown>;
  };
  execute: (input: Record<string, unknown>, ctx: AgentToolContext) => Promise<unknown>;
}

export interface AgentToolContext {
  orgId:      string;
  projectId?: string;
  userId:     string;
}

// ── READ TOOLS ────────────────────────────────────────────────────────────────

export const getProjectTool: MCPTool = {
  name: "get_project",
  description: "Get complete project data including sprints, features, risks, team, and EVM metrics. Use this first to understand the current project state before taking any action.",
  input_schema: {
    type: "object",
    required: ["project_id"],
    properties: {
      project_id: { type: "string", description: "The project ID to retrieve" },
    },
  },
  execute: async (input, ctx) => {
    const project = await db.project.findFirst({
      where: { id: input.project_id as string, organisationId: ctx.orgId },
      include: {
        phases:   { orderBy: { order: "asc" } },
        sprints:  {
          orderBy: { order: "asc" },
          include: {
            features: {
              orderBy: { order: "asc" },
              include: { assignedTo: { select: { id: true, name: true } } },
            },
          },
        },
        risks:         { where: { status: "OPEN" }, orderBy: [{ probability: "desc" }, { impact: "desc" }] },
        assignments:   { include: { resource: true } },
        guardianReport: true,
      },
    });

    if (!project) return { error: "Project not found" };

    const allFeatures = project.sprints.flatMap(s => s.features);
    const health = calculateHealth({
      startDate:          project.startDate,
      endDate:            project.endDate,
      totalFeatures:      allFeatures.length,
      doneFeatures:       allFeatures.filter(f => f.status === "DONE").length,
      blockedFeatures:    allFeatures.filter(f => f.status === "BLOCKED").length,
      inProgressFeatures: allFeatures.filter(f => f.status === "IN_PROGRESS").length,
      totalSprints:       project.sprints.length,
      doneSprints:        project.sprints.filter(s => s.status === "DONE").length,
      activeSprints:      project.sprints.filter(s => s.status === "ACTIVE").length,
      budgetTotal:        project.budgetTotal,
      costActual:         project.assignments.reduce((s, a) => s + a.actualHours    * a.resource.costPerHour, 0),
      costEstimated:      project.assignments.reduce((s, a) => s + a.estimatedHours * a.resource.costPerHour, 0),
      totalCapacityHours: project.assignments.reduce((s, a) => s + a.resource.capacityHours, 0),
      totalActualHours:   project.assignments.reduce((s, a) => s + a.actualHours, 0),
      openRisks:          project.risks.length,
      highRisks:          project.risks.filter(r => r.probability * r.impact >= 9).length,
      maxRiskScore:       project.risks.reduce((m, r) => Math.max(m, r.probability * r.impact), 0),
    });

    return {
      id:     project.id,
      name:   project.name,
      status: project.status,
      health: {
        score:              health.healthScore,
        status:             health.status,
        spi:                health.spi,
        cpi:                health.cpi,
        eac:                health.eac,
        delayDays:          health.delayDays,
        daysLeft:           health.daysLeft,
        onTrackProbability: health.onTrackProbability,
        alerts:             health.alerts,
      },
      features: {
        total:      allFeatures.length,
        done:       allFeatures.filter(f => f.status === "DONE").length,
        blocked:    allFeatures.filter(f => f.status === "BLOCKED").length,
        inProgress: allFeatures.filter(f => f.status === "IN_PROGRESS").length,
        todo:       allFeatures.filter(f => f.status === "TODO").length,
      },
      sprints: project.sprints.map(s => ({
        id:       s.id,
        name:     s.name,
        status:   s.status,
        goal:     s.goal,
        features: s.features.map(f => ({
          id:             f.id,
          title:          f.title,
          status:         f.status,
          priority:       f.priority,
          estimatedHours: f.estimatedHours,
          actualHours:    f.actualHours,
          assignedTo:     f.assignedTo ? { id: f.assignedTo.id, name: f.assignedTo.name } : null,
        })),
      })),
      risks: project.risks.map(r => ({
        id:         r.id,
        title:      r.title,
        score:      r.probability * r.impact,
        level:      r.probability * r.impact >= 15 ? "CRITICAL"
                  : r.probability * r.impact >= 10 ? "HIGH"
                  : r.probability * r.impact >= 5  ? "MEDIUM" : "LOW",
        status:     r.status,
        mitigation: r.mitigation,
      })),
      team: project.assignments.map(a => ({
        name:        a.resource.name,
        role:        a.resource.role,
        utilization: a.resource.capacityHours > 0
          ? Math.round((a.actualHours / a.resource.capacityHours) * 100)
          : 0,
      })),
      guardian: project.guardianReport ? {
        insight:        project.guardianReport.insight,
        recommendation: project.guardianReport.recommendation,
        generatedAt:    project.guardianReport.generatedAt,
      } : null,
    };
  },
};

export const getAllProjectsTool: MCPTool = {
  name: "get_all_projects",
  description: "Get all active projects for the organisation with health summary. Use for portfolio-level questions.",
  input_schema: {
    type: "object",
    required: [],
    properties: {
      status: {
        type: "string",
        enum: ["ACTIVE", "PLANNING", "PAUSED", "ALL"],
        description: "Filter by status. Default: ACTIVE",
      },
    },
  },
  execute: async (input, ctx) => {
    const where: Record<string, unknown> = { organisationId: ctx.orgId };
    if (input.status && input.status !== "ALL") {
      where.status = input.status;
    } else if (!input.status) {
      where.status = { notIn: ["ARCHIVED", "CLOSED"] };
    }

    const projects = await db.project.findMany({
      where,
      include: {
        sprints:       { include: { features: true } },
        risks:         { where: { status: "OPEN" } },
        guardianReport: { select: { insight: true, generatedAt: true } },
      },
    });

    return projects.map(p => {
      const allFeatures = p.sprints.flatMap(s => s.features);
      return {
        id:            p.id,
        name:          p.name,
        status:        p.status,
        healthScore:   p.healthScore,
        features: {
          total:   allFeatures.length,
          done:    allFeatures.filter(f => f.status === "DONE").length,
          blocked: allFeatures.filter(f => f.status === "BLOCKED").length,
        },
        openRisks:     p.risks.length,
        criticalRisks: p.risks.filter(r => r.probability * r.impact >= 15).length,
        guardian:      p.guardianReport?.insight ?? null,
      };
    });
  },
};

export const searchKnowledgeTool: MCPTool = {
  name: "search_knowledge",
  description: "Search the knowledge graph using semantic similarity. Use this to find related context, past decisions, risks, and events. Essential for answering 'why' questions.",
  input_schema: {
    type: "object",
    required: ["query"],
    properties: {
      query:      { type: "string",  description: "Natural language search query" },
      project_id: { type: "string",  description: "Limit search to a specific project (optional)" },
      type: {
        type: "string",
        enum: ["project", "risk", "decision", "message", "event", "feature"],
        description: "Filter by node type (optional)",
      },
      limit: { type: "number", description: "Max results to return (default: 5)" },
    },
  },
  execute: async (input, ctx) => {
    try {
      const results = await semanticSearch(
        ctx.orgId,
        input.query as string,
        input.type as string | undefined,
        (input.limit as number) || 5,
        0.6,
      );
      return { results, count: results.length };
    } catch {
      return { results: [], count: 0, note: "Knowledge search unavailable" };
    }
  },
};

export const getAlertsTool: MCPTool = {
  name: "get_alerts",
  description: "Get current alerts for the organisation or a specific project.",
  input_schema: {
    type: "object",
    required: [],
    properties: {
      project_id:  { type: "string" },
      level:       { type: "string", enum: ["critical", "warning", "info"] },
      unread_only: { type: "boolean" },
    },
  },
  execute: async (input, ctx) => {
    const where: Record<string, unknown> = {
      organisationId: ctx.orgId,
      resolved: false,
    };
    if (input.project_id)  where.projectId = input.project_id;
    if (input.level)       where.level     = (input.level as string).toLowerCase();
    if (input.unread_only) where.read      = false;

    const alerts = await db.alert.findMany({
      where,
      orderBy: [{ level: "asc" }, { createdAt: "desc" }],
      take: 20,
    });

    return {
      alerts: alerts.map(a => ({
        id:        a.id,
        level:     a.level,
        title:     a.title,
        detail:    a.detail,
        projectId: a.projectId,
        read:      a.read,
        createdAt: a.createdAt,
      })),
      count: alerts.length,
    };
  },
};

// ── WRITE TOOLS ───────────────────────────────────────────────────────────────

export const createFeatureTool: MCPTool = {
  name: "create_feature",
  description: "Create a new task/feature in a sprint. Use when user asks to add tasks, create work items, or populate a sprint.",
  input_schema: {
    type: "object",
    required: ["sprint_id", "title"],
    properties: {
      sprint_id:       { type: "string", description: "Sprint ID to add the feature to" },
      title:           { type: "string", description: "Feature title" },
      priority:        { type: "string", enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"], description: "Default: MEDIUM" },
      estimated_hours: { type: "number", description: "Estimated hours. Default: 4" },
      assigned_to_id:  { type: "string", description: "Resource ID to assign (optional)" },
    },
  },
  execute: async (input, ctx) => {
    const sprint = await db.sprint.findFirst({
      where:   { id: input.sprint_id as string, project: { organisationId: ctx.orgId } },
      include: { _count: { select: { features: true } }, project: true },
    });
    if (!sprint) return { error: "Sprint not found or access denied" };

    const feature = await db.feature.create({
      data: {
        sprintId:       sprint.id,
        title:          input.title as string,
        priority:       ((input.priority as string) ?? "MEDIUM") as "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
        status:         "TODO",
        estimatedHours: (input.estimated_hours as number) ?? 4,
        actualHours:    0,
        order:          sprint._count.features,
        assignedToId:   (input.assigned_to_id as string | undefined) ?? null,
      },
    });

    await db.activity.create({
      data: {
        projectId:      sprint.projectId,
        organisationId: ctx.orgId,
        userId:         ctx.userId,
        userName:       "Guardian AI",
        action:         "FEATURE_CREATED",
        entity:         "feature",
        entityId:       feature.id,
        entityName:     feature.title,
        meta:           { source: "guardian_ai_chat", sprintName: sprint.name },
      },
    });

    orchestrate("feature_updated", sprint.projectId, ctx.orgId);

    return {
      success: true,
      feature: { id: feature.id, title: feature.title, priority: feature.priority, sprint: sprint.name },
      message: `Created "${feature.title}" in ${sprint.name}`,
    };
  },
};

export const createRiskTool: MCPTool = {
  name: "create_risk",
  description: "Add a new risk to the project risk register. Use when user mentions a potential problem, dependency, or concern.",
  input_schema: {
    type: "object",
    required: ["project_id", "title", "probability", "impact"],
    properties: {
      project_id:  { type: "string" },
      title:       { type: "string", description: "Clear risk statement" },
      probability: { type: "integer", description: "1=Unlikely … 5=Almost certain" },
      impact:      { type: "integer", description: "1=Minimal … 5=Catastrophic" },
      category: {
        type: "string",
        enum: ["TECHNICAL", "RESOURCES", "DEPENDENCY", "QUALITY", "SCOPE", "FINANCIAL"],
        description: "Default: TECHNICAL",
      },
      mitigation: { type: "string", description: "Specific mitigation actions" },
    },
  },
  execute: async (input, ctx) => {
    const project = await db.project.findFirst({
      where: { id: input.project_id as string, organisationId: ctx.orgId },
    });
    if (!project) return { error: "Project not found" };

    const prob  = input.probability as number;
    const imp   = input.impact as number;
    const score = prob * imp;
    const level = score >= 15 ? "CRITICAL" : score >= 10 ? "HIGH" : score >= 5 ? "MEDIUM" : "LOW";

    const risk = await db.risk.create({
      data: {
        projectId:   project.id,
        title:       input.title as string,
        probability: prob,
        impact:      imp,
        category:    (input.category as string | undefined) ?? "TECHNICAL",
        mitigation:  (input.mitigation as string | undefined) ?? "",
        status:      "OPEN",
      },
    });

    await db.activity.create({
      data: {
        projectId:      project.id,
        organisationId: ctx.orgId,
        userId:         ctx.userId,
        userName:       "Guardian AI",
        action:         "RISK_ADDED",
        entity:         "risk",
        entityId:       risk.id,
        entityName:     risk.title,
        meta:           { score, level, source: "guardian_ai_chat" },
      },
    });

    orchestrate("risk_added", project.id, ctx.orgId);

    return {
      success: true,
      risk:    { id: risk.id, title: risk.title, score, level },
      message: `Risk created: "${risk.title}" (Score: ${score}, ${level})`,
    };
  },
};

export const updateFeatureStatusTool: MCPTool = {
  name: "update_feature_status",
  description: "Update the status of a feature/task. Use when user asks to mark something as done, blocked, in progress, etc.",
  input_schema: {
    type: "object",
    required: ["feature_id", "status"],
    properties: {
      feature_id: { type: "string" },
      status: {
        type: "string",
        enum: ["TODO", "IN_PROGRESS", "DONE", "BLOCKED"],
      },
      notes: { type: "string", description: "Optional notes about the status change" },
    },
  },
  execute: async (input, ctx) => {
    const feature = await db.feature.findFirst({
      where:   { id: input.feature_id as string, sprint: { project: { organisationId: ctx.orgId } } },
      include: { sprint: { include: { project: true } } },
    });
    if (!feature) return { error: "Feature not found" };

    const oldStatus = feature.status;
    const newStatus = input.status as "TODO" | "IN_PROGRESS" | "DONE" | "BLOCKED";

    await db.feature.update({
      where: { id: feature.id },
      data:  { status: newStatus },
    });

    await db.activity.create({
      data: {
        projectId:      feature.sprint.projectId,
        organisationId: ctx.orgId,
        userId:         ctx.userId,
        userName:       "Guardian AI",
        action:         "FEATURE_STATUS_CHANGED",
        entity:         "feature",
        entityId:       feature.id,
        entityName:     feature.title,
        meta:           { oldStatus, newStatus, source: "guardian_ai_chat" },
      },
    });

    const event = newStatus === "BLOCKED" ? "feature_blocked" : "feature_updated";
    orchestrate(event, feature.sprint.projectId, ctx.orgId);

    return {
      success:  true,
      feature:  { id: feature.id, title: feature.title, oldStatus, newStatus },
      message:  `"${feature.title}" updated: ${oldStatus} → ${newStatus}`,
    };
  },
};

export const suggestMitigationTool: MCPTool = {
  name: "suggest_mitigation",
  description: "Generate mitigation suggestions for a specific risk, or save a chosen mitigation plan.",
  input_schema: {
    type: "object",
    required: ["risk_id"],
    properties: {
      risk_id:          { type: "string" },
      apply_mitigation: { type: "string", description: "If provided, saves this as the risk mitigation plan" },
    },
  },
  execute: async (input, ctx) => {
    const risk = await db.risk.findFirst({
      where:   { id: input.risk_id as string, project: { organisationId: ctx.orgId } },
      include: { project: { select: { name: true, id: true } } },
    });
    if (!risk) return { error: "Risk not found" };

    if (input.apply_mitigation) {
      await db.risk.update({
        where: { id: risk.id },
        data:  { mitigation: input.apply_mitigation as string },
      });
      return { success: true, message: `Mitigation plan saved for: "${risk.title}"` };
    }

    const score = risk.probability * risk.impact;
    return {
      risk:        { title: risk.title, score, probability: risk.probability, impact: risk.impact },
      suggestions: [
        {
          option:            "A",
          action:            `Reduce probability: assign dedicated owner to monitor "${risk.title}"`,
          owner:             "PMO / Tech Lead",
          timeline:          "Within 48 hours",
          expectedNewScore:  Math.max(1, risk.probability - 1) * risk.impact,
        },
        {
          option:            "B",
          action:            `Reduce impact: implement contingency plan and define fallback approach`,
          owner:             "PM",
          timeline:          "Within 1 week",
          expectedNewScore:  risk.probability * Math.max(1, risk.impact - 1),
        },
        {
          option:            "C",
          action:            `Accept with monitoring: document acceptance, set escalation trigger`,
          owner:             "Sponsor",
          timeline:          "Review weekly",
          expectedNewScore:  score,
        },
      ],
      instruction: "Reply with 'Apply option A/B/C' or provide your own mitigation text.",
    };
  },
};

export const updateProjectBudgetTool: MCPTool = {
  name: "update_project_budget",
  description: "Update project budget or expected revenue.",
  input_schema: {
    type: "object",
    required: ["project_id"],
    properties: {
      project_id:       { type: "string" },
      budget_total:     { type: "number", description: "New total budget in org currency" },
      revenue_expected: { type: "number", description: "Expected revenue/value" },
    },
  },
  execute: async (input, ctx) => {
    const project = await db.project.findFirst({
      where: { id: input.project_id as string, organisationId: ctx.orgId },
    });
    if (!project) return { error: "Project not found" };

    const updateData: Record<string, unknown> = {};
    if (input.budget_total     !== undefined) updateData.budgetTotal     = input.budget_total;
    if (input.revenue_expected !== undefined) updateData.revenueExpected = input.revenue_expected;
    if (!Object.keys(updateData).length) return { error: "No fields to update" };

    await db.project.update({ where: { id: project.id }, data: updateData });

    await db.activity.create({
      data: {
        projectId:      project.id,
        organisationId: ctx.orgId,
        userId:         ctx.userId,
        userName:       "Guardian AI",
        action:         "BUDGET_UPDATED",
        entity:         "project",
        entityId:       project.id,
        entityName:     project.name,
        meta:           { ...updateData, source: "guardian_ai_chat" },
      },
    });

    orchestrate("budget_updated", project.id, ctx.orgId);

    return {
      success: true,
      message: `Budget updated for "${project.name}": €${input.budget_total ?? project.budgetTotal}`,
    };
  },
};

// ── TOOL REGISTRY ─────────────────────────────────────────────────────────────

export const MCP_TOOLS: MCPTool[] = [
  getProjectTool,
  getAllProjectsTool,
  searchKnowledgeTool,
  getAlertsTool,
  createFeatureTool,
  createRiskTool,
  updateFeatureStatusTool,
  suggestMitigationTool,
  updateProjectBudgetTool,
];

export function toAnthropicTools() {
  return MCP_TOOLS.map(t => ({
    name:         t.name,
    description:  t.description,
    input_schema: t.input_schema,
  }));
}

export async function executeTool(
  name: string,
  input: Record<string, unknown>,
  ctx: AgentToolContext,
): Promise<unknown> {
  const tool = MCP_TOOLS.find(t => t.name === name);
  if (!tool) return { error: `Unknown tool: ${name}` };
  return tool.execute(input, ctx);
}
