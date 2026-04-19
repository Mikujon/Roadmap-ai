import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";
import { db } from "@/lib/prisma";
import { calculateHealth } from "@/lib/health";

export async function POST() {
  const ctx = await getAuthContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const projects = await db.project.findMany({
    where: { organisationId: ctx.org.id, status: { notIn: ["CLOSED", "ARCHIVED"] } },
    include: {
      sprints:     { include: { features: true } },
      assignments: { include: { resource: true } },
      risks: true,
    },
  });

  let projectsProcessed = 0;

  for (const project of projects) {
    const allF          = project.sprints.flatMap(s => s.features);
    const done          = allF.filter(f => f.status === "DONE").length;
    const blocked       = allF.filter(f => f.status === "BLOCKED").length;
    const inProgress    = allF.filter(f => f.status === "IN_PROGRESS").length;
    const costActual    = project.assignments.reduce((s, a) => s + a.actualHours * a.resource.costPerHour, 0);
    const costEstimated = project.assignments.reduce((s, a) => s + a.estimatedHours * a.resource.costPerHour, 0);
    const openRisks     = project.risks.filter(r => r.status === "OPEN").length;
    const highRisks     = project.risks.filter(r => r.status === "OPEN" && r.probability * r.impact >= 9).length;
    const pct           = allF.length ? Math.round((done / allF.length) * 100) : 0;
    const daysLeft      = Math.ceil((new Date(project.endDate).getTime() - Date.now()) / 86400000);

    const h = calculateHealth({
      startDate: project.startDate, endDate: project.endDate,
      totalFeatures: allF.length, doneFeatures: done,
      blockedFeatures: blocked, inProgressFeatures: inProgress,
      totalSprints: project.sprints.length,
      doneSprints: project.sprints.filter(s => s.status === "DONE").length,
      activeSprints: project.sprints.filter(s => s.status === "ACTIVE").length,
      budgetTotal: project.budgetTotal, costActual, costEstimated,
      totalCapacityHours: project.assignments.reduce((s, a) => s + a.resource.capacityHours, 0),
      totalActualHours:   project.assignments.reduce((s, a) => s + a.actualHours, 0),
      openRisks, highRisks, maxRiskScore: project.risks.filter(r => r.status === "OPEN").reduce((m, r) => Math.max(m, r.probability * r.impact), 0),
    });

    const insight = h.status === "ON_TRACK"
      ? `Project is on track at ${pct}% completion with ${daysLeft}d remaining.`
      : h.status === "AT_RISK"
      ? `Project at risk — ${blocked} features blocked, ${openRisks} open risks, ${daysLeft}d left.`
      : `Project off track — immediate attention required. ${pct}% complete, ${daysLeft}d left.`;

    await db.guardianReport.upsert({
      where:  { projectId: project.id },
      create: {
        projectId:      project.id,
        healthScore:    h.healthScore,
        healthStatus:   h.status,
        insight,
        recommendation: `Focus on resolving ${blocked} blocked features and ${highRisks} high-severity risks.`,
        riskFlag:       h.status !== "ON_TRACK",
        confidence:     0.85,
        alertCount:     highRisks + (blocked >= 3 ? 1 : 0),
      },
      update: {
        healthScore:    h.healthScore,
        healthStatus:   h.status,
        insight,
        riskFlag:       h.status !== "ON_TRACK",
        alertCount:     highRisks + (blocked >= 3 ? 1 : 0),
        generatedAt:    new Date(),
      },
    });

    projectsProcessed++;
  }

  return NextResponse.json({ status: "ok", projectsProcessed, alertsCreated: 0 });
}
