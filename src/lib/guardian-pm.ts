import { db } from "@/lib/prisma";
import { anthropic } from "@/lib/anthropic";
import { calculateHealth } from "@/lib/health";

interface GuardianAlert {
  level: "CRITICAL" | "WARNING" | "INFO";
  title: string;
  detail: string;
  action: string;
}

interface GuardianResult {
  healthStatus: string;
  healthScore:  number;
  alerts:       GuardianAlert[];
  recommendation: string;
}

// ── Full AI-powered Guardian analysis for one project ─────────────────────────

export async function runFullGuardianAnalysis(
  projectId: string,
  orgId: string
): Promise<void> {
  const project = await db.project.findFirst({
    where: { id: projectId },
    include: {
      sprints:     { include: { features: true } },
      risks:       { where: { status: "OPEN" } },
      phases:      true,
      assignments: { include: { resource: true } },
    },
  });
  if (!project) return;

  // ── EVM metrics via health engine ──
  const allF          = project.sprints.flatMap(s => s.features);
  const done          = allF.filter(f => f.status === "DONE").length;
  const blocked       = allF.filter(f => f.status === "BLOCKED").length;
  const inProgress    = allF.filter(f => f.status === "IN_PROGRESS").length;
  const costActual    = project.assignments.reduce((s, a) => s + a.actualHours    * a.resource.costPerHour, 0);
  const costEstimated = project.assignments.reduce((s, a) => s + a.estimatedHours * a.resource.costPerHour, 0);
  const openRisks     = project.risks.length;
  const highRisks     = project.risks.filter(r => r.probability * r.impact >= 9).length;
  const maxRiskScore  = project.risks.reduce((m, r) => Math.max(m, r.probability * r.impact), 0);

  const h = calculateHealth({
    startDate: project.startDate, endDate: project.endDate,
    totalFeatures: allF.length, doneFeatures: done,
    blockedFeatures: blocked, inProgressFeatures: inProgress,
    totalSprints:  project.sprints.length,
    doneSprints:   project.sprints.filter(s => s.status === "DONE").length,
    activeSprints: project.sprints.filter(s => s.status === "ACTIVE").length,
    budgetTotal: project.budgetTotal, costActual, costEstimated,
    totalCapacityHours: project.assignments.reduce((s, a) => s + a.resource.capacityHours, 0),
    totalActualHours:   project.assignments.reduce((s, a) => s + a.actualHours, 0),
    openRisks, highRisks, maxRiskScore,
  });

  const daysLeft      = Math.ceil((new Date(project.endDate).getTime() - Date.now()) / 86400000);
  const criticalRisks = project.risks.filter(r => r.probability * r.impact >= 15).length;

  // ── Ask Claude for actionable analysis ──
  let result: GuardianResult;
  try {
    const msg = await anthropic.messages.create({
      model:      process.env.ANTHROPIC_MODEL ?? "claude-haiku-4-5-20251001",
      max_tokens: 800,
      messages: [{
        role:    "user",
        content: `You are Guardian AI, an autonomous project manager. Analyze this project and identify the top 3 priority actions needed.

Project: ${project.name}
SPI: ${h.spi.toFixed(2)} (schedule performance — <0.8 is critical)
CPI: ${h.cpi > 0 ? h.cpi.toFixed(2) : "N/A"} (cost performance — <0.8 is critical)
Progress: ${h.progressNominal}%
Planned progress: ${h.plannedPct}%
Blocked features: ${blocked}
Open risks: ${openRisks}
Critical risks (score>=15): ${criticalRisks}
Days until deadline: ${daysLeft}
Budget: ${project.budgetTotal > 0 ? `$${Math.round(project.budgetTotal).toLocaleString()} BAC` : "not set"}

Respond ONLY with valid JSON — no markdown:
{
  "healthStatus": "ON_TRACK|AT_RISK|OFF_TRACK",
  "healthScore": 0,
  "alerts": [
    {
      "level": "CRITICAL|WARNING|INFO",
      "title": "short title under 60 chars",
      "detail": "specific actionable description under 120 chars",
      "action": "specific button label under 30 chars"
    }
  ],
  "recommendation": "one sentence PM recommendation"
}`,
      }],
    });

    const text = msg.content[0].type === "text" ? msg.content[0].text : "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    result = jsonMatch ? JSON.parse(jsonMatch[0]) : buildFallbackResult(h.status, h.healthScore, blocked, criticalRisks, daysLeft);
  } catch {
    result = buildFallbackResult(h.status, h.healthScore, blocked, criticalRisks, daysLeft);
  }

  // ── Update project health score ──
  await db.project.update({
    where: { id: projectId },
    data:  { healthScore: result.healthScore ?? h.healthScore },
  });

  // ── Create deduped alerts for CRITICAL/WARNING ──
  for (const alert of (result.alerts ?? [])) {
    if (alert.level === "INFO") continue;
    const existing = await db.alert.findFirst({
      where: {
        projectId,
        title:     alert.title,
        read:      false,
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
    });
    if (!existing) {
      await db.alert.create({
        data: {
          organisationId:     orgId,
          projectId,
          type:               "GUARDIAN",
          level:              alert.level.toLowerCase(),
          title:              alert.title,
          detail:             alert.detail,
          action:             alert.action,
          read:               false,
          emailSent:          false,
          resolved:           false,
          requiresValidation: alert.level === "CRITICAL",
        },
      });
    }
  }

  // ── Upsert Guardian report ──
  const riskFlag = (result.alerts ?? []).some(a => a.level === "CRITICAL");
  await db.guardianReport.upsert({
    where:  { projectId },
    create: {
      projectId,
      healthScore:     result.healthScore ?? h.healthScore,
      healthStatus:    result.healthStatus ?? h.status,
      insight:         result.recommendation ?? "",
      recommendation:  result.alerts?.[0]?.detail ?? "",
      riskFlag,
      confidence:      0.85,
      alertCount:      result.alerts?.length ?? 0,
      generatedAt:     new Date(),
    },
    update: {
      healthScore:    result.healthScore ?? h.healthScore,
      healthStatus:   result.healthStatus ?? h.status,
      insight:        result.recommendation ?? "",
      recommendation: result.alerts?.[0]?.detail ?? "",
      riskFlag,
      alertCount:     result.alerts?.length ?? 0,
      generatedAt:    new Date(),
      updatedAt:      new Date(),
    },
  });
}

function buildFallbackResult(
  status: string,
  healthScore: number,
  blocked: number,
  criticalRisks: number,
  daysLeft: number
): GuardianResult {
  const alerts: GuardianAlert[] = [];

  if (status === "OFF_TRACK" || daysLeft < 0) {
    alerts.push({ level: "CRITICAL", title: "Project needs immediate attention", detail: "Schedule and/or cost deviation requires escalation", action: "Review project" });
  } else if (status === "AT_RISK" || blocked >= 3) {
    alerts.push({ level: "WARNING", title: "Project at risk", detail: `${blocked} features blocked · ${criticalRisks} critical risks`, action: "Resolve blockers" });
  } else {
    alerts.push({ level: "INFO", title: "Project health is good", detail: `Health score ${healthScore}/100`, action: "Continue monitoring" });
  }

  return {
    healthStatus:   status,
    healthScore,
    alerts,
    recommendation: status === "ON_TRACK" ? "Continue current pace and monitor weekly." : "Address blockers and risks in next sprint planning.",
  };
}
