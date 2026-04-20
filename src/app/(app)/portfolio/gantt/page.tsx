export const dynamic = "force-dynamic";
import { db } from "@/lib/prisma";
import { getAuthContext } from "@/lib/auth";
import { redirect } from "next/navigation";
import { calculateHealth } from "@/lib/health";
import PortfolioGantt from "@/components/views/PortfolioGantt";
import { Breadcrumb } from "@/components/ui/breadcrumb";

export default async function PortfolioGanttPage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/sign-in");

  const projects = await db.project.findMany({
    where: { organisationId: ctx.org.id, status: { notIn: ["CLOSED", "ARCHIVED"] } },
    select: {
      id: true, name: true, status: true, startDate: true, endDate: true, budgetTotal: true,
      sprints: { select: { status: true, features: { select: { status: true } } } },
      risks: { select: { status: true, probability: true, impact: true } },
      assignments: { select: { estimatedHours: true, actualHours: true, resource: { select: { costPerHour: true, capacityHours: true } } } },
    },
    orderBy: { startDate: "asc" },
  });

  const rows = projects.map(p => {
    const allF      = p.sprints.flatMap(s => s.features);
    const done      = allF.filter(f => f.status === "DONE").length;
    const blocked   = allF.filter(f => f.status === "BLOCKED").length;
    const inProg    = allF.filter(f => f.status === "IN_PROGRESS").length;
    const pct       = allF.length ? Math.round((done / allF.length) * 100) : 0;
    const costActual = p.assignments.reduce((s, a) => s + a.actualHours * a.resource.costPerHour, 0);
    const costEst    = p.assignments.reduce((s, a) => s + a.estimatedHours * a.resource.costPerHour, 0);
    const openRisks  = p.risks.filter(r => r.status === "OPEN").length;
    const highRisks  = p.risks.filter(r => r.status === "OPEN" && r.probability * r.impact >= 9).length;
    const maxRisk    = p.risks.filter(r => r.status === "OPEN").reduce((m, r) => Math.max(m, r.probability * r.impact), 0);

    const h = calculateHealth({
      startDate: p.startDate, endDate: p.endDate,
      totalFeatures: allF.length, doneFeatures: done,
      blockedFeatures: blocked, inProgressFeatures: inProg,
      totalSprints: p.sprints.length,
      doneSprints: p.sprints.filter(s => s.status === "DONE").length,
      activeSprints: p.sprints.filter(s => s.status === "ACTIVE").length,
      budgetTotal: p.budgetTotal, costActual, costEstimated: costEst,
      totalCapacityHours: p.assignments.reduce((s, a) => s + a.resource.capacityHours, 0),
      totalActualHours: p.assignments.reduce((s, a) => s + a.actualHours, 0),
      openRisks, highRisks, maxRiskScore: maxRisk,
    });

    return {
      id:          p.id,
      name:        p.name,
      startDate:   p.startDate.toISOString(),
      endDate:     p.endDate.toISOString(),
      health:      h.status,
      healthScore: h.healthScore,
      progress:    pct,
    };
  });

  return (
    <div style={{ padding: "24px 28px", fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <Breadcrumb items={[{ label: "Portfolio", href: "/portfolio" }, { label: "Gantt" }]} />
      <div style={{ fontSize: 18, fontWeight: 700, color: "#18170F", letterSpacing: "-.4px", marginBottom: 16 }}>
        Portfolio Gantt
      </div>
      <PortfolioGantt projects={rows} />
    </div>
  );
}
