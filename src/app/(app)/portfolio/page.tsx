export const dynamic = "force-dynamic";
import { db } from "@/lib/prisma";
import { getAuthContext } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getProjectMetrics } from "@/lib/metrics";
import PortfolioClient from "./PortfolioClient";

export default async function PortfolioPage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/sign-in");

  const projects = await db.project.findMany({
    where: { organisationId: ctx.org.id, status: { notIn: ["CLOSED", "ARCHIVED"] } },
    include: {
      sprints: { include: { features: true } },
      phases: { orderBy: { order: "asc" } },
      assignments: { include: { resource: true } },
      risks: true,
      requestedBy: { select: { name: true, email: true } },
      departments: { include: { department: true } },
      dependsOn: { include: { dependsOn: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  const metrics = projects.map(p => getProjectMetrics(p as any));

  const rows = metrics.map((r, i) => ({
    id:               r.id,
    name:             r.name,
    projectStatus:    projects[i].status as string,
    healthStatus:     r.health.status as "OFF_TRACK" | "AT_RISK" | "ON_TRACK" | "COMPLETED" | "NOT_STARTED",
    healthScore:      r.health.healthScore,
    progressNominal:  r.health.progressNominal,
    budgetTotal:      r.budgetTotal,
    costActual:       r.costActual,
    spi:              r.health.spi,
    cpi:              r.health.cpi,
    teamLead:         r.client,
    endDate:          r.endDate.toISOString(),
    delayDays:        r.health.delayDays,
  }));

  const criticalCount = rows.filter(r => r.healthStatus === "OFF_TRACK").length;
  const atRiskCount   = rows.filter(r => r.healthStatus === "AT_RISK").length;
  const onTrackCount  = rows.filter(r => r.healthStatus === "ON_TRACK" || r.healthStatus === "COMPLETED").length;

  const avgCpi = rows.length
    ? Math.round(rows.reduce((s, r) => s + r.cpi, 0) / rows.length * 100) / 100
    : 1;

  const budgetExposure = rows.reduce((s, r) => {
    const over = r.budgetTotal > 0 ? r.costActual - r.budgetTotal : 0;
    return s + (over > 0 ? over : 0);
  }, 0);

  return (
    <PortfolioClient
      rows={rows}
      criticalCount={criticalCount}
      atRiskCount={atRiskCount}
      onTrackCount={onTrackCount}
      avgCpi={avgCpi}
      budgetExposure={budgetExposure}
      orgName={ctx.org.name}
      totalCount={rows.length}
    />
  );
}
