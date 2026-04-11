// ── Job Type Definitions ──────────────────────────────────────────────────
// All job payloads are typed. Consumers and producers share these types.

export interface GuardianJobData {
  projectId:   string;
  projectName: string;
  /** ISO string — used for cache key stability */
  triggeredAt: string;
  /** Optionally force-refresh even if cache is warm */
  force?: boolean;
}

export interface AlertSweepJobData {
  /** If set, only sweep this project. If omitted, sweep all active projects. */
  projectId?: string;
  triggeredAt: string;
}

export interface DecisionsJobData {
  /** Array of project IDs to include in the decisions computation */
  projectIds:  string[];
  triggeredAt: string;
}

export interface MatViewRefreshJobData {
  triggeredAt: string;
  /** Optional subset of views to refresh; defaults to all */
  views?: Array<"portfolio_summary" | "sprint_velocity">;
}

export interface PartitionMaintenanceJobData {
  triggeredAt:   string;
  /** How many future months to ensure have partitions (default: 2) */
  monthsAhead?: number;
}

export type JobName =
  | "guardian:run"
  | "alert:sweep"
  | "decisions:run"
  | "matview:refresh"
  | "partition:maintain";

export type JobData =
  | GuardianJobData
  | AlertSweepJobData
  | DecisionsJobData
  | MatViewRefreshJobData
  | PartitionMaintenanceJobData;

/** Default job options — safe for all LLM-backed jobs */
export const LLM_JOB_DEFAULTS = {
  attempts:          3,
  backoff:           { type: "exponential" as const, delay: 5_000 },
  removeOnComplete:  { count: 100 },
  removeOnFail:      { count: 50 },
} as const;

/** Repeat every 2 hours for the portfolio alert sweep */
export const ALERT_SWEEP_REPEAT = {
  pattern: "0 */2 * * *",
} as const;

/** Refresh materialized views every 15 minutes */
export const MATVIEW_REFRESH_REPEAT = {
  pattern: "*/15 * * * *",
} as const;

/** Run partition maintenance once a month (1st of month at 00:05 UTC) */
export const PARTITION_MAINTAIN_REPEAT = {
  pattern: "5 0 1 * *",
} as const;
