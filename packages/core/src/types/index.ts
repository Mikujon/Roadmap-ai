// ── Domain Types — @roadmap/core ─────────────────────────────────────────────
// Single source of truth for all domain entities across the monorepo.
// Every type is derived from Zod schemas defined in ../schemas.

export type HealthStatus  = "ON_TRACK" | "AT_RISK" | "OFF_TRACK" | "COMPLETED" | "NOT_STARTED";
export type BudgetRisk    = "none" | "low" | "medium" | "high" | "critical";
export type RiskLevel     = "low" | "medium" | "high" | "critical";
export type AlertLevel    = "critical" | "warning" | "info" | "success";
export type AlertCategory = "schedule" | "budget" | "resources" | "scope" | "risk" | "progress" | "governance";
export type AlertImpact   = "high" | "medium" | "low";
export type FeatureStatus = "TODO" | "IN_PROGRESS" | "DONE" | "BLOCKED";
export type FeaturePriority = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
export type SprintStatus  = "UPCOMING" | "ACTIVE" | "DONE";
export type ProjectStatus = "NOT_STARTED" | "ACTIVE" | "PAUSED" | "COMPLETED" | "CLOSED" | "ARCHIVED";
export type MemberRole    = "ADMIN" | "MANAGER" | "VIEWER";

// ── EVM (Earned Value Management) types ──────────────────────────────────────
export interface EvmMetrics {
  ev:   number;  // Earned Value
  pv:   number;  // Planned Value
  ac:   number;  // Actual Cost
  bac:  number;  // Budget at Completion
  spi:  number;  // Schedule Performance Index
  cpi:  number;  // Cost Performance Index
  eac:  number;  // Estimate at Completion
  etc:  number;  // Estimate to Complete
  vac:  number;  // Variance at Completion
  sv:   number;  // Schedule Variance
  cv:   number;  // Cost Variance
  tcpi: number;  // To-Complete Performance Index
}

// ── Health Engine I/O ─────────────────────────────────────────────────────────
export interface HealthInput {
  startDate:          Date | string;
  endDate:            Date | string;
  totalFeatures:      number;
  doneFeatures:       number;
  blockedFeatures:    number;
  inProgressFeatures: number;
  totalSprints:       number;
  doneSprints:        number;
  activeSprints:      number;
  budgetTotal:        number;
  costActual:         number;
  costEstimated:      number;
  totalCapacityHours: number;
  totalActualHours:   number;
  openRisks:          number;
  highRisks:          number;
  maxRiskScore:       number;
}

export interface HealthAlert {
  id:       string;
  level:    AlertLevel;
  category: AlertCategory;
  title:    string;
  detail:   string;
  action:   string;
  impact:   AlertImpact;
}

export interface HealthReport extends EvmMetrics {
  status:           HealthStatus;
  healthScore:      number;
  progressNominal:  number;
  progressReal:     number;
  daysLeft:         number;
  delayDays:        number;
  plannedPct:       number;
  scheduleGap:      number;
  endForecast:      Date;
  forecastMode:     string;
  costForecast:     number;
  budgetDelta:      number;
  budgetRisk:       BudgetRisk;
  burnRateActual:   number;
  burnRatePlanned:  number;
  costEfficiency:   number;
  utilization:      number;
  overloaded:       boolean;
  riskLevel:        RiskLevel;
  onTrackProbability: number;
  alerts:           HealthAlert[];
}

// ── Guardian types ────────────────────────────────────────────────────────────
export interface GuardianAlert {
  id:          string;
  level:       AlertLevel;
  category:    AlertCategory;
  title:       string;
  detail:      string;
  action?:     string;
  projectId?:  string;
  projectName?: string;
}

export interface GuardianProjectReport {
  projectId:          string;
  projectName:        string;
  healthScore:        number;
  progressReal:       number;
  progressNominal:    number;
  onTrackProbability: number;
  alerts:             GuardianAlert[];
  recommendations:    string[];
  riskLevel:          RiskLevel;
  estimatedDelay:     number;
  budgetRisk:         BudgetRisk;
  summary?:           string;
  generatedAt:        string;
}

// ── Alert Engine types ────────────────────────────────────────────────────────
export interface AlertEngineResult {
  type:   string;
  level:  AlertLevel;
  title:  string;
  detail: string;
  action: string;
}

// ── Decision types (Command Center) ──────────────────────────────────────────
export interface Decision {
  id:          string;
  severity:    "critical" | "warning";
  type:        string;
  title:       string;
  detail:      string;
  projectId:   string;
  projectName: string;
  fixTab:      string;
}

// ── Project input for engines ─────────────────────────────────────────────────
export interface ProjectEngineInput {
  id:              string;
  name:            string;
  description?:    string;
  startDate:       string;
  endDate:         string;
  budgetTotal:     number;
  revenueExpected: number;
  status:          ProjectStatus;
  sprints: Array<{
    id:        string;
    num:       string;
    name:      string;
    status:    SprintStatus;
    startDate: string | null;
    endDate:   string | null;
    features:  Array<{
      id:             string;
      title:          string;
      status:         FeatureStatus;
      priority:       FeaturePriority;
      estimatedHours: number;
      actualHours:    number;
      module?:        string;
      dependsOn:      Array<{ id: string; dependsOnId: string }>;
    }>;
  }>;
  assignments: Array<{
    estimatedHours: number;
    actualHours:    number;
    resource: {
      name:          string;
      role:          string;
      costPerHour:   number;
      capacityHours: number;
    };
  }>;
  risks: Array<{
    title:       string;
    probability: number;
    impact:      number;
    status:      string;
    mitigation?: string;
  }>;
  departments: Array<{ name: string }>;
}
