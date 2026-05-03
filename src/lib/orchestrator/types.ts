export type OrchestratorEvent =
  | "project_created"
  | "feature_updated"
  | "feature_blocked"
  | "sprint_activated"
  | "sprint_closed"
  | "budget_updated"
  | "risk_added"
  | "scope_changed"
  | "project_completed"
  | "ambient_message"
  | "daily_sweep"
  | "weekly_sweep";

export interface OrchestratorContext {
  event: OrchestratorEvent;
  projectId: string;
  orgId: string;
  userId?: string;
  meta?: Record<string, unknown>;
}

export interface AgentRunResult {
  agentId: string;
  success: boolean;
  durationMs: number;
  actionsPerformed: string[];
  alertsCreated: number;
  error?: string;
}

export interface OrchestratorResult {
  event: OrchestratorEvent;
  projectId: string;
  orgId: string;
  agentsRun: AgentRunResult[];
  totalAlerts: number;
  totalActions: number;
  durationMs: number;
  completedAt: string;
}
