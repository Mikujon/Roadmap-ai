// ── Domain Event Type Catalogue ───────────────────────────────────────────
// Every domain event the system can emit. Consumers (worker, analytics)
// import these types to get type-safe payloads.
// Pattern: "<aggregate>.<past-tense-verb>"

// ── Feature Events ────────────────────────────────────────────────────────
export interface FeatureStatusChangedPayload {
  featureId:    string;
  featureTitle: string;
  from:         string;
  to:           string;
  sprintId:     string;
  sprintName:   string;
}

export interface FeatureCreatedPayload {
  featureId:    string;
  featureTitle: string;
  sprintId:     string;
  priority:     string;
}

export interface FeatureBlockedPayload {
  featureId:    string;
  featureTitle: string;
  sprintId:     string;
  blockedBy?:   string;
}

// ── Sprint Events ─────────────────────────────────────────────────────────
export interface SprintStartedPayload {
  sprintId:   string;
  sprintName: string;
  sprintNum:  string;
  startDate:  string;
  endDate:    string | null;
}

export interface SprintCompletedPayload {
  sprintId:       string;
  sprintName:     string;
  featuresTotal:  number;
  featuresDone:   number;
  completionPct:  number;
}

// ── Risk Events ───────────────────────────────────────────────────────────
export interface RiskOpenedPayload {
  riskId:      string;
  riskTitle:   string;
  probability: number;
  impact:      number;
  score:       number;
  severity:    string;
}

export interface RiskMitigatedPayload {
  riskId:     string;
  riskTitle:  string;
  mitigation: string;
}

export interface RiskClosedPayload {
  riskId:    string;
  riskTitle: string;
}

// ── Project Events ────────────────────────────────────────────────────────
export interface ProjectStatusChangedPayload {
  from:   string;
  to:     string;
  reason: string | null;
}

export interface ProjectCreatedPayload {
  name:       string;
  startDate:  string;
  endDate:    string;
  budgetTotal: number;
}

export interface ProjectSnapshotTakenPayload {
  snapshotId: string;
  version:    number;
  reason:     string | null;
}

// ── Union discriminant ────────────────────────────────────────────────────
export type DomainEventType =
  | "feature.status_changed"
  | "feature.created"
  | "feature.blocked"
  | "sprint.started"
  | "sprint.completed"
  | "risk.opened"
  | "risk.mitigated"
  | "risk.closed"
  | "project.status_changed"
  | "project.created"
  | "project.snapshot_taken";

export type AggregateType = "project" | "sprint" | "feature" | "risk";

/** Base interface shared by all domain events */
export interface DomainEventBase {
  type:          DomainEventType;
  aggregateType: AggregateType;
  aggregateId:   string;
  organisationId: string;
  projectId?:    string;
  actorId?:      string;
  actorName?:    string;
  occurredAt:    string; // ISO
}

export type DomainEvent =
  | (DomainEventBase & { type: "feature.status_changed"; payload: FeatureStatusChangedPayload })
  | (DomainEventBase & { type: "feature.created";        payload: FeatureCreatedPayload })
  | (DomainEventBase & { type: "feature.blocked";        payload: FeatureBlockedPayload })
  | (DomainEventBase & { type: "sprint.started";         payload: SprintStartedPayload })
  | (DomainEventBase & { type: "sprint.completed";       payload: SprintCompletedPayload })
  | (DomainEventBase & { type: "risk.opened";            payload: RiskOpenedPayload })
  | (DomainEventBase & { type: "risk.mitigated";         payload: RiskMitigatedPayload })
  | (DomainEventBase & { type: "risk.closed";            payload: RiskClosedPayload })
  | (DomainEventBase & { type: "project.status_changed"; payload: ProjectStatusChangedPayload })
  | (DomainEventBase & { type: "project.created";        payload: ProjectCreatedPayload })
  | (DomainEventBase & { type: "project.snapshot_taken"; payload: ProjectSnapshotTakenPayload });

/** Which queue/job each event type routes to */
export const EVENT_ROUTING: Record<DomainEventType, { queue: string; jobName: string }> = {
  "feature.status_changed": { queue: "guardian",    jobName: "guardian:run" },
  "feature.created":        { queue: "guardian",    jobName: "guardian:run" },
  "feature.blocked":        { queue: "alert-sweep", jobName: "alert:sweep" },
  "sprint.started":         { queue: "guardian",    jobName: "guardian:run" },
  "sprint.completed":       { queue: "guardian",    jobName: "guardian:run" },
  "risk.opened":            { queue: "alert-sweep", jobName: "alert:sweep" },
  "risk.mitigated":         { queue: "guardian",    jobName: "guardian:run" },
  "risk.closed":            { queue: "guardian",    jobName: "guardian:run" },
  "project.status_changed": { queue: "guardian",    jobName: "guardian:run" },
  "project.created":        { queue: "guardian",    jobName: "guardian:run" },
  "project.snapshot_taken": { queue: "guardian",    jobName: "guardian:run" },
};
