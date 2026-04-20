export const dynamic = "force-dynamic";
import { db } from "@/lib/prisma";
import { getAuthContext } from "@/lib/auth";
import { redirect } from "next/navigation";
import { calculateHealth } from "@/lib/health";
import DashboardClient from "./DashboardClient";
import CEODashboard from "./CEODashboard";
import StakeholderDashboard from "./StakeholderDashboard";
import DevDashboard from "./DevDashboard";
import CEOInsights from "./CEOInsights";
import StakeholderInsights from "./StakeholderInsights";
import DevInsights from "./DevInsights";

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
      <DevInsights
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
    const stkStats = computeProjectStats(stkProjects).sort((a, b) => b.riskScore - a.riskScore);

    return (
      <StakeholderInsights
        userName={ctx.user.name ?? ""}
        orgName={ctx.org.name}
        myProjects={stkStats.map(p => ({
          id:            p.id,
          name:          p.name,
          status:        p.status,
          health:        p.health,
          pct:           p.pct,
          daysLeft:      p.daysLeft,
          nextMilestone: p.upcomingSprints[0]?.endDate ?? null,
          budgetUsedPct: p.budgetTotal > 0 ? Math.round((p.costActual / p.budgetTotal) * 100) : 0,
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
    const ceoPortfolioHealth = projectStats.length > 0
      ? Math.round(projectStats.reduce((s, p) => s + p.healthScore, 0) / projectStats.length)
      : 0;
    const ceoBudgetExposure = projectStats.reduce((s, p) => s + Math.max(0, p.budgetVariance), 0);
    const ceoCriticalCount  = projectStats.filter(p => p.health === "OFF_TRACK" || p.health === "AT_RISK").length;
    const ceoOnTimePct      = projectStats.length > 0
      ? Math.round(projectStats.filter(p => p.spi >= 0.9).length / projectStats.length * 100)
      : 100;

    const ceoDecisions: { id: string; projectId: string; projectName: string; title: string; impact: string; priority: "urgent" | "watch" }[] = [];
    for (const p of projectStats) {
      if (p.health === "OFF_TRACK") {
        ceoDecisions.push({ id: `ot-${p.id}`, projectId: p.id, projectName: p.name, title: `${p.name} is off track`, impact: `Health ${p.healthScore}/100 · SPI ${p.spi.toFixed(2)} · CPI ${p.cpi.toFixed(2)}`, priority: "urgent" });
      }
      if (p.budgetVariance > 20000 || (p.budgetTotal > 0 && p.budgetVariance / p.budgetTotal > 0.15)) {
        ceoDecisions.push({ id: `bv-${p.id}`, projectId: p.id, projectName: p.name, title: `${p.name} — budget approval needed`, impact: `Forecast overrun · CPI ${p.cpi.toFixed(2)}`, priority: "urgent" });
      }
      if (p.highRisks >= 2) {
        ceoDecisions.push({ id: `hr-${p.id}`, projectId: p.id, projectName: p.name, title: `${p.name} — ${p.highRisks} critical risks`, impact: `${p.openRisks} open risks · Health ${p.healthScore}/100`, priority: "watch" });
      }
    }

    const ceoCriticalAlerts = alerts
      .filter((a: any) => a.level === "critical")
      .map((a: any) => ({
        id: a.id, title: a.title, detail: a.detail,
        projectId: a.project?.id, projectName: a.project?.name,
      }));

    return (
      <div style={{ padding: "24px 28px", fontFamily: "'DM Sans', system-ui, sans-serif" }}>
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#18170F", letterSpacing: "-.4px" }}>
            Portfolio intelligence
          </div>
          <div style={{ fontSize: 11, color: "#5C5A52", marginTop: 4 }}>
            {ctx.org.name} · <strong style={{ color: "#7C3AED" }}>CEO view</strong> · {projectStats.length} projects
          </div>
        </div>
        <CEOInsights
          portfolioHealth={ceoPortfolioHealth}
          budgetExposure={ceoBudgetExposure}
          criticalCount={ceoCriticalCount}
          onTimePct={ceoOnTimePct}
          avgHealth={ceoPortfolioHealth}
          totalProjects={projectStats.length}
          decisions={ceoDecisions}
          criticalAlerts={ceoCriticalAlerts}
          lastAnalyzed={lastAnalyzed}
        />
      </div>
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
