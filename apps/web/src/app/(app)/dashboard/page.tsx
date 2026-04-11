export const dynamic = "force-dynamic";
import { db } from "@/lib/prisma";
import { getAuthContext } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { calculateHealth } from "@/lib/health";
import DecisionsCard, { Decision } from "./DecisionsCard";
import ProjectsList from "./ProjectsList";

const getProjects = (orgId: string) =>
  db.project.findMany({
    where: { organisationId: orgId, status: { notIn: ["CLOSED", "ARCHIVED"] } },
    include: {
      sprints: { include: { features: true } },
      phases: { orderBy: { order: "asc" } },
      assignments: { include: { resource: true } },
      risks: true,
      requestedBy: { select: { name: true, email: true } },
      departments: { include: { department: true } },
      _count: { select: { sprints: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);

export default async function CommandCenterPage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/sign-in");

  const projectCount = await db.project.count({ where: { organisationId: ctx.org.id } });
  if (projectCount === 0) redirect("/onboarding");

  const projects = await getProjects(ctx.org.id);

  const projectStats = projects.map(p => {
    const allF       = p.sprints.flatMap(s => s.features);
    const done       = allF.filter(f => f.status === "DONE").length;
    const blocked    = allF.filter(f => f.status === "BLOCKED").length;
    const inProgress = allF.filter(f => f.status === "IN_PROGRESS").length;
    const pct        = allF.length ? Math.round((done / allF.length) * 100) : 0;
    const activeSprints = p.sprints.filter(s => s.status === "ACTIVE").length;
    const costEstimated = p.assignments.reduce((s, a) => s + a.estimatedHours * a.resource.costPerHour, 0);
    const costActual    = p.assignments.reduce((s, a) => s + a.actualHours    * a.resource.costPerHour, 0);

    const h = calculateHealth({
      startDate: p.startDate, endDate: p.endDate,
      totalFeatures: allF.length, doneFeatures: done,
      blockedFeatures: blocked, inProgressFeatures: inProgress,
      totalSprints: p.sprints.length,
      doneSprints: p.sprints.filter(s => s.status === "DONE").length,
      activeSprints,
      budgetTotal: p.budgetTotal, costActual, costEstimated,
      totalCapacityHours: p.assignments.reduce((s, a) => s + a.resource.capacityHours, 0),
      totalActualHours: p.assignments.reduce((s, a) => s + a.actualHours, 0),
      openRisks: p.risks.filter(r => r.status === "OPEN").length,
      highRisks: p.risks.filter(r => r.status === "OPEN" && r.probability * r.impact >= 9).length,
      maxRiskScore: p.risks.filter(r => r.status === "OPEN").reduce((m, r) => Math.max(m, r.probability * r.impact), 0),
    });

    const health        = h.status;
    const atRisk        = health === "AT_RISK" || health === "OFF_TRACK";
    const costForecast  = pct > 0 ? (costActual / pct) * 100 : costEstimated;
    const budgetVariance = p.budgetTotal > 0 ? costForecast - p.budgetTotal : 0;
    const openRisks     = p.risks.filter(r => r.status === "OPEN").length;
    const highRisks     = p.risks.filter(r => r.status === "OPEN" && r.probability * r.impact >= 9).length;
    const daysLeft      = Math.ceil((new Date(p.endDate).getTime() - Date.now()) / 86400000);

    // Risk score for sorting (higher = more at-risk)
    const riskScore =
      (atRisk ? 100 : 0) +
      highRisks * 20 +
      openRisks * 5 +
      (budgetVariance > 0 ? 15 : 0) +
      (daysLeft < 0 ? 30 : daysLeft <= 7 && pct < 80 ? 10 : 0);

    return {
      ...p, allF, done, blocked, inProgress, pct, activeSprints, atRisk, health,
      costEstimated, costActual, costForecast, budgetVariance, openRisks, highRisks,
      daysLeft, riskScore,
    };
  });

  // ── 4 KPIs ────────────────────────────────────────────────────────────────
  const totalActive    = projectStats.length;
  const atRiskCount    = projectStats.filter(p => p.atRisk).length;
  const onTrackCount   = projectStats.filter(p => p.health === "ON_TRACK").length;
  const budgetExposure = projectStats.reduce((s, p) => s + Math.max(0, p.budgetVariance), 0);

  // ── Rule-based decisions ──────────────────────────────────────────────────
  const rawDecisions: Decision[] = [];

  projectStats.forEach(p => {
    if (p.budgetVariance > 0 && p.budgetTotal > 0)
      rawDecisions.push({
        id: `budget-${p.id}`,
        severity: "critical",
        type: "budget_overrun",
        title: `"${p.name}" budget overrun`,
        detail: `Forecast ${fmt(p.costForecast)} vs budget ${fmt(p.budgetTotal)} — ${fmt(p.budgetVariance)} over.`,
        projectId: p.id,
        projectName: p.name,
        fixTab: "financials",
      });

    if (p.daysLeft < 0 && p.health !== "COMPLETED")
      rawDecisions.push({
        id: `overdue-${p.id}`,
        severity: "critical",
        type: "overdue",
        title: `"${p.name}" is past deadline`,
        detail: `${Math.abs(p.daysLeft)} days overdue at ${p.pct}% completion.`,
        projectId: p.id,
        projectName: p.name,
        fixTab: "overview",
      });
    else if (p.daysLeft >= 0 && p.daysLeft <= 7 && p.pct < 80 && p.health !== "COMPLETED")
      rawDecisions.push({
        id: `deadline-${p.id}`,
        severity: "warning",
        type: "deadline_risk",
        title: `"${p.name}" deadline in ${p.daysLeft}d`,
        detail: `Only ${p.pct}% complete — ${100 - p.pct}% remaining with ${p.daysLeft} days left.`,
        projectId: p.id,
        projectName: p.name,
        fixTab: "timeline",
      });

    if (p.highRisks > 0)
      rawDecisions.push({
        id: `risks-${p.id}`,
        severity: "critical",
        type: "high_risk",
        title: `${p.highRisks} critical risk${p.highRisks > 1 ? "s" : ""} in "${p.name}"`,
        detail: `${p.highRisks} open risk${p.highRisks > 1 ? "s" : ""} with probability × impact ≥ 9 — unmitigated.`,
        projectId: p.id,
        projectName: p.name,
        fixTab: "risks",
      });

    if (p.blocked >= 3)
      rawDecisions.push({
        id: `blocked-${p.id}`,
        severity: "warning",
        type: "blocked_sprint",
        title: `${p.blocked} features blocked in "${p.name}"`,
        detail: `${p.blocked} blocked features across active sprints — velocity at risk.`,
        projectId: p.id,
        projectName: p.name,
        fixTab: "board",
      });
  });

  const decisions = rawDecisions
    .sort((a, b) => (a.severity === "critical" ? -1 : b.severity === "critical" ? 1 : 0))
    .slice(0, 5);

  // Sort projects by risk score descending
  const sortedProjects = [...projectStats].sort((a, b) => b.riskScore - a.riskScore);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        .kpi-card { background: #fff; border-radius: 14px; border: 1px solid #E2E8F0; padding: 20px 22px; transition: box-shadow 0.15s; }
        .kpi-card:hover { box-shadow: 0 4px 20px rgba(0,0,0,0.06); }
      `}</style>

      <div style={{ padding: "28px 32px", fontFamily: "'Plus Jakarta Sans', sans-serif", maxWidth: 1200 }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: "#0F172A", letterSpacing: "-0.5px", marginBottom: 3 }}>
              Command Center
            </h1>
            <p style={{ fontSize: 13, color: "#94A3B8", fontWeight: 500 }}>
              {ctx.org.name} · {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
            </p>
          </div>
          <Link href="/projects/new" style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 20px", background: "#006D6B", color: "#fff", borderRadius: 10, fontSize: 13, fontWeight: 600, textDecoration: "none", boxShadow: "0 2px 8px rgba(0,109,107,0.25)" }}>
            <span style={{ fontSize: 16, lineHeight: 1 }}>+</span> New Project
          </Link>
        </div>

        {/* 4 KPI Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 24 }}>
          {[
            {
              label: "Active Projects",
              value: totalActive,
              sub: "in portfolio",
              accent: "#0F172A",
              subColor: "#94A3B8",
            },
            {
              label: "At Risk",
              value: atRiskCount,
              sub: atRiskCount > 0 ? "need attention" : "all healthy",
              accent: atRiskCount > 0 ? "#DC2626" : "#059669",
              subColor: atRiskCount > 0 ? "#DC2626" : "#059669",
            },
            {
              label: "Budget Exposure",
              value: budgetExposure > 0 ? fmt(budgetExposure) : "$0",
              sub: budgetExposure > 0 ? "forecasted overrun" : "within budget",
              accent: budgetExposure > 0 ? "#D97706" : "#059669",
              subColor: budgetExposure > 0 ? "#D97706" : "#94A3B8",
            },
            {
              label: "On Track",
              value: onTrackCount,
              sub: `of ${totalActive} projects`,
              accent: "#059669",
              subColor: "#94A3B8",
            },
          ].map(k => (
            <div key={k.label} className="kpi-card">
              <div style={{ fontSize: 10, fontWeight: 700, color: "#94A3B8", letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: 10 }}>{k.label}</div>
              <div style={{ fontSize: 30, fontWeight: 800, color: k.accent, letterSpacing: "-1px", marginBottom: 4, lineHeight: 1 }}>{k.value}</div>
              <div style={{ fontSize: 11, color: k.subColor, fontWeight: 500 }}>{k.sub}</div>
            </div>
          ))}
        </div>

        {/* Decisions needed */}
        <div style={{ marginBottom: 24 }}>
          <DecisionsCard decisions={decisions} />
        </div>

        {/* Projects sorted by risk */}
        <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 14, overflow: "hidden" }}>
          <div style={{ padding: "16px 22px", borderBottom: "1px solid #F1F5F9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#0F172A" }}>Projects</div>
              <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 2 }}>Sorted by risk — highest first</div>
            </div>
            <Link href="/portfolio" style={{ fontSize: 12, color: "#006D6B", fontWeight: 600, textDecoration: "none" }}>View portfolio →</Link>
          </div>
          <ProjectsList projectStats={sortedProjects} />
        </div>
      </div>
    </>
  );
}
