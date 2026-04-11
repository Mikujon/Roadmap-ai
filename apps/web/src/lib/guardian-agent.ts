// ── Guardian Agent — AI PM with Tool Use ─────────────────────────────────
// Uses Anthropic Tool Use to create an intelligent PM agent that:
// 1. Reads project data through tools
// 2. Reasons about the project state
// 3. Provides contextual, actionable advice

import Anthropic from "@anthropic-ai/sdk";
import { calculateHealth } from "./health";

const anthropic = new Anthropic();

// ── Tool definitions ──────────────────────────────────────────────────────
const GUARDIAN_TOOLS: Anthropic.Tool[] = [
  {
    name: "get_project_metrics",
    description: "Get current EVM metrics for the project: SPI, CPI, EAC, progress, delays. Use this first to understand the project health.",
    input_schema: {
      type: "object" as const,
      properties: {
        projectId: { type: "string", description: "The project ID" }
      },
      required: ["projectId"]
    }
  },
  {
    name: "get_status_history",
    description: "Get the full status change history of the project, including reasons for pauses, closures, and other lifecycle changes.",
    input_schema: {
      type: "object" as const,
      properties: {
        projectId: { type: "string", description: "The project ID" }
      },
      required: ["projectId"]
    }
  },
  {
    name: "get_risk_assessment",
    description: "Get all open risks with probability, impact and mitigation status.",
    input_schema: {
      type: "object" as const,
      properties: {
        projectId: { type: "string", description: "The project ID" }
      },
      required: ["projectId"]
    }
  },
  {
    name: "get_team_performance",
    description: "Get team utilization, resource allocation, and hour tracking.",
    input_schema: {
      type: "object" as const,
      properties: {
        projectId: { type: "string", description: "The project ID" }
      },
      required: ["projectId"]
    }
  },
 {
    name: "get_sprint_velocity",
    description: "Analyze sprint velocity trends — how fast the team is completing features over time. Identifies acceleration or slowdown patterns.",
    input_schema: {
      type: "object" as const,
      properties: {
        projectId: { type: "string", description: "The project ID" }
      },
      required: ["projectId"]
    }
  },
  {
    name: "get_snapshot_comparison",
    description: "Compare current project state with the latest snapshot to identify scope changes, timeline shifts, and budget deviations since last baseline.",
    input_schema: {
      type: "object" as const,
      properties: {
        projectId: { type: "string", description: "The project ID" }
      },
      required: ["projectId"]
    }
  },
  {
    name: "get_dependency_graph",
    description: "Get all feature and project dependencies, identifying critical path blockers and circular dependencies.",
    input_schema: {
      type: "object" as const,
      properties: {
        projectId: { type: "string", description: "The project ID" }
      },
      required: ["projectId"]
    }
  },
];

// ── Tool implementations ──────────────────────────────────────────────────
async function executeTool(name: string, _input: unknown, projectData: any): Promise<string> {
  const p = projectData;

  switch (name) {
    case "get_project_metrics": {
      const allF        = p.sprints.flatMap((s: any) => s.features);
      const done        = allF.filter((f: any) => f.status === "DONE").length;
      const blocked     = allF.filter((f: any) => f.status === "BLOCKED").length;
      const inProgress  = allF.filter((f: any) => f.status === "IN_PROGRESS").length;
      const costActual  = p.assignments.reduce((s: number, a: any) => s + a.actualHours * a.resource.costPerHour, 0);
      const costEst     = p.assignments.reduce((s: number, a: any) => s + a.estimatedHours * a.resource.costPerHour, 0);
      const openRisks   = p.risks.filter((r: any) => r.status === "OPEN");
      const highRisks   = p.risks.filter((r: any) => r.status === "OPEN" && r.probability * r.impact >= 9);
      const maxRisk     = openRisks.length > 0 ? Math.max(...openRisks.map((r: any) => r.probability * r.impact)) : 0;

      const h = calculateHealth({
        startDate: p.startDate, endDate: p.endDate,
        totalFeatures: allF.length, doneFeatures: done,
        blockedFeatures: blocked, inProgressFeatures: inProgress,
        totalSprints: p.sprints.length,
        doneSprints: p.sprints.filter((s: any) => s.status === "DONE").length,
        activeSprints: p.sprints.filter((s: any) => s.status === "ACTIVE").length,
        budgetTotal: p.budgetTotal, costActual, costEstimated: costEst,
        totalCapacityHours: p.assignments.reduce((s: number, a: any) => s + a.resource.capacityHours, 0),
        totalActualHours: p.assignments.reduce((s: number, a: any) => s + a.actualHours, 0),
        openRisks: openRisks.length, highRisks: highRisks.length, maxRiskScore: maxRisk,
      });

      return JSON.stringify({
        healthScore:       h.healthScore,
        status:            h.status,
        progressNominal:   h.progressNominal,
        progressReal:      h.progressReal,
        spi:               h.spi,
        cpi:               h.cpi,
        eac:               Math.round(h.eac),
        etc:               Math.round(h.etc),
        vac:               Math.round(h.vac),
        sv:                Math.round(h.sv),
        cv:                Math.round(h.cv),
        tcpi:              h.tcpi,
        daysLeft:          h.daysLeft,
        delayDays:         h.delayDays,
        onTrackProbability: h.onTrackProbability,
        budgetRisk:        h.budgetRisk,
        totalFeatures:     allF.length,
        doneFeatures:      done,
        blockedFeatures:   blocked,
        inProgressFeatures: inProgress,
        totalSprints:      p.sprints.length,
        doneSprints:       p.sprints.filter((s: any) => s.status === "DONE").length,
        activeSprints:     p.sprints.filter((s: any) => s.status === "ACTIVE").length,
      });
    }

    case "get_status_history": {
      const logs = (p.statusLogs ?? []).map((l: any) => ({
        date:      new Date(l.createdAt).toLocaleDateString("en-GB"),
        status:    l.status,
        changedBy: l.changedBy ?? "Unknown",
        note:      l.note ?? "No reason provided",
      }));
      return JSON.stringify({
        currentStatus: p.status,
        history:       logs,
        totalChanges:  logs.length,
      });
    }

    case "get_risk_assessment": {
      const risks = p.risks.map((r: any) => ({
        title:       r.title,
        probability: r.probability,
        impact:      r.impact,
        score:       r.probability * r.impact,
        status:      r.status,
        mitigation:  r.mitigation ?? "None",
        severity:    r.probability * r.impact >= 15 ? "CRITICAL" : r.probability * r.impact >= 8 ? "HIGH" : r.probability * r.impact >= 4 ? "MEDIUM" : "LOW",
      }));
      return JSON.stringify({
        totalRisks:     risks.length,
        openRisks:      risks.filter((r: any) => r.status === "OPEN").length,
        criticalRisks:  risks.filter((r: any) => r.severity === "CRITICAL").length,
        highRisks:      risks.filter((r: any) => r.severity === "HIGH").length,
        risks,
      });
    }

    case "get_team_performance": {
      const team = p.assignments.map((a: any) => ({
        name:           a.resource.name,
        role:           a.resource.role,
        costPerHour:    a.resource.costPerHour,
        estimatedHours: a.estimatedHours,
        actualHours:    a.actualHours,
        utilization:    a.resource.capacityHours > 0 ? Math.round((a.actualHours / a.resource.capacityHours) * 100) : 0,
        cost:           Math.round(a.actualHours * a.resource.costPerHour),
        status:         a.actualHours > a.resource.capacityHours ? "OVERLOADED" : a.actualHours > a.resource.capacityHours * 0.8 ? "HIGH" : "NORMAL",
      }));
      const totalCap   = p.assignments.reduce((s: number, a: any) => s + a.resource.capacityHours, 0);
      const totalHours = p.assignments.reduce((s: number, a: any) => s + a.actualHours, 0);
      return JSON.stringify({
        teamSize:         team.length,
        totalCapacity:    totalCap,
        totalActualHours: totalHours,
        overallUtilization: totalCap > 0 ? Math.round((totalHours / totalCap) * 100) : 0,
        team,
      });
    }

    case "get_blocked_features": {
      const allF    = p.sprints.flatMap((s: any) => s.features.map((f: any) => ({ ...f, sprintName: s.name })));
      const blocked = allF.filter((f: any) => f.status === "BLOCKED");
      return JSON.stringify({
        totalBlocked: blocked.length,
        blocked: blocked.map((f: any) => ({
          title:    f.title,
          sprint:   f.sprintName,
          priority: f.priority,
          module:   f.module ?? "Unknown",
        })),
      });
    }

    default:
      return JSON.stringify({ error: "Unknown tool" });
  case "get_sprint_velocity": {
      const sprints = p.sprints.map((s: any) => {
        const features = s.features ?? [];
        const done     = features.filter((f: any) => f.status === "DONE").length;
        const total    = features.length;
        const duration = s.startDate && s.endDate
          ? Math.max(1, Math.round((new Date(s.endDate).getTime() - new Date(s.startDate).getTime()) / 86400000))
          : null;
        return {
          sprint:       s.num,
          name:         s.name,
          status:       s.status,
          featuresTotal: total,
          featuresDone:  done,
          completionPct: total > 0 ? Math.round((done / total) * 100) : 0,
          durationDays:  duration,
          velocityPerDay: duration && done > 0 ? +(done / duration).toFixed(2) : null,
        };
      });
      type SprintSummary = typeof sprints[number];
      const doneSprints = sprints.filter((s: SprintSummary) => s.status === "DONE");
      const avgVelocity = doneSprints.length > 0
        ? +(doneSprints.reduce((s: number, sp: SprintSummary) => s + (sp.velocityPerDay ?? 0), 0) / doneSprints.length).toFixed(2)
        : null;
      const trend = doneSprints.length >= 2
        ? (doneSprints[doneSprints.length - 1].velocityPerDay ?? 0) > (doneSprints[0].velocityPerDay ?? 0)
          ? "accelerating" : "decelerating"
        : "insufficient_data";
      return JSON.stringify({ sprints, avgVelocity, trend, doneSprints: doneSprints.length, totalSprints: sprints.length });
    }

    case "get_snapshot_comparison": {
      const snapshots = p.snapshots ?? [];
      if (snapshots.length === 0) return JSON.stringify({ available: false, message: "No snapshots available for comparison" });
      const latest    = snapshots[snapshots.length - 1];
      const baseData  = latest.data as any;
      const allF      = p.sprints.flatMap((s: any) => s.features);
      const baseSprints   = baseData.sprints ?? [];
      const baseFeatures  = baseSprints.flatMap((s: any) => s.features ?? []);
      const changes = {
        scopeChange:    allF.length - baseFeatures.length,
        deadlineChange: baseData.endDate !== p.endDate.toISOString()
          ? Math.round((new Date(p.endDate).getTime() - new Date(baseData.endDate).getTime()) / 86400000)
          : 0,
        budgetChange:   p.budgetTotal - (baseData.budgetTotal ?? 0),
        snapshotDate:   latest.createdAt,
        snapshotVersion: latest.version,
      };
      return JSON.stringify({ available: true, changes, baseline: { features: baseFeatures.length, endDate: baseData.endDate, budget: baseData.budgetTotal } });
    }

    case "get_dependency_graph": {
      const allF = p.sprints.flatMap((s: any) => s.features.map((f: any) => ({ ...f, sprintName: s.name })));
      const deps = allF.filter((f: any) => (f.dependsOn ?? []).length > 0).map((f: any) => ({
        feature:      f.title,
        sprint:       f.sprintName,
        status:       f.status,
        dependsOn:    (f.dependsOn ?? []).map((d: any) => {
          const blocker = allF.find((ff: any) => ff.id === d.dependsOnId);
          return { title: blocker?.title ?? d.dependsOnId, status: blocker?.status ?? "UNKNOWN", blocking: blocker?.status !== "DONE" };
        }),
        isBlocked:    (f.dependsOn ?? []).some((d: any) => {
          const blocker = allF.find((ff: any) => ff.id === d.dependsOnId);
          return blocker && blocker.status !== "DONE";
        }),
      }));
      type DepEntry = typeof deps[number];
      const criticalPath = deps.filter((d: DepEntry) => d.isBlocked && d.status !== "DONE");
      return JSON.stringify({ totalWithDeps: deps.length, blocked: criticalPath.length, dependencies: deps, criticalPath });
    }    
  }
}

// ── Main Agent ────────────────────────────────────────────────────────────
export async function runGuardianAgent(projectData: any): Promise<{
  healthScore:        number;
  riskLevel:          string;
  onTrackProbability: number;
  estimatedDelay:     number;
  alerts:             any[];
  recommendations:    string[];
  summary:            string;
  agentThinking?:     string[];
}> {
  const systemPrompt = `You are an expert AI PMO Guardian — a senior project manager with 20+ years of experience.

Your role is to analyze projects using PMI/PMBOK standards and provide:
1. Clear, actionable alerts based on real data
2. Specific recommendations with concrete next steps
3. Context-aware advice based on project lifecycle status

IMPORTANT RULES:
- Always call get_project_metrics FIRST to get the health score — never invent numbers
- Consider the project status (PAUSED, ACTIVE, etc.) when giving advice
- If PAUSED: focus on what needs to happen to resume, don't alarm about inactivity
- If ACTIVE: standard PMO governance analysis
- If COMPLETED: focus on lessons learned
- Be specific with numbers — reference actual SPI, CPI, days, costs
- Prioritize critical issues first
- Never generate a healthScore — use the one from get_project_metrics

After analyzing, respond with a JSON object:
{
  "summary": "1-2 sentence executive summary",
  "riskLevel": "low|medium|high|critical",
  "estimatedDelay": <days as integer>,
  "alerts": [
    {
      "id": "unique-id",
      "level": "critical|warning|info|success",
      "category": "schedule|budget|resources|scope|risk|progress|governance",
      "title": "Short title",
      "detail": "Specific detail with numbers",
      "action": "Concrete recommended action"
    }
  ],
  "recommendations": ["specific recommendation 1", "recommendation 2", "recommendation 3"]
}`;

  const userMessage = `Analyze this project and provide PMO governance insights.
Project: ${projectData.name}
Status: ${projectData.status}
Description: ${projectData.description ?? "Not provided"}

Use the available tools to gather data, then provide your analysis as JSON.`;

  const messages: Anthropic.MessageParam[] = [
    { role: "user", content: userMessage }
  ];

  const agentThinking: string[] = [];
  let finalResponse: any = null;

  // Agentic loop — max 5 iterations
  for (let i = 0; i < 5; i++) {
    const response = await anthropic.messages.create({
      model:      process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-5",
      max_tokens: 2000,
      system:     systemPrompt,
      tools:      GUARDIAN_TOOLS,
      messages,
    });

    // Add assistant response to history
    messages.push({ role: "assistant", content: response.content });

    if (response.stop_reason === "end_turn") {
      // Extract final JSON from text response
      const textBlock = response.content.find(b => b.type === "text");
      if (textBlock && textBlock.type === "text") {
        try {
          const raw = textBlock.text.replace(/```json|```/gi, "").trim();
          finalResponse = JSON.parse(raw);
        } catch {
          finalResponse = null;
        }
      }
      break;
    }

    if (response.stop_reason === "tool_use") {
      // Execute all tool calls
      const toolResults: Anthropic.MessageParam = {
        role:    "user",
        content: [],
      };

      for (const block of response.content) {
        if (block.type === "tool_use") {
          agentThinking.push(`Using tool: ${block.name}`);
          const result = await executeTool(block.name, block.input, projectData);
          (toolResults.content as any[]).push({
            type:        "tool_result",
            tool_use_id: block.id,
            content:     result,
          });
        }
      }

      messages.push(toolResults);
    }
  }

  // Get health score from tools (not from AI)
  const allF        = projectData.sprints.flatMap((s: any) => s.features);
  const done        = allF.filter((f: any) => f.status === "DONE").length;
  const blocked     = allF.filter((f: any) => f.status === "BLOCKED").length;
  const inProgress  = allF.filter((f: any) => f.status === "IN_PROGRESS").length;
  const costActual  = projectData.assignments.reduce((s: number, a: any) => s + a.actualHours * a.resource.costPerHour, 0);
  const costEst     = projectData.assignments.reduce((s: number, a: any) => s + a.estimatedHours * a.resource.costPerHour, 0);
  const openRisks   = projectData.risks.filter((r: any) => r.status === "OPEN");
  const highRisks   = projectData.risks.filter((r: any) => r.status === "OPEN" && r.probability * r.impact >= 9);
  const maxRisk     = openRisks.length > 0 ? Math.max(...openRisks.map((r: any) => r.probability * r.impact)) : 0;

  const h = calculateHealth({
    startDate: projectData.startDate, endDate: projectData.endDate,
    totalFeatures: allF.length, doneFeatures: done,
    blockedFeatures: blocked, inProgressFeatures: inProgress,
    totalSprints: projectData.sprints.length,
    doneSprints:  projectData.sprints.filter((s: any) => s.status === "DONE").length,
    activeSprints: projectData.sprints.filter((s: any) => s.status === "ACTIVE").length,
    budgetTotal: projectData.budgetTotal, costActual, costEstimated: costEst,
    totalCapacityHours: projectData.assignments.reduce((s: number, a: any) => s + a.resource.capacityHours, 0),
    totalActualHours:   projectData.assignments.reduce((s: number, a: any) => s + a.actualHours, 0),
    openRisks: openRisks.length, highRisks: highRisks.length, maxRiskScore: maxRisk,
  });

  return {
    healthScore:        h.healthScore,
    riskLevel:          finalResponse?.riskLevel          ?? (h.healthScore < 40 ? "critical" : h.healthScore < 60 ? "high" : h.healthScore < 80 ? "medium" : "low"),
    onTrackProbability: h.onTrackProbability,
    estimatedDelay:     finalResponse?.estimatedDelay     ?? h.delayDays,
    alerts:             finalResponse?.alerts             ?? h.alerts.map(a => ({ id: a.id, level: a.level, category: a.category, title: a.title, detail: a.detail, action: a.action })),
    recommendations:    finalResponse?.recommendations    ?? ["Review project status", "Check resource allocation", "Update risk register"],
    summary:            finalResponse?.summary            ?? `Project health score: ${h.healthScore}/100`,
    agentThinking,
  };
}