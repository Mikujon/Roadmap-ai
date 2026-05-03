import type { AgentContext, AgentResult } from "./types";

export async function runKnowledgeAgent(_ctx: AgentContext): Promise<AgentResult> {
  return { success: true, agentId: "knowledge-agent", actionsPerformed: [], alertsCreated: 0 };
}
