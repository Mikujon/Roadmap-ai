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
  event?: string;
  userId?: string;
  meta?: Record<string, unknown>;
}

export interface AgentResult {
  success: boolean;
  agentId: string;
  alertsCreated?: number;
  actionsPerformed?: string[];
  message?: string;
  data?: unknown;
  error?: string;
}
