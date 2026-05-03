import type { OrchestratorEvent } from "./types";

// Agent IDs must match the agentId returned by each runXxxAgent()
export type AgentId =
  | "evm-agent"
  | "risk-agent"
  | "alert-agent"
  | "knowledge-agent"
  | "dependency-agent"
  | "forecast-agent"
  | "report-agent"
  | "methodology-agent";

export interface RoutingRule {
  // Group 1 runs first (parallel), then Group 2, then Group 3
  group1: AgentId[];  // data agents (EVM, Risk)
  group2: AgentId[];  // analysis agents (Dependency, Forecast, Methodology)
  group3: AgentId[];  // output agents (Alert, Report, Knowledge)
}

export const EVENT_ROUTING: Record<OrchestratorEvent, RoutingRule> = {
  project_created: {
    group1: ["evm-agent"],
    group2: [],
    group3: ["knowledge-agent"],
  },
  feature_updated: {
    group1: ["evm-agent"],
    group2: [],
    group3: ["knowledge-agent"],
  },
  feature_blocked: {
    group1: ["evm-agent", "risk-agent"],
    group2: ["dependency-agent"],
    group3: ["knowledge-agent"],
  },
  sprint_activated: {
    group1: ["evm-agent"],
    group2: [],
    group3: [],
  },
  sprint_closed: {
    group1: ["evm-agent"],
    group2: ["forecast-agent", "methodology-agent"],
    group3: ["report-agent", "knowledge-agent"],
  },
  budget_updated: {
    group1: ["evm-agent"],
    group2: [],
    group3: ["knowledge-agent"],
  },
  risk_added: {
    group1: ["risk-agent"],
    group2: [],
    group3: ["knowledge-agent"],
  },
  scope_changed: {
    group1: ["evm-agent"],
    group2: [],
    group3: ["knowledge-agent"],
  },
  project_completed: {
    group1: ["evm-agent"],
    group2: [],
    group3: ["report-agent", "knowledge-agent"],
  },
  ambient_message: {
    group1: [],
    group2: [],
    group3: ["knowledge-agent"],
  },
  daily_sweep: {
    group1: ["evm-agent", "risk-agent"],
    group2: ["dependency-agent", "forecast-agent"],
    group3: ["knowledge-agent"],
  },
  weekly_sweep: {
    group1: ["evm-agent", "risk-agent"],
    group2: ["forecast-agent", "methodology-agent"],
    group3: ["report-agent", "knowledge-agent"],
  },
};
