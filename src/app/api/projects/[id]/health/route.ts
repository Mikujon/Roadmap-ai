import { db } from "@/lib/prisma";
import { ok, Errors } from "@/lib/api/response";
import { withAuth } from "@/lib/api/route-handler";

export const GET = withAuth(async (_req, ctx, { id }) => {
  const project = await db.project.findFirst({
    where: { id, organisationId: ctx.org.id },
    include: {
      sprints: { include: { features: true } },
      risks: true,
      assignments: { include: { resource: true } },
    },
  });

  if (!project) return Errors.NOT_FOUND("Project");

  const allFeatures = project.sprints.flatMap(s => s.features);
  const total = allFeatures.length;
  const done  = allFeatures.filter(f => f.status === "DONE").length;

  // Schedule Score
  const now = Date.now();
  const start = new Date(project.startDate).getTime();
  const end   = new Date(project.endDate).getTime();
  const plannedProgress = end > start ? Math.min((now - start) / (end - start), 1) : 0;
  const actualProgress  = total > 0 ? done / total : 0;
  const scheduleScore   = plannedProgress > 0
    ? Math.min(actualProgress / plannedProgress, 1) * 100
    : actualProgress * 100;

  // Cost Score
  const budget = project.budgetTotal;
  let costScore = 100;
  if (budget > 0) {
    const ratio = project.costActual / budget;
    costScore = ratio <= 1 ? 100 : Math.max(0, 100 - (ratio - 1) * 200);
  }

  // Resource Score
  let resourceScore = 100;
  if (project.assignments.length > 0) {
    const utilizations = project.assignments.map(a =>
      a.resource.capacityHours > 0 ? a.actualHours / a.resource.capacityHours : 0
    );
    const avgUtil = utilizations.reduce((a, b) => a + b, 0) / utilizations.length;
    resourceScore = avgUtil <= 0.8 ? 100 : avgUtil <= 1.0 ? 80 : avgUtil <= 1.2 ? 50 : 20;
  }

  // Risk Score
  let riskScore = 100;
  const openRisks = project.risks.filter(r => r.status === "OPEN");
  if (openRisks.length > 0) {
    const avgRisk = openRisks.reduce((a, r) => a + (r.probability * r.impact), 0) / openRisks.length;
    riskScore = Math.max(0, 100 - (avgRisk / 25) * 100);
  }

  // Health Score = 30% Schedule + 30% Cost + 20% Resource + 20% Risk
  const healthScore = Math.round(
    scheduleScore  * 0.30 +
    costScore      * 0.30 +
    resourceScore  * 0.20 +
    riskScore      * 0.20
  );

  // Update health score in DB
  await db.project.update({
    where: { id },
    data: { healthScore },
  });

  // Forecast
  const costForecast = actualProgress > 0
    ? (project.costActual / actualProgress)
    : project.costActual;
  const margin = project.revenueExpected - costForecast;
  const burnRate = plannedProgress > 0
    ? project.costActual / plannedProgress
    : 0;

  // Recommendations
  const recommendations: { type: string; priority: string; message: string }[] = [];

  if (scheduleScore < 80) {
    recommendations.push({
      type: "SCHEDULE",
      priority: "HIGH",
      message: `Project is ${Math.round((1 - actualProgress / Math.max(plannedProgress, 0.01)) * 100)}% behind schedule. Consider adding resources or reducing scope.`,
    });
  }

  if (budget > 0 && project.costActual > budget) {
    recommendations.push({
      type: "BUDGET",
      priority: "CRITICAL",
      message: `Project is over budget by €${(project.costActual - budget).toLocaleString()}. Review scope or request budget increase.`,
    });
  } else if (budget > 0 && costForecast > budget) {
    recommendations.push({
      type: "FORECAST",
      priority: "HIGH",
      message: `Cost forecast €${costForecast.toLocaleString()} exceeds budget €${budget.toLocaleString()}. Early intervention recommended.`,
    });
  }

  const blockedFeatures = allFeatures.filter(f => f.status === "BLOCKED").length;
  if (blockedFeatures > 0) {
    recommendations.push({
      type: "BLOCKED",
      priority: blockedFeatures >= 3 ? "CRITICAL" : "MEDIUM",
      message: `${blockedFeatures} feature${blockedFeatures > 1 ? "s are" : " is"} blocked. Resolve blockers to maintain velocity.`,
    });
  }

  const highRisks = openRisks.filter(r => r.probability * r.impact >= 15);
  if (highRisks.length > 0) {
    recommendations.push({
      type: "RISK",
      priority: "HIGH",
      message: `${highRisks.length} high-severity risk${highRisks.length > 1 ? "s require" : " requires"} immediate mitigation.`,
    });
  }

  if (resourceScore < 50) {
    recommendations.push({
      type: "RESOURCE",
      priority: "HIGH",
      message: "Team is significantly overloaded. Redistribute tasks or extend timeline to prevent burnout.",
    });
  }

  return ok({
    healthScore,
    scores: {
      schedule: Math.round(scheduleScore),
      cost:     Math.round(costScore),
      resource: Math.round(resourceScore),
      risk:     Math.round(riskScore),
    },
    financial: {
      budgetTotal:     project.budgetTotal,
      costActual:      project.costActual,
      revenueExpected: project.revenueExpected,
      costForecast:    Math.round(costForecast),
      margin:          Math.round(margin),
      burnRate:        Math.round(burnRate),
    },
    progress: {
      planned: Math.round(plannedProgress * 100),
      actual:  Math.round(actualProgress * 100),
      done,
      total,
    },
    recommendations,
  });
});
