import type { AgentContext, AgentResult } from "./types";

export async function runEVMAgent(_ctx: AgentContext): Promise<AgentResult> {
  return { success: true, agentId: "evm-agent", actionsPerformed: [], alertsCreated: 0 };
}
