// ── PMO Health Engine — EVM Standard (PMI/PMBOK) ─────────────────────────
// Formula based on Earned Value Management (EVM) — industry standard
// References: PMI PMBOK 7th Ed, ISO 21502, Gartner PPM Framework

export type HealthStatus = "ON_TRACK" | "AT_RISK" | "OFF_TRACK" | "COMPLETED" | "NOT_STARTED";
export type BudgetRisk   = "none" | "low" | "medium" | "high" | "critical";
export type RiskLevel    = "low" | "medium" | "high" | "critical";

export interface HealthInput {
  startDate:   Date | string;
  endDate:     Date | string;
  totalFeatures:    number;
  doneFeatures:     number;
  blockedFeatures:  number;
  inProgressFeatures: number;
  totalSprints:     number;
  doneSprints:      number;
  activeSprints:    number;
  budgetTotal:      number;   // BAC — Budget at Completion
  costActual:       number;   // AC  — Actual Cost
  costEstimated:    number;   // Planned cost (estimated hours * rate)
  totalCapacityHours: number;
  totalActualHours:   number;
  openRisks:        number;
  highRisks:        number;
  maxRiskScore:     number;
}

export interface HealthReport {
  // Core
  status:          HealthStatus;
  healthScore:     number;       // 0-100 composite PMO score
  progressNominal: number;       // % features done
  progressReal:    number;       // adjusted for blocked/issues

  // EVM Metrics (industry standard)
  ev:  number;  // Earned Value = BAC * progress%
  pv:  number;  // Planned Value = BAC * planned%
  ac:  number;  // Actual Cost
  bac: number;  // Budget at Completion
  spi: number;  // Schedule Performance Index = EV/PV (1.0 = on plan)
  cpi: number;  // Cost Performance Index = EV/AC (1.0 = on budget)
  eac: number;  // Estimate at Completion = BAC/CPI
  etc: number;  // Estimate to Complete = EAC - AC
  vac: number;  // Variance at Completion = BAC - EAC
  sv:  number;  // Schedule Variance = EV - PV
  cv:  number;  // Cost Variance = EV - AC
  tcpi: number; // To-Complete Performance Index = (BAC-EV)/(BAC-AC)

  // Schedule
  daysLeft:    number;
  delayDays:   number;
  plannedPct:  number;
  scheduleGap: number;
  endForecast: Date;
  forecastMode: string;

  // Cost
  costForecast:   number;
  budgetDelta:    number;
  budgetRisk:     BudgetRisk;
  burnRateActual: number;
  burnRatePlanned: number;
  costEfficiency: number;

  // Resources
  utilization: number;
  overloaded:  boolean;

  // Risk
  riskLevel: RiskLevel;

  // Alerts
  alerts: HealthAlert[];

  // On-time probability (0-100)
  onTrackProbability: number;
}

export interface HealthAlert {
  id:       string;
  level:    "critical" | "warning" | "info" | "success";
  category: "schedule" | "budget" | "resources" | "scope" | "risk" | "progress";
  title:    string;
  detail:   string;
  action:   string;
  impact:   "high" | "medium" | "low";
}

export function calculateHealth(input: HealthInput): HealthReport {
  const now        = new Date();
  const start      = new Date(input.startDate);
  const end        = new Date(input.endDate);
  const totalDays  = Math.max(1, (end.getTime() - start.getTime()) / 86400000);
  const elapsedDays = Math.max(0, (now.getTime() - start.getTime()) / 86400000);
  const daysLeft   = Math.ceil((end.getTime() - now.getTime()) / 86400000);
  const plannedPct = Math.min(100, Math.round((elapsedDays / totalDays) * 100));

  // Progress
  const progressNominal = input.totalFeatures > 0
    ? Math.round((input.doneFeatures / input.totalFeatures) * 100)
    : 0;
  const scheduleGap = progressNominal - plannedPct;

  // Real progress (adjusted for hidden issues)
  const blockPenalty = input.totalFeatures > 0
    ? (input.blockedFeatures / input.totalFeatures) * 20 : 0;
  const progressReal = Math.max(0, Math.round(
    progressNominal - blockPenalty - (scheduleGap < -20 ? Math.abs(scheduleGap) * 0.2 : 0)
  ));

  // Guard: brand new project with no features
  const projectAgePercent = (elapsedDays / totalDays) * 100;
  if (input.totalFeatures === 0 && projectAgePercent < 10) {
    return {
      status: "ON_TRACK" as HealthStatus,
      healthScore: 80,
      progressNominal: 0,
      progressReal: 0,
      ev: 0, pv: 0, ac: 0,
      bac: input.budgetTotal,
      spi: 1.0, cpi: 1.0,
      eac: input.budgetTotal,
      etc: input.budgetTotal,
      vac: 0, sv: 0, cv: 0, tcpi: 1.0,
      daysLeft, delayDays: 0,
      plannedPct, scheduleGap: 0,
      endForecast: end,
      forecastMode: "new_project",
      costForecast: input.budgetTotal,
      budgetDelta: 0,
      budgetRisk: "none" as BudgetRisk,
      burnRateActual: 0,
      burnRatePlanned: input.budgetTotal / totalDays,
      costEfficiency: 100,
      utilization: 0,
      overloaded: false,
      riskLevel: "low" as RiskLevel,
      onTrackProbability: 85,
      alerts: [{
        id: "new-project",
        level: "info" as const,
        category: "progress" as const,
        title: "Project just started",
        detail: "No features added yet. Add tasks to start tracking progress.",
        action: "Go to Board and add features to Sprint 1.",
        impact: "low" as const
      }]
    };
  }

  // ── EVM Core Calculations ─────────────────────────────────────────────
  const bac = input.budgetTotal > 0 ? input.budgetTotal : input.costEstimated;
  const ac  = input.costActual;
  const ev  = bac * (progressNominal / 100);   // Earned Value
  const pv  = bac * (plannedPct / 100);         // Planned Value

  // Performance Indices
  const spi = pv > 0 ? Math.round((ev / pv) * 100) / 100 : 1.0;   // Schedule Performance Index
  const cpi = ac > 0 ? Math.round((ev / ac) * 100) / 100 : 1.0;   // Cost Performance Index

  // Forecasts
  const eac  = cpi > 0 && bac > 0 ? bac / cpi : bac;              // Estimate at Completion
  const etc  = eac - ac;                                            // Estimate to Complete
  const vac  = bac - eac;                                           // Variance at Completion
  const sv   = ev - pv;                                             // Schedule Variance ($)
  const cv   = ev - ac;                                             // Cost Variance ($)
  const tcpi = (bac - ac) > 0 ? (bac - ev) / (bac - ac) : 1.0;    // To-Complete Performance Index

  // ── Smart Forecast ────────────────────────────────────────────────────
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
    const velocity     = input.doneSprints / Math.max(elapsedDays, 1);
    const forecastDays = velocity > 0 ? elapsedDays + (remainingSprints / velocity) : totalDays;
    endForecast  = new Date(start.getTime() + forecastDays * 86400000);
    delayDays    = Math.max(0, Math.round((endForecast.getTime() - end.getTime()) / 86400000));
  } else {
    forecastMode = isShortProject ? "time_vs_progress" : "insufficient";
    endForecast  = end;
    delayDays    = 0;
  }

  // Financials
  const costForecast   = eac > 0 && bac > 0 ? eac : (progressNominal > 5 ? (ac / progressNominal) * 100 : input.costEstimated);
  const budgetDelta    = bac > 0 ? costForecast - bac : 0;
  const burnRateActual  = elapsedDays > 0 ? ac / elapsedDays : 0;
  const burnRatePlanned = bac > 0 ? bac / totalDays : 0;
  const costEfficiency  = bac > 0 && progressNominal > 0
    ? ((ac / progressNominal) / (bac / 100)) * 100 : 100;

  const budgetRisk: BudgetRisk = bac <= 0 ? "none"
    : budgetDelta > bac * 0.3  ? "critical"
    : budgetDelta > bac * 0.15 ? "high"
    : budgetDelta > bac * 0.05 ? "medium"
    : budgetDelta > 0          ? "low"
    : "none";

  // Resources
  const utilization = input.totalCapacityHours > 0
    ? Math.round((input.totalActualHours / input.totalCapacityHours) * 100) : 0;
  const overloaded = utilization > 100;

  // Risk level
  const riskLevel: RiskLevel = input.maxRiskScore >= 20 ? "critical"
    : input.maxRiskScore >= 12 ? "high"
    : input.maxRiskScore >= 6  ? "medium"
    : "low";

  // ── PMO Health Score (EVM-based, industry standard) ───────────────────
  // Based on: PMI PMBOK, Gartner PPM, McKinsey project health framework
  //
  // Component 1: Schedule Health (35%) — based on SPI
  //   SPI >= 0.95 → 100pts | SPI >= 0.85 → 80pts | SPI >= 0.70 → 60pts | else → 40pts
  const scheduleHealth = spi >= 0.95 ? 100 : spi >= 0.85 ? 80 : spi >= 0.70 ? 60 : spi >= 0.50 ? 40 : 20;

  // Component 2: Cost Health (30%) — based on CPI
  //   CPI >= 0.95 → 100pts | CPI >= 0.85 → 80pts | CPI >= 0.70 → 60pts | else → 40pts
  //   No budget set → neutral 80pts
  const costHealth = bac <= 0 ? 80 : cpi >= 0.95 ? 100 : cpi >= 0.85 ? 80 : cpi >= 0.70 ? 60 : cpi >= 0.50 ? 40 : 20;

  // Component 3: Scope Health (20%) — blocked/risk exposure
  const scopeRatio = input.totalFeatures > 0 ? input.blockedFeatures / input.totalFeatures : 0;
  const scopeHealth = scopeRatio === 0 ? 100 : scopeRatio < 0.05 ? 90 : scopeRatio < 0.10 ? 75 : scopeRatio < 0.20 ? 55 : 30;

  // Component 4: Risk Health (15%) — risk exposure
  const riskHealth = input.maxRiskScore === 0 ? 100
    : input.maxRiskScore < 6  ? 90
    : input.maxRiskScore < 12 ? 70
    : input.maxRiskScore < 20 ? 50
    : 25;

  // Base composite score
  let healthScore = Math.round(
    scheduleHealth * 0.35 +
    costHealth     * 0.30 +
    scopeHealth    * 0.20 +
    riskHealth     * 0.15
  );

  // ── Hard caps (PMI RAG thresholds) ───────────────────────────────────
  if (daysLeft < 0 && progressNominal < 100)  healthScore = Math.min(healthScore, 45); // Overdue
  if (delayDays > 30)                          healthScore = Math.min(healthScore, 35); // Severe delay
  if (delayDays > 7)                           healthScore = Math.min(healthScore, 60); // Moderate delay
  if (budgetRisk === "critical")               healthScore = Math.min(healthScore, 40); // Budget critical
  if (budgetRisk === "high")                   healthScore = Math.min(healthScore, 60); // Budget high
  if (spi < 0.5 && progressNominal < 50)       healthScore = Math.min(healthScore, 35); // SPI critical

  // ── Status (RAG — Red/Amber/Green standard) ──────────────────────────
  const status: HealthStatus = progressNominal === 100 ? "COMPLETED"
    : (daysLeft < 0 || delayDays > 14 || budgetRisk === "critical" || spi < 0.5) ? "OFF_TRACK"
    : (delayDays > 3 || (daysLeft <= 7 && progressNominal < 80) || budgetRisk === "medium" || spi < 0.8 || input.blockedFeatures >= 3) ? "AT_RISK"
    : input.activeSprints > 0 ? "ON_TRACK"
    : "NOT_STARTED";

  // ── On-time probability ───────────────────────────────────────────────
  // Based on SPI trend and days remaining
  const onTrackProbability = Math.max(0, Math.min(100, Math.round(
    spi >= 1.0 ? 90 :
    spi >= 0.95 ? 75 :
    spi >= 0.85 ? 55 :
    spi >= 0.70 ? 35 :
    spi >= 0.50 ? 20 : 10
  )));

  // ── Alerts ────────────────────────────────────────────────────────────
  const alerts: HealthAlert[] = [];

  // SPI alerts
  if (forecastMode === "overdue")
    alerts.push({ id: "overdue", level: "critical", category: "schedule",
      title: "Project is overdue",
      detail: `Deadline was ${Math.abs(daysLeft)} days ago. SPI=${spi.toFixed(2)}. ${100-progressNominal}% work remaining.`,
      action: `Immediate escalation. Renegotiate deadline or cut ${Math.round((100-progressNominal)*0.3)}% of remaining scope.`,
      impact: "high" });
  else if (spi < 0.5)
    alerts.push({ id: "spi-critical", level: "critical", category: "schedule",
      title: `Critical schedule deviation (SPI: ${spi.toFixed(2)})`,
      detail: `Only ${progressNominal}% complete vs ${plannedPct}% planned. Project is severely behind schedule.`,
      action: "Emergency scope review required. Consider project reset or timeline extension.",
      impact: "high" });
  else if (spi < 0.8)
    alerts.push({ id: "spi-warning", level: "warning", category: "schedule",
      title: `Behind schedule (SPI: ${spi.toFixed(2)})`,
      detail: `Schedule Variance: ${sv > 0 ? "+" : ""}${Math.round(sv > 0 ? sv : Math.abs(sv))} — ${progressNominal}% done vs ${plannedPct}% planned.`,
      action: "Review sprint velocity and remove blockers. Consider scope reduction.",
      impact: "medium" });

  // CPI alerts
  if (bac > 0) {
    if (cpi < 0.7)
      alerts.push({ id: "cpi-critical", level: "critical", category: "budget",
        title: `Critical cost overrun (CPI: ${cpi.toFixed(2)})`,
        detail: `EAC: $${Math.round(eac).toLocaleString()} vs BAC: $${Math.round(bac).toLocaleString()}. VAC: -$${Math.round(Math.abs(vac)).toLocaleString()}.`,
        action: "Freeze non-essential spending. Escalate to finance. Review resource costs.",
        impact: "high" });
    else if (cpi < 0.9)
      alerts.push({ id: "cpi-warning", level: "warning", category: "budget",
        title: `Cost overrun risk (CPI: ${cpi.toFixed(2)})`,
        detail: `Estimate at Completion: $${Math.round(eac).toLocaleString()} vs budget $${Math.round(bac).toLocaleString()}.`,
        action: "Review resource allocation. Reduce overtime. Monitor weekly.",
        impact: "medium" });
  }

  // TCPI alert — effort required to complete on budget
  if (bac > 0 && tcpi > 1.2)
    alerts.push({ id: "tcpi", level: "warning", category: "budget",
      title: `High completion effort required (TCPI: ${tcpi.toFixed(2)})`,
      detail: `Must perform ${Math.round((tcpi-1)*100)}% more efficiently than to date to finish within budget.`,
      action: "Revise budget estimate or find efficiency improvements immediately.",
      impact: "medium" });

  // Blocked features
  if (input.blockedFeatures >= 3)
    alerts.push({ id: "blocked-critical", level: "critical", category: "scope",
      title: `${input.blockedFeatures} features blocked`,
      detail: "Multiple blocked features indicate systemic dependency issues reducing SPI.",
      action: "Hold emergency dependency review. Assign owners to each blocker.",
      impact: "high" });
  else if (input.blockedFeatures > 0)
    alerts.push({ id: "blocked-warning", level: "warning", category: "scope",
      title: `${input.blockedFeatures} feature${input.blockedFeatures > 1 ? "s" : ""} blocked`,
      detail: "Blocked tasks reducing sprint velocity and schedule performance.",
      action: "Resolve blockers before next sprint planning.",
      impact: "medium" });

  // Time-progress misalignment (for short projects without EVM data)
  if (forecastMode === "time_vs_progress" && scheduleGap < -30)
    alerts.push({ id: "time-progress", level: "critical", category: "progress",
      title: "Severe time-progress misalignment",
      detail: `${plannedPct}% of timeline elapsed but only ${progressNominal}% complete. Gap: ${Math.abs(scheduleGap)}pp.`,
      action: "Immediate scope review. Assign dedicated resources to close the gap.",
      impact: "high" });

  // Risk alerts
  if (input.highRisks > 0)
    alerts.push({ id: "high-risks", level: "warning", category: "risk",
      title: `${input.highRisks} high-impact risk${input.highRisks > 1 ? "s" : ""} open`,
      detail: "Unmitigated high risks threaten schedule and budget performance.",
      action: "Assign mitigation owners and set resolution deadlines this sprint.",
      impact: "high" });

  // Overload
  if (overloaded)
    alerts.push({ id: "overloaded", level: "warning", category: "resources",
      title: `Team overloaded at ${utilization}%`,
      detail: "Sustained overload reduces quality, increases burnout and CPI degradation.",
      action: "Redistribute tasks or extend timeline by 10-15%.",
      impact: "medium" });

  // Insufficient data notice
  if (forecastMode === "insufficient")
    alerts.push({ id: "insufficient-data", level: "info", category: "progress",
      title: "Insufficient data for EVM forecast",
      detail: `Need at least 2 completed sprints. Currently ${input.doneSprints} done.`,
      action: "Continue monitoring. EVM forecast available after sprint 2.",
      impact: "low" });

  // All good
  if (alerts.length === 0)
    alerts.push({ id: "healthy", level: "success", category: "progress",
      title: "Project health is good",
      detail: `SPI: ${spi.toFixed(2)} | CPI: ${cpi > 0 ? cpi.toFixed(2) : "N/A"} | Score: ${healthScore}/100`,
      action: "Continue monitoring. Schedule next review in 1 week.",
      impact: "low" });

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

// ── Status metadata ───────────────────────────────────────────────────────
export const HEALTH_STATUS_META: Record<HealthStatus, { label: string; color: string; bg: string; border: string }> = {
  ON_TRACK:    { label: "On Track",    color: "#059669", bg: "#ECFDF5", border: "#A7F3D0" },
  AT_RISK:     { label: "At Risk",     color: "#D97706", bg: "#FFFBEB", border: "#FDE68A" },
  OFF_TRACK:   { label: "Off Track",   color: "#DC2626", bg: "#FEF2F2", border: "#FECACA" },
  COMPLETED:   { label: "Completed",   color: "#2563EB", bg: "#EFF6FF", border: "#BFDBFE" },
  NOT_STARTED: { label: "Not Started", color: "#64748B", bg: "#F8FAFC", border: "#E2E8F0" },
};

export const BUDGET_RISK_META: Record<BudgetRisk, { color: string; label: string }> = {
  none:     { color: "#059669", label: "On Budget"    },
  low:      { color: "#059669", label: "Slightly Over" },
  medium:   { color: "#D97706", label: "At Risk"      },
  high:     { color: "#EA580C", label: "Over Budget"  },
  critical: { color: "#DC2626", label: "Critical"     },
};