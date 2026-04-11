// ── Single source of truth for project metrics ────────────────────────────
// Used by: dashboard, portfolio, cost view, overview
// All pages must use this function — never recalculate locally

import { calculateHealth, type HealthReport } from "./health";

export interface ProjectForMetrics {
  id: string;
  name: string;
  description?: string | null;
  startDate: Date | string;
  endDate: Date | string;
  budgetTotal: number;
  revenueExpected: number;
  status: string;
  updatedAt: Date | string;
  sprints: {
    id: string;
    status: string;
    num: string;
    name: string;
    startDate?: Date | string | null;
    endDate?: Date | string | null;
    features: {
      status: string;
      priority: string;
      estimatedHours: number;
      actualHours: number;
    }[];
  }[];
  assignments: {
    estimatedHours: number;
    actualHours: number;
    resource: {
      costPerHour: number;
      capacityHours: number;
      name: string;
      role: string;
    };
  }[];
  risks: {
    status: string;
    probability: number;
    impact: number;
  }[];
  departments?: { department: { name: string; color?: string } }[];
  requestedBy?: { name?: string | null; email: string } | null;
  dependsOn?: any[];
}

export interface ProjectMetrics {
  // Identity
  id: string;
  name: string;
  description?: string | null;
  startDate: Date;
  endDate: Date;
  updatedAt: Date;

  // Features
  totalFeatures: number;
  doneFeatures: number;
  blockedFeatures: number;
  inProgressFeatures: number;

  // Sprints
  totalSprints: number;
  doneSprints: number;
  activeSprints: number;

  // Financials
  costActual: number;
  costEstimated: number;
  costForecast: number;
  budgetTotal: number;
  revenueExpected: number;
  marginEur: number;
  marginPct: number;
  budgetDelta: number;
  burnRateActual: number;
  burnRatePlanned: number;
  costPerPct: number;
  baselineCostPerPct: number;
  costEfficiency: number;

  // Resources
  teamSize: number;
  utilization: number;
  overloaded: boolean;

  // Risks
  openRisksCount: number;
  highRisksCount: number;
  maxRiskScore: number;
  riskScore: number;

  // Schedule
  daysLeft: number;
  elapsedDays: number;
  totalDays: number;
  plannedPct: number;
  scheduleGap: number;
  scheduleScore: number;
  blockingIssues: number;

  // Health (from calculateHealth)
  health: HealthReport;

  // Derived
  client: string;
  deptNames: string;

  // Action recommendation
  action: string;
  actionPriority: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  actionColor: string;

  // Margin trend
  marginTrend: string;
}

export function getProjectMetrics(p: ProjectForMetrics): ProjectMetrics {
  const allF       = p.sprints.flatMap(s => s.features);
  const done       = allF.filter(f => f.status === "DONE").length;
  const blocked    = allF.filter(f => f.status === "BLOCKED").length;
  const inProgress = allF.filter(f => f.status === "IN_PROGRESS").length;

  const costActual    = p.assignments.reduce((s, a) => s + a.actualHours    * a.resource.costPerHour, 0);
  const costEstimated = p.assignments.reduce((s, a) => s + a.estimatedHours * a.resource.costPerHour, 0);
  const totalCap      = p.assignments.reduce((s, a) => s + a.resource.capacityHours, 0);
  const totalHours    = p.assignments.reduce((s, a) => s + a.actualHours, 0);

  const openRisks    = p.risks.filter(r => r.status === "OPEN");
  const highRisks    = p.risks.filter(r => r.status === "OPEN" && r.probability * r.impact >= 9);
  const riskScore    = openRisks.reduce((s, r) => s + r.probability * r.impact, 0);
  const maxRiskScore = openRisks.length > 0 ? Math.max(...openRisks.map(r => r.probability * r.impact)) : 0;

  const doneSprints   = p.sprints.filter(s => s.status === "DONE").length;
  const activeSprints = p.sprints.filter(s => s.status === "ACTIVE").length;

  // ── Central health calculation ──
  const health = calculateHealth({
    startDate:          p.startDate,
    endDate:            p.endDate,
    totalFeatures:      allF.length,
    doneFeatures:       done,
    blockedFeatures:    blocked,
    inProgressFeatures: inProgress,
    totalSprints:       p.sprints.length,
    doneSprints,
    activeSprints,
    budgetTotal:        p.budgetTotal,
    costActual,
    costEstimated,
    totalCapacityHours: totalCap,
    totalActualHours:   totalHours,
    openRisks:          openRisks.length,
    highRisks:          highRisks.length,
    maxRiskScore,
  });

  const now          = new Date();
  const start        = new Date(p.startDate);
  const end          = new Date(p.endDate);
  const totalDays    = Math.max(1, (end.getTime() - start.getTime()) / 86400000);
  const elapsedDays  = Math.max(0, (now.getTime() - start.getTime()) / 86400000);
  const plannedPct   = Math.min(100, Math.round((elapsedDays / totalDays) * 100));
  const progress     = allF.length ? Math.round((done / allF.length) * 100) : 0;
  const scheduleGap  = progress - plannedPct;
  const scheduleScore = Math.max(0, Math.min(100, 50 + scheduleGap));

  const budgetTotal    = p.budgetTotal || costEstimated;
  const costForecast   = health.costForecast;
  const budgetDelta    = health.budgetDelta;
  const revenue        = p.revenueExpected;
  const marginEur      = revenue - costForecast;
  const marginPct      = revenue > 0 ? (marginEur / revenue) * 100 : 0;
  const marginTrend    = marginPct >= 20 ? "↑ Good" : marginPct >= 0 ? "→ Neutral" : "↓ Negative";
  const burnRateActual  = elapsedDays > 0 ? costActual / elapsedDays : 0;
  const burnRatePlanned = budgetTotal > 0 ? budgetTotal / totalDays : 0;
  const costPerPct      = progress > 0 ? costActual / progress : 0;
  const baselineCostPerPct = budgetTotal > 0 ? budgetTotal / 100 : 0;
  const costEfficiency  = baselineCostPerPct > 0 ? (costPerPct / baselineCostPerPct) * 100 : 100;

  const utilization = totalCap > 0 ? Math.round((totalHours / totalCap) * 100) : 0;
  const overloaded  = utilization > 100;

  const blockingIssues = blocked + (p.dependsOn?.length ?? 0);
  const client     = p.requestedBy?.name ?? p.requestedBy?.email ?? "—";
  const deptNames  = p.departments?.map(pd => pd.department.name).join(", ") || "—";

  // Action recommendation from health alerts
  const topCritical = health.alerts.find(a => a.level === "critical");
  const topWarning  = health.alerts.find(a => a.level === "warning");
  const topAlert    = topCritical ?? topWarning;
  const action      = topAlert?.action ?? "Monitor — no critical issues";
  const actionPriority: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" =
    topCritical ? "CRITICAL" : topWarning ? "HIGH" : "LOW";
  const ACTION_COLORS = { CRITICAL: "#DC2626", HIGH: "#EA580C", MEDIUM: "#D97706", LOW: "#059669" };
  const actionColor = ACTION_COLORS[actionPriority];

  return {
    id: p.id, name: p.name, description: p.description,
    startDate: new Date(p.startDate), endDate: new Date(p.endDate),
    updatedAt: new Date(p.updatedAt),
    totalFeatures: allF.length, doneFeatures: done, blockedFeatures: blocked, inProgressFeatures: inProgress,
    totalSprints: p.sprints.length, doneSprints, activeSprints,
    costActual, costEstimated, costForecast, budgetTotal, revenueExpected: revenue,
    marginEur, marginPct, budgetDelta, burnRateActual, burnRatePlanned,
    costPerPct, baselineCostPerPct, costEfficiency,
    teamSize: p.assignments.length, utilization, overloaded,
    openRisksCount: openRisks.length, highRisksCount: highRisks.length, maxRiskScore, riskScore,
    daysLeft: health.daysLeft, elapsedDays, totalDays, plannedPct, scheduleGap, scheduleScore,
    blockingIssues, health,
    client, deptNames,
    action, actionPriority, actionColor,
    marginTrend,
  };
}

// ── Format helpers (shared across all pages) ──────────────────────────────
export const fmtCurrency = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);

export const fmtDate = (d: Date | string) =>
  new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit" });

export const fmtPct = (n: number) => `${Math.round(n)}%`;