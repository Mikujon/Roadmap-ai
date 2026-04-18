export const dynamic = "force-dynamic";
import { db } from "@/lib/prisma";
import { getAuthContext } from "@/lib/auth";
import { redirect } from "next/navigation";
import { calculateHealth } from "@/lib/health";
import DashboardClient from "./DashboardClient";

const getProjects = (orgId: string) =>
  db.project.findMany({
    where: { organisationId: orgId, status: { notIn: ["CLOSED", "ARCHIVED"] } },
    include: {
      sprints:     { include: { features: true } },
      phases:      { orderBy: { order: "asc" } },
      assignments: { include: { resource: true } },
      risks: true,
    },
    orderBy: { updatedAt: "desc" },
  });

export default async function DashboardPage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/sign-in");

  const projectCount = await db.project.count({ where: { organisationId: ctx.org.id } });
  if (projectCount === 0) redirect("/onboarding");

  const [projects, alerts] = await Promise.all([
    getProjects(ctx.org.id),
    db.alert.findMany({
      where:   { organisationId: ctx.org.id, read: false },
      include: { project: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);

  // Compute metrics per project
  const projectStats = projects.map(p => {
    const allF        = p.sprints.flatMap(s => s.features);
    const done        = allF.filter(f => f.status === "DONE").length;
    const blocked     = allF.filter(f => f.status === "BLOCKED").length;
    const inProgress  = allF.filter(f => f.status === "IN_PROGRESS").length;
    const pct         = allF.length ? Math.round((done / allF.length) * 100) : 0;
    const activeSprints = p.sprints.filter(s => s.status === "ACTIVE").length;
    const costActual    = p.assignments.reduce((s, a) => s + a.actualHours    * a.resource.costPerHour, 0);
    const costEstimated = p.assignments.reduce((s, a) => s + a.estimatedHours * a.resource.costPerHour, 0);
    const openRisks     = p.risks.filter(r => r.status === "OPEN").length;
    const highRisks     = p.risks.filter(r => r.status === "OPEN" && r.probability * r.impact >= 9).length;
    const maxRiskScore  = p.risks.filter(r => r.status === "OPEN").reduce((m, r) => Math.max(m, r.probability * r.impact), 0);

    const h = calculateHealth({
      startDate: p.startDate, endDate: p.endDate,
      totalFeatures: allF.length, doneFeatures: done,
      blockedFeatures: blocked, inProgressFeatures: inProgress,
      totalSprints: p.sprints.length,
      doneSprints: p.sprints.filter(s => s.status === "DONE").length,
      activeSprints,
      budgetTotal: p.budgetTotal, costActual, costEstimated,
      totalCapacityHours: p.assignments.reduce((s, a) => s + a.resource.capacityHours, 0),
      totalActualHours:   p.assignments.reduce((s, a) => s + a.actualHours, 0),
      openRisks, highRisks, maxRiskScore,
    });

    const costForecast   = pct > 0 ? (costActual / pct) * 100 : costEstimated;
    const budgetVariance = p.budgetTotal > 0 ? costForecast - p.budgetTotal : 0;
    const daysLeft       = Math.ceil((new Date(p.endDate).getTime() - Date.now()) / 86400000);
    const riskScore      =
      (h.status === "AT_RISK" || h.status === "OFF_TRACK" ? 100 : 0) +
      highRisks * 20 + openRisks * 5 +
      (budgetVariance > 0 ? 15 : 0) +
      (daysLeft < 0 ? 30 : daysLeft <= 7 && pct < 80 ? 10 : 0);

    // Sprint velocity for current active sprint
    const activeSprint = p.sprints.find(s => s.status === "ACTIVE");
    const sprintDone    = activeSprint ? activeSprint.features.filter(f => f.status === "DONE").length : 0;
    const sprintTotal   = activeSprint ? activeSprint.features.length : 0;

    // Upcoming sprint deadlines
    const upcomingSprints = p.sprints
      .filter(s => s.endDate && s.status !== "DONE")
      .map(s => ({ sprintName: s.name, projectName: p.name, projectId: p.id, endDate: s.endDate!.toISOString().slice(0,10) }))
      .sort((a, b) => a.endDate.localeCompare(b.endDate))
      .slice(0, 2);

    return {
      id: p.id, name: p.name, status: p.status,
      allF, done, blocked, inProgress, pct, activeSprints,
      costActual, costEstimated, costForecast, budgetVariance,
      openRisks, highRisks, daysLeft, riskScore,
      health:      h.status,
      healthScore: h.healthScore,
      spi:         h.spi,
      cpi:         h.cpi,
      sprintDone, sprintTotal,
      sprintName:  activeSprint?.name ?? null,
      upcomingSprints,
    };
  });

  const sorted = [...projectStats].sort((a, b) => b.riskScore - a.riskScore);

  // KPI totals
  const totalActive    = projectStats.length;
  const atRiskCount    = projectStats.filter(p => p.health === "AT_RISK" || p.health === "OFF_TRACK").length;
  const onTrackCount   = projectStats.filter(p => p.health === "ON_TRACK").length;
  const budgetExposure = projectStats.reduce((s, p) => s + Math.max(0, p.budgetVariance), 0);
  const validationPending = alerts.filter(a => a.requiresValidation && !a.resolved).length;

  return (
    <DashboardClient
      orgName={ctx.org.name}
      userName={ctx.user.name ?? ""}
      preferredView={(ctx.user.preferredView ?? "PMO") as "PMO" | "CEO" | "STK" | "DEV"}
      projects={sorted}
      alerts={alerts as any}
      kpis={{ totalActive, atRiskCount, onTrackCount, budgetExposure, validationPending }}
    />
  );
}
