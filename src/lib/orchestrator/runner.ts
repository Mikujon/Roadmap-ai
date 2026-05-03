import type { AgentContext, AgentResult } from "@/lib/skills/types";
import { runEVMAgent }         from "@/lib/skills/evm-skill";
import { runRiskAgent }        from "@/lib/skills/risk-skill";
import { runKnowledgeAgent }   from "@/lib/skills/knowledge-skill";
import { runDependencyAgent }  from "@/lib/skills/dependency-skill";
import { runForecastAgent }    from "@/lib/skills/forecast-skill";
import { runReportAgent }      from "@/lib/skills/report-skill";
import { runMethodologyAgent } from "@/lib/skills/methodology-skill";
import type { AgentId } from "./routing";
import type { AgentRunResult } from "./types";

// Maps agentId → the function that runs it
const AGENT_REGISTRY: Record<AgentId, (ctx: AgentContext) => Promise<AgentResult>> = {
  "evm-agent":         runEVMAgent,
  "risk-agent":        runRiskAgent,
  "knowledge-agent":   runKnowledgeAgent,
  "dependency-agent":  runDependencyAgent,
  "forecast-agent":    runForecastAgent,
  "report-agent":      runReportAgent,
  "methodology-agent": runMethodologyAgent,
  // alert-agent is handled inline by EVM and Risk agents
  "alert-agent": async (_ctx) => ({
    agentId: "alert-agent",
    success: true,
    actionsPerformed: [],
    alertsCreated: 0,
  }),
};

export async function runAgent(
  agentId: AgentId,
  ctx: AgentContext
): Promise<AgentRunResult> {
  const start  = Date.now();
  const runner = AGENT_REGISTRY[agentId];

  if (!runner) {
    return {
      agentId,
      success: false,
      durationMs: 0,
      actionsPerformed: [],
      alertsCreated: 0,
      error: `No runner registered for agent: ${agentId}`,
    };
  }

  try {
    const result = await runner(ctx);
    return {
      agentId:          result.agentId,
      success:          result.success,
      actionsPerformed: result.actionsPerformed ?? [],
      alertsCreated:    result.alertsCreated    ?? 0,
      durationMs:       Date.now() - start,
      error:            result.error,
    };
  } catch (error) {
    console.error(`[orchestrator] agent ${agentId} threw:`, error);
    return {
      agentId,
      success: false,
      durationMs: Date.now() - start,
      actionsPerformed: [],
      alertsCreated: 0,
      error: String(error),
    };
  }
}

export async function runAgentGroup(
  agents: AgentId[],
  ctx: AgentContext
): Promise<AgentRunResult[]> {
  if (agents.length === 0) return [];
  // All agents in a group run in parallel
  return Promise.all(agents.map(id => runAgent(id, ctx)));
}
