// ── PMO Health Engine — EVM Standard (PMI/PMBOK 7th Ed) ─────────────────────
// Pure function — no side effects, no I/O, deterministic output.
// References: PMI PMBOK 7th Ed, ISO 21502, Gartner PPM Framework.

import type {
  HealthInput,
  HealthReport,
  HealthAlert,
  HealthStatus,
  BudgetRisk,
  RiskLevel,
} from "@roadmap/core/types";

import {
  SPI_THRESHOLDS,
  CPI_THRESHOLDS,
} from "@roadmap/core/constants";

export function calculateHealth(input: HealthInput): HealthReport {
  const now        = new Date();
  const start      = new Date(input.startDate);
  const end        = new Date(input.endDate);
  const totalDays  = Math.max(1, (end.getTime() - start.getTime()) / 86400000);
  const elapsedDays = Math.max(0, (now.getTime() - start.getTime()) / 86400000);
  const daysLeft   = Math.ceil((end.getTime() - now.getTime()) / 86400000);
  const plannedPct = Math.min(100, Math.round((elapsedDays / totalDays) * 100));

  // ── Progress ──────────────────────────────────────────────────────────────
  const progressNominal = input.totalFeatures > 0
    ? Math.round((input.doneFeatures / input.totalFeatures) * 100)
    : 0;
  const scheduleGap = progressNominal - plannedPct;

  // Real progress — adjusted for hidden issues (blocked tasks, schedule gap)
  const blockPenalty = input.totalFeatures > 0
    ? (input.blockedFeatures / input.totalFeatures) * 20 : 0;
  const progressReal = Math.max(0, Math.round(
    progressNominal - blockPenalty - (scheduleGap < -20 ? Math.abs(scheduleGap) * 0.2 : 0)
  ));

  // ── EVM Core ──────────────────────────────────────────────────────────────
  const bac = input.budgetTotal > 0 ? input.budgetTotal : input.costEstimated;
  const ac  = input.costActual;
  const ev  = bac * (progressNominal / 100);
  const pv  = bac * (plannedPct / 100);

  const spi  = pv > 0 ? round2(ev / pv) : 1.0;
  const cpi  = ac > 0 ? round2(ev / ac) : 1.0;
  const eac  = cpi > 0 && bac > 0 ? bac / cpi : bac;
  const etc  = eac - ac;
  const vac  = bac - eac;
  const sv   = ev - pv;
  const cv   = ev - ac;
  const tcpi = (bac - ac) > 0 ? round2((bac - ev) / (bac - ac)) : 1.0;

  // ── Smart Forecast ────────────────────────────────────────────────────────
  const isShortProject    = input.totalSprints <= 2;
  const hasSufficientData = !isShortProject && input.doneSprints >= 2;
  const remainingSprints  = input.totalSprints - input.doneSprints;

  let endForecast: Date;
  let delayDays: number;
  let forecastMode: string;

  if (daysLeft < 0 && progressNominal < 100) {
    forecastMode = "overdue";
    endForecast  = new Date();
    delayDays    = Math.abs(daysLeft);
  } else if (hasSufficientData) {
    forecastMode = "velocity";
    const velocity    = input.doneSprints / Math.max(elapsedDays, 1);
    const forecastDays = velocity > 0 ? elapsedDays + (remainingSprints / velocity) : totalDays;
    endForecast  = new Date(start.getTime() + forecastDays * 86400000);
    delayDays    = Math.max(0, Math.round((endForecast.getTime() - end.getTime()) / 86400000));
  } else {
    forecastMode = isShortProject ? "time_vs_progress" : "insufficient";
    endForecast  = end;
    delayDays    = 0;
  }

  // ── Financials ────────────────────────────────────────────────────────────
  const costForecast    = eac > 0 && bac > 0 ? eac : (progressNominal > 5 ? (ac / progressNominal) * 100 : input.costEstimated);
  const budgetDelta     = bac > 0 ? costForecast - bac : 0;
  const burnRateActual  = elapsedDays > 0 ? ac / elapsedDays : 0;
  const burnRatePlanned = bac > 0 ? bac / totalDays : 0;
  const costEfficiency  = bac > 0 && progressNominal > 0
    ? ((ac / progressNominal) / (bac / 100)) * 100 : 100;

  const budgetRisk: BudgetRisk = bac <= 0 ? "none"
    : budgetDelta > bac * 0.30 ? "critical"
    : budgetDelta > bac * 0.15 ? "high"
    : budgetDelta > bac * 0.05 ? "medium"
    : budgetDelta > 0          ? "low"
    : "none";

  // ── Resources ─────────────────────────────────────────────────────────────
  const utilization = input.totalCapacityHours > 0
    ? Math.round((input.totalActualHours / input.totalCapacityHours) * 100) : 0;
  const overloaded = utilization > 100;

  // ── Risk level ────────────────────────────────────────────────────────────
  const riskLevel: RiskLevel = input.maxRiskScore >= 20 ? "critical"
    : input.maxRiskScore >= 12 ? "high"
    : input.maxRiskScore >= 6  ? "medium"
    : "low";

  // ── Health Score (EVM-based, PMI/PMBOK standard) ──────────────────────────
  // Component 1: Schedule Health (35%) — SPI-based
  const scheduleHealth = spi >= SPI_THRESHOLDS.ON_TRACK  ? 100
    : spi >= SPI_THRESHOLDS.AT_RISK   ? 80
    : spi >= SPI_THRESHOLDS.OFF_TRACK ? 60
    : spi >= 0.50 ? 40 : 20;

  // Component 2: Cost Health (30%) — CPI-based
  const costHealth = bac <= 0 ? 80
    : cpi >= CPI_THRESHOLDS.HEALTHY  ? 100
    : cpi >= CPI_THRESHOLDS.WARNING  ? 80
    : cpi >= CPI_THRESHOLDS.CRITICAL ? 60
    : cpi >= 0.50 ? 40 : 20;

  // Component 3: Scope Health (20%) — blocked ratio
  const scopeRatio  = input.totalFeatures > 0 ? input.blockedFeatures / input.totalFeatures : 0;
  const scopeHealth = scopeRatio === 0 ? 100 : scopeRatio < 0.05 ? 90 : scopeRatio < 0.10 ? 75 : scopeRatio < 0.20 ? 55 : 30;

  // Component 4: Risk Health (15%) — max risk exposure
  const riskHealth = input.maxRiskScore === 0 ? 100
    : input.maxRiskScore < 6  ? 90
    : input.maxRiskScore < 12 ? 70
    : input.maxRiskScore < 20 ? 50 : 25;

  let healthScore = Math.round(
    scheduleHealth * 0.35 +
    costHealth     * 0.30 +
    scopeHealth    * 0.20 +
    riskHealth     * 0.15
  );

  // Hard caps (PMI RAG thresholds)
  if (daysLeft < 0 && progressNominal < 100)  healthScore = Math.min(healthScore, 45);
  if (delayDays > 30)                          healthScore = Math.min(healthScore, 35);
  if (delayDays > 7)                           healthScore = Math.min(healthScore, 60);
  if (budgetRisk === "critical")               healthScore = Math.min(healthScore, 40);
  if (budgetRisk === "high")                   healthScore = Math.min(healthScore, 60);
  if (spi < 0.5 && progressNominal < 50)       healthScore = Math.min(healthScore, 35);

  // ── Status (RAG — Red/Amber/Green) ────────────────────────────────────────
  const status: HealthStatus = progressNominal === 100 ? "COMPLETED"
    : (daysLeft < 0 || delayDays > 14 || budgetRisk === "critical" || spi < 0.5) ? "OFF_TRACK"
    : (delayDays > 3 || (daysLeft <= 7 && progressNominal < 80) || budgetRisk === "medium" || spi < 0.8 || input.blockedFeatures >= 3) ? "AT_RISK"
    : input.activeSprints > 0 ? "ON_TRACK"
    : "NOT_STARTED";

  // ── On-time probability ───────────────────────────────────────────────────
  const onTrackProbability = Math.max(0, Math.min(100, Math.round(
    spi >= 1.0  ? 90 :
    spi >= 0.95 ? 75 :
    spi >= 0.85 ? 55 :
    spi >= 0.70 ? 35 :
    spi >= 0.50 ? 20 : 10
  )));

  // ── Alerts ────────────────────────────────────────────────────────────────
  const alerts: HealthAlert[] = buildAlerts({
    forecastMode, daysLeft, spi, cpi, bac, eac, vac, sv,
    progressNominal, plannedPct, tcpi, scheduleGap,
    blockedFeatures: input.blockedFeatures,
    highRisks: input.highRisks,
    utilization, overloaded, healthScore,
  });

  return {
    status, healthScore, progressNominal, progressReal,
    ev, pv, ac, bac, spi, cpi, eac, etc, vac, sv, cv, tcpi,
    daysLeft, delayDays, plannedPct, scheduleGap, endForecast, forecastMode,
    costForecast, budgetDelta, budgetRisk, burnRateActual, burnRatePlanned, costEfficiency,
    utilization, overloaded, riskLevel,
    onTrackProbability,
    alerts,
  };
}

// ── Internal helpers ──────────────────────────────────────────────────────────

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function buildAlerts(p: {
  forecastMode:    string;
  daysLeft:        number;
  spi:             number;
  cpi:             number;
  bac:             number;
  eac:             number;
  vac:             number;
  sv:              number;
  progressNominal: number;
  plannedPct:      number;
  tcpi:            number;
  scheduleGap:     number;
  blockedFeatures: number;
  highRisks:       number;
  utilization:     number;
  overloaded:      boolean;
  healthScore:     number;
}): HealthAlert[] {
  const alerts: HealthAlert[] = [];

  if (p.forecastMode === "overdue")
    alerts.push({ id: "overdue", level: "critical", category: "schedule", impact: "high",
      title: "Project is overdue",
      detail: `Deadline was ${Math.abs(p.daysLeft)} days ago. SPI=${p.spi.toFixed(2)}. ${100 - p.progressNominal}% work remaining.`,
      action: `Immediate escalation required. Renegotiate deadline or cut ${Math.round((100 - p.progressNominal) * 0.3)}% of remaining scope.` });
  else if (p.spi < 0.5)
    alerts.push({ id: "spi-critical", level: "critical", category: "schedule", impact: "high",
      title: `Critical schedule deviation (SPI: ${p.spi.toFixed(2)})`,
      detail: `Only ${p.progressNominal}% complete vs ${p.plannedPct}% planned.`,
      action: "Emergency scope review required. Consider project reset or timeline extension." });
  else if (p.spi < 0.8)
    alerts.push({ id: "spi-warning", level: "warning", category: "schedule", impact: "medium",
      title: `Behind schedule (SPI: ${p.spi.toFixed(2)})`,
      detail: `SV: ${p.sv > 0 ? "+" : ""}${Math.round(Math.abs(p.sv))} — ${p.progressNominal}% done vs ${p.plannedPct}% planned.`,
      action: "Review sprint velocity and remove blockers. Consider scope reduction." });

  if (p.bac > 0) {
    if (p.cpi < CPI_THRESHOLDS.CRITICAL)
      alerts.push({ id: "cpi-critical", level: "critical", category: "budget", impact: "high",
        title: `Critical cost overrun (CPI: ${p.cpi.toFixed(2)})`,
        detail: `EAC: $${Math.round(p.eac).toLocaleString()} vs BAC: $${Math.round(p.bac).toLocaleString()}. VAC: -$${Math.round(Math.abs(p.vac)).toLocaleString()}.`,
        action: "Freeze non-essential spending. Escalate to finance. Review resource costs." });
    else if (p.cpi < CPI_THRESHOLDS.WARNING)
      alerts.push({ id: "cpi-warning", level: "warning", category: "budget", impact: "medium",
        title: `Cost overrun risk (CPI: ${p.cpi.toFixed(2)})`,
        detail: `EAC: $${Math.round(p.eac).toLocaleString()} vs budget $${Math.round(p.bac).toLocaleString()}.`,
        action: "Review resource allocation. Reduce overtime. Monitor weekly." });

    if (p.tcpi > 1.2)
      alerts.push({ id: "tcpi", level: "warning", category: "budget", impact: "medium",
        title: `High completion effort (TCPI: ${p.tcpi.toFixed(2)})`,
        detail: `Must perform ${Math.round((p.tcpi - 1) * 100)}% more efficiently than to-date to finish on budget.`,
        action: "Revise budget estimate or find efficiency improvements immediately." });
  }

  if (p.blockedFeatures >= 3)
    alerts.push({ id: "blocked-critical", level: "critical", category: "scope", impact: "high",
      title: `${p.blockedFeatures} features blocked`,
      detail: "Multiple blocked features indicate systemic dependency issues reducing SPI.",
      action: "Hold emergency dependency review. Assign owners to each blocker." });
  else if (p.blockedFeatures > 0)
    alerts.push({ id: "blocked-warning", level: "warning", category: "scope", impact: "medium",
      title: `${p.blockedFeatures} feature${p.blockedFeatures > 1 ? "s" : ""} blocked`,
      detail: "Blocked tasks reducing sprint velocity and schedule performance.",
      action: "Resolve blockers before next sprint planning." });

  if (p.forecastMode === "time_vs_progress" && p.scheduleGap < -30)
    alerts.push({ id: "time-progress", level: "critical", category: "progress", impact: "high",
      title: "Severe time-progress misalignment",
      detail: `${p.plannedPct}% of timeline elapsed but only ${p.progressNominal}% complete. Gap: ${Math.abs(p.scheduleGap)}pp.`,
      action: "Immediate scope review. Assign dedicated resources to close the gap." });

  if (p.highRisks > 0)
    alerts.push({ id: "high-risks", level: "warning", category: "risk", impact: "high",
      title: `${p.highRisks} high-impact risk${p.highRisks > 1 ? "s" : ""} open`,
      detail: "Unmitigated high risks threaten schedule and budget performance.",
      action: "Assign mitigation owners and set resolution deadlines this sprint." });

  if (p.overloaded)
    alerts.push({ id: "overloaded", level: "warning", category: "resources", impact: "medium",
      title: `Team overloaded at ${p.utilization}%`,
      detail: "Sustained overload reduces quality and degrades CPI.",
      action: "Redistribute tasks or extend timeline by 10-15%." });

  if (alerts.length === 0)
    alerts.push({ id: "healthy", level: "success", category: "progress", impact: "low",
      title: "Project health is good",
      detail: `SPI: ${p.spi.toFixed(2)} | CPI: ${p.cpi > 0 ? p.cpi.toFixed(2) : "N/A"} | Score: ${p.healthScore}/100`,
      action: "Continue monitoring. Schedule next review in 1 week." });

  return alerts;
}
