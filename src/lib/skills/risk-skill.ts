import type { AgentContext, AgentResult } from "./types";

export async function runRiskAgent(_ctx: AgentContext): Promise<AgentResult> {
  return { success: true, agentId: "risk-agent", actionsPerformed: [], alertsCreated: 0 };
}
