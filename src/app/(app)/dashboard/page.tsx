export const dynamic = "force-dynamic";
import { db } from "@/lib/prisma";
import { getAuthContext } from "@/lib/auth";
import { redirect } from "next/navigation";
import { calculateHealth } from "@/lib/health";
import DashboardClient from "./DashboardClient";
import CEODashboard from "./CEODashboard";
import StakeholderDashboard from "./StakeholderDashboard";
import DevDashboard from "./DevDashboard";

// Shared project query shape for PMO / CEO / STK
const getProjects = (orgId: string, requestedById?: string) =>
  db.project.findMany({
    where: {
      organisationId: orgId,
      status: { notIn: ["CLOSED", "ARCHIVED"] },
      ...(requestedById ? { requestedById } : {}),
    },
    include: {
      sprints:     { include: { features: true } },
      phases:      { orderBy: { order: "asc" } },
      assignments: { include: { resource: true } },
      risks: true,
    },
    orderBy: { updatedAt: "desc" },
  });

function computeProjectStats(projects: Awaited<ReturnType<typeof getProjects>>) {
  return projects.map(p => {
    const allF        = p.sprints.flatMap(s => s.features);
    const done        = allF.filter(f => f.status === "DONE").length;
    const blocked     = allF.filter(f => f.status === "BLOCKED").length;
    const inProgress  = allF.filter(f => f.status === "IN_PROGRESS").length;
    const pct         = allF.length ? Math.round((done / allF.length) * 100) : 0;
    const activeSprints  = p.sprints.filter(s => s.status === "ACTIVE").length;
    const costActual     = p.assignments.reduce((s, a) => s + a.actualHours    * a.resource.costPerHour, 0);
    const costEstimated  = p.assignments.reduce((s, a) => s + a.estimatedHours * a.resource.costPerHour, 0);
    const openRisks      = p.risks.filter(r => r.status === "OPEN").length;
    const highRisks      = p.risks.filter(r => r.status === "OPEN" && r.probability * r.impact >= 9).length;
    const maxRiskScore   = p.risks.filter(r => r.status === "OPEN").reduce((m, r) => Math.max(m, r.probability * r.impact), 0);

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

    const activeSprint   = p.sprints.find(s => s.status === "ACTIVE");
    const sprintDone     = activeSprint ? activeSprint.features.filter(f => f.status === "DONE").length : 0;
    const sprintTotal    = activeSprint ? activeSprint.features.length : 0;

    const upcomingSprints = p.sprints
      .filter(s => s.endDate && s.status !== "DONE")
      .map(s => ({ sprintName: s.name, projectName: p.name, projectId: p.id, endDate: s.endDate!.toISOString().slice(0, 10) }))
      .sort((a, b) => a.endDate.localeCompare(b.endDate))
      .slice(0, 2);

    return {
      id: p.id, name: p.name, status: p.status,
      allF, done, blocked, inProgress, pct, activeSprints,
      costActual, costEstimated, costForecast, budgetVariance,
      budgetTotal: p.budgetTotal,
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
}

export default async function DashboardPage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/sign-in");

  const projectCount = await db.project.count({ where: { organisationId: ctx.org.id } });
  if (projectCount === 0) redirect("/onboarding");

  const view = (ctx.user.preferredView ?? "PMO") as "PMO" | "CEO" | "STK" | "DEV";

  // ── DEV view ─────────────────────────────────────────────────────────────
  if (view === "DEV") {
    const features = await db.feature.findMany({
      where: {
        status: { notIn: ["DONE"] },
        sprint: {
          status: "ACTIVE",
          project: { organisationId: ctx.org.id },
        },
      },
      include: {
        sprint: {
          select: {
            id: true, name: true,
            endDate: true,
            project: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: [{ priority: "asc" }, { order: "asc" }],
      take: 60,
    });

    // Sprint progress from first active sprint
    const activeSprint = await db.sprint.findFirst({
      where: { status: "ACTIVE", project: { organisationId: ctx.org.id } },
      include: { features: { select: { status: true } } },
    });
    const sprintDone  = activeSprint ? activeSprint.features.filter(f => f.status === "DONE").length : 0;
    const sprintTotal = activeSprint ? activeSprint.features.length : 0;

    return (
      <DevDashboard
        userName={ctx.user.name ?? ""}
        orgName={ctx.org.name}
        features={features as any}
        sprintDone={sprintDone}
        sprintTotal={sprintTotal}
        sprintName={activeSprint?.name ?? null}
      />
    );
  }

  // ── STK view ─────────────────────────────────────────────────────────────
  if (view === "STK") {
    const stkProjects = await getProjects(ctx.org.id, ctx.user.id);
    const projectStats = computeProjectStats(stkProjects).sort((a, b) => b.riskScore - a.riskScore);

    return (
      <StakeholderDashboard
        userName={ctx.user.name ?? ""}
        orgName={ctx.org.name}
        projects={projectStats.map(p => ({
          id:             p.id,
          name:           p.name,
          status:         p.status,
          health:         p.health,
          healthScore:    p.healthScore,
          pct:            p.pct,
          daysLeft:       p.daysLeft,
          budgetTotal:    p.budgetTotal,
          costActual:     p.costActual,
          costEstimated:  p.costEstimated,
          openRisks:      p.openRisks,
          sprintName:     p.sprintName,
        }))}
      />
    );
  }

  // ── PMO / CEO views — full data ───────────────────────────────────────────
  const [projects, alerts, lastReport] = await Promise.all([
    getProjects(ctx.org.id),
    db.alert.findMany({
      where:   { organisationId: ctx.org.id, read: false },
      include: { project: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    db.guardianReport.findFirst({
      where:   { project: { organisationId: ctx.org.id } },
      orderBy: { updatedAt: "desc" },
      select:  { updatedAt: true },
    }),
  ]);

  const projectStats = computeProjectStats(projects).sort((a, b) => b.riskScore - a.riskScore);
  const lastAnalyzed = lastReport?.updatedAt.toISOString() ?? null;

  // ── CEO view ──────────────────────────────────────────────────────────────
  if (view === "CEO") {
    return (
      <CEODashboard
        userName={ctx.user.name ?? ""}
        orgName={ctx.org.name}
        lastAnalyzed={lastAnalyzed}
        projects={projectStats.map(p => ({
          id:             p.id,
          name:           p.name,
          status:         p.status,
          health:         p.health,
          healthScore:    p.healthScore,
          pct:            p.pct,
          budgetTotal:    p.budgetTotal,
          costForecast:   p.costForecast,
          budgetVariance: p.budgetVariance,
          daysLeft:       p.daysLeft,
          spi:            p.spi,
          cpi:            p.cpi,
          openRisks:      p.openRisks,
          highRisks:      p.highRisks,
        }))}
      />
    );
  }

  // ── PMO view (default) ────────────────────────────────────────────────────
  const totalActive        = projectStats.length;
  const atRiskCount        = projectStats.filter(p => p.health === "AT_RISK" || p.health === "OFF_TRACK").length;
  const onTrackCount       = projectStats.filter(p => p.health === "ON_TRACK").length;
  const budgetExposure     = projectStats.reduce((s, p) => s + Math.max(0, p.budgetVariance), 0);
  const validationPending  = alerts.filter(a => a.requiresValidation && !a.resolved).length;

  return (
    <DashboardClient
      orgName={ctx.org.name}
      userName={ctx.user.name ?? ""}
      preferredView={(ctx.user.preferredView ?? "PMO") as "PMO" | "CEO" | "STK" | "DEV"}
      projects={projectStats}
      alerts={alerts as any}
      kpis={{ totalActive, atRiskCount, onTrackCount, budgetExposure, validationPending }}
      lastAnalyzed={lastAnalyzed}
    />
  );
}
