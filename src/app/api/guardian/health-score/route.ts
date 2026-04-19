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
    const maxRiskScore  = project.risks.filter(r => r.status === "OPEN").reduce((m, r) => Math.max(m, r.probability * r.impact), 0);

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
      openRisks, highRisks, maxRiskScore,
    });

    await db.project.update({
      where: { id: project.id },
      data:  { healthScore: h.healthScore },
    });

    projectsProcessed++;
  }

  return NextResponse.json({ status: "ok", projectsProcessed, alertsCreated: 0 });
}
