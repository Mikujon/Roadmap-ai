import type { OrchestratorContext, OrchestratorResult, OrchestratorEvent } from "./types";
import type { AgentRunResult } from "./types";
import type { AgentContext } from "@/lib/skills/types";
import { EVENT_ROUTING } from "./routing";
import { runAgentGroup } from "./runner";
import { db } from "@/lib/prisma";

/**
 * Main orchestrator entry point.
 * Call this INSTEAD of triggerAgents() going forward.
 * Fire-and-forget: never blocks the HTTP response.
 */
export function orchestrate(
  event: OrchestratorEvent,
  projectId: string,
  orgId: string,
  meta?: Record<string, unknown>
): void {
  // Fire and forget — never awaited by the caller
  _runOrchestration({ event, projectId, orgId, meta })
    .catch(err =>
      console.error(`[orchestrator] unhandled error event=${event} project=${projectId}:`, err)
    );
}

async function _runOrchestration(ctx: OrchestratorContext): Promise<OrchestratorResult> {
  const start   = Date.now();
  const routing = EVENT_ROUTING[ctx.event];

  if (!routing) {
    console.warn(`[orchestrator] no routing for event: ${ctx.event}`);
    return _emptyResult(ctx, start);
  }

  // Build AgentContext (compatible with existing skills)
  const agentCtx: AgentContext = {
    event:     ctx.event,
    projectId: ctx.projectId,
    orgId:     ctx.orgId,
    userId:    ctx.userId ?? (ctx.meta?.userId as string | undefined),
    meta:      ctx.meta,
  };

  const allResults: AgentRunResult[] = [];

  // Run groups sequentially — each group runs in parallel internally
  const g1 = await runAgentGroup(routing.group1, agentCtx);
  allResults.push(...g1);

  const g2 = await runAgentGroup(routing.group2, agentCtx);
  allResults.push(...g2);

  const g3 = await runAgentGroup(routing.group3, agentCtx);
  allResults.push(...g3);

  const result: OrchestratorResult = {
    event:        ctx.event,
    projectId:    ctx.projectId,
    orgId:        ctx.orgId,
    agentsRun:    allResults,
    totalAlerts:  allResults.reduce((s, r) => s + r.alertsCreated, 0),
    totalActions: allResults.reduce((s, r) => s + r.actionsPerformed.length, 0),
    durationMs:   Date.now() - start,
    completedAt:  new Date().toISOString(),
  };

  // Log orchestration result
  _logResult(result).catch(() => {});

  return result;
}

async function _logResult(result: OrchestratorResult): Promise<void> {
  try {
    await db.activity.create({
      data: {
        projectId:      result.projectId,
        organisationId: result.orgId,
        userId:         "guardian-ai",
        userName:       "Guardian AI",
        action:         "ORCHESTRATION_COMPLETE",
        entity:         "project",
        entityId:       result.projectId,
        entityName:     result.projectId,
        meta: {
          event:        result.event,
          agentsRun:    result.agentsRun.map(r => r.agentId),
          totalAlerts:  result.totalAlerts,
          totalActions: result.totalActions,
          durationMs:   result.durationMs,
          failed:       result.agentsRun.filter(r => !r.success).map(r => r.agentId),
        },
      },
    });
  } catch {
    // Non-fatal — logging failure should never crash the orchestrator
  }
}

function _emptyResult(ctx: OrchestratorContext, start: number): OrchestratorResult {
  return {
    event:        ctx.event,
    projectId:    ctx.projectId,
    orgId:        ctx.orgId,
    agentsRun:    [],
    totalAlerts:  0,
    totalActions: 0,
    durationMs:   Date.now() - start,
    completedAt:  new Date().toISOString(),
  };
}

// Re-export types for convenience
export type { OrchestratorEvent, OrchestratorContext, OrchestratorResult } from "./types";
