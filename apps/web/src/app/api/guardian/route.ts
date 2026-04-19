import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";
import { db } from "@/lib/prisma";
import { calculateHealth } from "@/lib/health";

// Portfolio-level Guardian — returns aggregated alerts across all active projects
export async function GET(_req: Request) {
  const ctx = await getAuthContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const projects = await db.project.findMany({
    where: { organisationId: ctx.org.id, status: { notIn: ["CLOSED", "ARCHIVED"] } },
    include: {
      sprints: { include: { features: true } },
      assignments: { include: { resource: true } },
      risks: true,
    },
  });

  const criticalAlerts: { id: string; level: string; title: string; detail: string; projectId: string }[] = [];
  const warningAlerts:  { id: string; level: string; title: string; detail: string; projectId: string }[] = [];

  projects.forEach(p => {
    const allF        = p.sprints.flatMap(s => s.features);
    const done        = allF.filter(f => f.status === "DONE").length;
    const blocked     = allF.filter(f => f.status === "BLOCKED").length;
    const inProgress  = allF.filter(f => f.status === "IN_PROGRESS").length;
    const costActual  = p.assignments.reduce((s, a) => s + a.actualHours * a.resource.costPerHour, 0);
    const costEstimated = p.assignments.reduce((s, a) => s + a.estimatedHours * a.resource.costPerHour, 0);
    const pct         = allF.length ? Math.round((done / allF.length) * 100) : 0;
    const daysLeft    = Math.ceil((new Date(p.endDate).getTime() - Date.now()) / 86400000);
    const costForecast = pct > 0 ? (costActual / pct) * 100 : costEstimated;
    const openRisks   = p.risks.filter(r => r.status === "OPEN").length;
    const highRisks   = p.risks.filter(r => r.status === "OPEN" && r.probability * r.impact >= 9).length;

    if (highRisks > 0)
      criticalAlerts.push({ id: `risk-${p.id}`, level: "critical", title: `${highRisks} critical risk(s) in "${p.name}"`, detail: "High probability × impact — needs mitigation", projectId: p.id });
    if (daysLeft < 0 && p.status !== "COMPLETED")
      criticalAlerts.push({ id: `overdue-${p.id}`, level: "critical", title: `"${p.name}" is overdue`, detail: `${Math.abs(daysLeft)} days past deadline at ${pct}% completion`, projectId: p.id });
    if (p.budgetTotal > 0 && costForecast > p.budgetTotal)
      criticalAlerts.push({ id: `budget-${p.id}`, level: "critical", title: `"${p.name}" budget overrun risk`, detail: `Forecast exceeds budget by $${Math.round(costForecast - p.budgetTotal).toLocaleString()}`, projectId: p.id });

    if (blocked >= 3)
      warningAlerts.push({ id: `blocked-${p.id}`, level: "warning", title: `${blocked} features blocked in "${p.name}"`, detail: "Sprint velocity at risk", projectId: p.id });
    if (daysLeft >= 0 && daysLeft <= 7 && pct < 80)
      warningAlerts.push({ id: `deadline-${p.id}`, level: "warning", title: `"${p.name}" deadline in ${daysLeft}d`, detail: `${pct}% complete — at risk of delay`, projectId: p.id });
  });

  return NextResponse.json({
    totalProjects: projects.length,
    criticalAlerts,
    warningAlerts,
    generatedAt: new Date().toISOString(),
  });
}
