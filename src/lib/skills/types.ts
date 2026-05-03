export interface Skill {
  id: string;
  name: string;
  description: string;
  version: string;
  triggers: string[];
}

export interface AgentContext {
  projectId: string;
  orgId: string;
  meta?: Record<string, unknown>;
}

export interface AgentResult {
  success: boolean;
  agentId: string;
  alertsCreated?: number;
  message?: string;
  data?: unknown;
}
