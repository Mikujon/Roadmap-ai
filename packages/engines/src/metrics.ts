// ── Project Metrics Engine ───────────────────────────────────────────────────
// Pure functions — compute derived metrics from project engine input.
// No I/O, no side-effects, fully testable.

import type { ProjectEngineInput } from "@roadmap/core/types";
import { calculateHealth } from "./health";

export interface ProjectMetrics {
  // Progress
  totalFeatures:   number;
  doneFeatures:    number;
  blockedFeatures: number;
  inProgress:      number;
  progressPct:     number;

  // Schedule
  daysLeft:        number;
  isOverdue:       boolean;
  plannedPct:      number;
  scheduleGap:     number;

  // Cost
  costActual:      number;
  costEstimated:   number;
  costForecast:    number;
  budgetVariance:  number;

  // Velocity
  completedSprints: number;
  totalSprints:     number;
  estimatedDelay:   number;
  velocityPerDay:   number | null;
  velocityTrend:    "accelerating" | "decelerating" | "stable" | "insufficient_data";

  // Risk
  openRisks:   number;
  highRisks:   number;
  maxRiskScore: number;
  riskScore:   number; // composite sort score

  // Team
  totalCapacityHours: number;
  totalActualHours:   number;
  utilization:        number;

  // Health (delegated to health engine)
  healthScore:        number;
  health:             string;
  atRisk:             boolean;
}

export function calculateProjectMetrics(p: ProjectEngineInput): ProjectMetrics {
  const allF         = p.sprints.flatMap(s => s.features);
  const done         = allF.filter(f => f.status === "DONE").length;
  const blocked      = allF.filter(f => f.status === "BLOCKED").length;
  const inProgress   = allF.filter(f => f.status === "IN_PROGRESS").length;
  const progressPct  = allF.length > 0 ? Math.round((done / allF.length) * 100) : 0;

  const now          = new Date();
  const start        = new Date(p.startDate);
  const end          = new Date(p.endDate);
  const totalDays    = Math.max(1, (end.getTime() - start.getTime()) / 86400000);
  const elapsedDays  = Math.max(0, (now.getTime() - start.getTime()) / 86400000);
  const daysLeft     = Math.ceil((end.getTime() - now.getTime()) / 86400000);
  const plannedPct   = Math.min(100, Math.round((elapsedDays / totalDays) * 100));

  const costActual   = p.assignments.reduce((s, a) => s + a.actualHours * a.resource.costPerHour, 0);
  const costEst      = p.assignments.reduce((s, a) => s + a.estimatedHours * a.resource.costPerHour, 0);
  const costForecast = progressPct > 5 ? (costActual / progressPct) * 100 : costEst;
  const budgetRef    = p.budgetTotal > 0 ? p.budgetTotal : costEst;
  const budgetVariance = budgetRef > 0 ? costForecast - budgetRef : 0;

  const doneSprints  = p.sprints.filter(s => s.status === "DONE").length;
  const activeSprints = p.sprints.filter(s => s.status === "ACTIVE").length;
  const totalSprints = p.sprints.length;

  // Velocity per sprint
  const sprintVelocities = p.sprints
    .filter(s => s.status === "DONE" && s.startDate && s.endDate)
    .map(s => {
      const dur = Math.max(1, (new Date(s.endDate!).getTime() - new Date(s.startDate!).getTime()) / 86400000);
      const doneInSprint = s.features.filter(f => f.status === "DONE").length;
      return doneInSprint / dur;
    });

  const velocityPerDay = sprintVelocities.length > 0
    ? sprintVelocities.reduce((a, b) => a + b, 0) / sprintVelocities.length
    : null;

  const remainingSprints = totalSprints - doneSprints;
  const estimatedDelay = velocityPerDay && velocityPerDay > 0 && doneSprints > 0
    ? Math.max(0, Math.round(elapsedDays + (remainingSprints / velocityPerDay) - totalDays))
    : 0;

  let velocityTrend: ProjectMetrics["velocityTrend"] = "insufficient_data";
  if (sprintVelocities.length >= 2) {
    const first = sprintVelocities[0]!;
    const last  = sprintVelocities[sprintVelocities.length - 1]!;
    velocityTrend = last > first * 1.1 ? "accelerating" : last < first * 0.9 ? "decelerating" : "stable";
  }

  // Risk
  const openRisks   = p.risks.filter(r => r.status === "OPEN");
  const highRisks   = openRisks.filter(r => r.probability * r.impact >= 9);
  const maxRiskScore = openRisks.length > 0 ? Math.max(...openRisks.map(r => r.probability * r.impact)) : 0;

  // Team
  const totalCapacityHours = p.assignments.reduce((s, a) => s + a.resource.capacityHours, 0);
  const totalActualHours   = p.assignments.reduce((s, a) => s + a.actualHours, 0);
  const utilization = totalCapacityHours > 0
    ? Math.round((totalActualHours / totalCapacityHours) * 100) : 0;

  // Health score (delegate)
  const h = calculateHealth({
    startDate: p.startDate, endDate: p.endDate,
    totalFeatures: allF.length, doneFeatures: done,
    blockedFeatures: blocked, inProgressFeatures: inProgress,
    totalSprints, doneSprints, activeSprints,
    budgetTotal: p.budgetTotal, costActual, costEstimated: costEst,
    totalCapacityHours, totalActualHours,
    openRisks: openRisks.length, highRisks: highRisks.length, maxRiskScore,
  });

  const atRisk = h.status === "AT_RISK" || h.status === "OFF_TRACK";

  // Composite risk sort score (for Command Center ranking)
  const riskScore =
    (atRisk ? 100 : 0) +
    highRisks.length * 20 +
    openRisks.length * 5 +
    (budgetVariance > 0 ? 15 : 0) +
    (daysLeft < 0 ? 30 : daysLeft <= 7 && progressPct < 80 ? 10 : 0);

  return {
    totalFeatures: allF.length,
    doneFeatures: done,
    blockedFeatures: blocked,
    inProgress,
    progressPct,
    daysLeft,
    isOverdue: daysLeft < 0,
    plannedPct,
    scheduleGap: progressPct - plannedPct,
    costActual,
    costEstimated: costEst,
    costForecast,
    budgetVariance,
    completedSprints: doneSprints,
    totalSprints,
    estimatedDelay,
    velocityPerDay,
    velocityTrend,
    openRisks: openRisks.length,
    highRisks: highRisks.length,
    maxRiskScore,
    riskScore,
    totalCapacityHours,
    totalActualHours,
    utilization,
    healthScore: h.healthScore,
    health: h.status,
    atRisk,
  };
}

export interface PortfolioMetrics {
  totalActive:     number;
  atRiskCount:     number;
  onTrackCount:    number;
  budgetExposure:  number;
  avgCompletion:   number;
  totalBlocked:    number;
}

export function calculatePortfolioMetrics(
  projects: Array<{ metrics: ProjectMetrics; budgetTotal: number }>
): PortfolioMetrics {
  const total = projects.length;
  return {
    totalActive:    total,
    atRiskCount:    projects.filter(p => p.metrics.atRisk).length,
    onTrackCount:   projects.filter(p => p.metrics.health === "ON_TRACK").length,
    budgetExposure: projects.reduce((s, p) => s + Math.max(0, p.metrics.budgetVariance), 0),
    avgCompletion:  total > 0 ? Math.round(projects.reduce((s, p) => s + p.metrics.progressPct, 0) / total) : 0,
    totalBlocked:   projects.reduce((s, p) => s + p.metrics.blockedFeatures, 0),
  };
}
