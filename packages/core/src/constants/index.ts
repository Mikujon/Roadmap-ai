// ── Domain Constants — @roadmap/core ─────────────────────────────────────────

import type { HealthStatus, BudgetRisk, AlertLevel } from "../types/index";

export const HEALTH_STATUS_META: Record<HealthStatus, {
  label:  string;
  color:  string;
  bg:     string;
  border: string;
}> = {
  ON_TRACK:    { label: "On Track",    color: "#059669", bg: "#ECFDF5", border: "#A7F3D0" },
  AT_RISK:     { label: "At Risk",     color: "#D97706", bg: "#FFFBEB", border: "#FDE68A" },
  OFF_TRACK:   { label: "Off Track",   color: "#DC2626", bg: "#FEF2F2", border: "#FECACA" },
  COMPLETED:   { label: "Completed",   color: "#2563EB", bg: "#EFF6FF", border: "#BFDBFE" },
  NOT_STARTED: { label: "Not Started", color: "#64748B", bg: "#F8FAFC", border: "#E2E8F0" },
};

export const BUDGET_RISK_META: Record<BudgetRisk, {
  color: string;
  label: string;
}> = {
  none:     { color: "#059669", label: "On Budget"     },
  low:      { color: "#059669", label: "Slightly Over" },
  medium:   { color: "#D97706", label: "At Risk"       },
  high:     { color: "#EA580C", label: "Over Budget"   },
  critical: { color: "#DC2626", label: "Critical"      },
};

export const ALERT_LEVEL_META: Record<AlertLevel, {
  color:  string;
  bg:     string;
  border: string;
  icon:   string;
}> = {
  critical: { color: "#DC2626", bg: "#FEF2F2", border: "#FECACA", icon: "🔴" },
  warning:  { color: "#D97706", bg: "#FFFBEB", border: "#FDE68A", icon: "🟡" },
  info:     { color: "#2563EB", bg: "#EFF6FF", border: "#BFDBFE", icon: "🔵" },
  success:  { color: "#059669", bg: "#ECFDF5", border: "#A7F3D0", icon: "🟢" },
};

export const RISK_SCORE_THRESHOLDS = {
  CRITICAL: 15,
  HIGH:     8,
  MEDIUM:   4,
} as const;

export const SPI_THRESHOLDS = {
  ON_TRACK:  0.95,
  AT_RISK:   0.80,
  OFF_TRACK: 0.50,
} as const;

export const CPI_THRESHOLDS = {
  HEALTHY:  0.95,
  WARNING:  0.85,
  CRITICAL: 0.70,
} as const;

export const GUARDIAN_CACHE_TTL_HOURS = 2;
export const ALERT_DEDUP_HOURS        = 24;
export const METRICS_CACHE_TTL_SEC    = 300; // 5 minutes

export const PROJECT_STATUSES_ACTIVE = ["NOT_STARTED", "ACTIVE", "PAUSED"] as const;
export const PROJECT_STATUSES_CLOSED = ["CLOSED", "ARCHIVED"] as const;
