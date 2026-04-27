# triggerAgents

**File:** `src/lib/agent-triggers.ts`

Dispatches background sub-agents in response to application events. The function is synchronous and returns `void` — it launches agents fire-and-forget using `Promise.allSettled()` internally so a failing agent never crashes the caller.

## Signature

```typescript
function triggerAgents(
  event:     AgentEvent,
  projectId: string,
  orgId:     string,
): void
```

## Supported Events

| Event | Agents Triggered |
|-------|-----------------|
| `project_created` | Guardian analysis, default alert scan |
| `project_updated` | Guardian analysis |
| `feature_updated` | Guardian analysis, alert scan |
| `risk_added` | Guardian analysis, risk monitor |
| `sprint_completed` | Guardian analysis, PM summary |
| `budget_alert` | Alert engine, risk monitor |
| `guardian_requested` | Guardian analysis (forced refresh) |
| `daily_sweep` | All agents — full portfolio sweep |

## Sub-Agents

| Agent | What It Does |
|-------|-------------|
| **guardian** | Runs `analyzeProject()` or enqueues `runGuardianAgent()` via BullMQ |
| **closure** | Generates closure report when project reaches CLOSED status |
| **alert** | Calls `runHealthCheck()` from `alert-engine.ts` to create/resolve alerts |
| **pm** | Produces a PMO-level sprint summary after a sprint completes |
| **risk_monitor** | Scans open risks, escalates critical ones |
| **daily_sweep** | Calls `runDailySweep()` from `@/lib/guardian-pm` for all org projects |

## Deduplication

Each agent dispatch is guarded by a 24-hour deduplication window. The system checks a `lastRun` map (in-memory per process) before invoking an agent. If the same `(event, projectId, agentType)` combination ran within the last 24 hours, the call is skipped silently. This prevents alert spam after rapid-fire feature updates.

## Usage

```typescript
import { triggerAgents } from "@/lib/agent-triggers";

// After creating a project — non-blocking
triggerAgents("project_created", project.id, ctx.org.id);

// After updating a feature — fire and forget
triggerAgents("feature_updated", feature.projectId, ctx.org.id);
```

## BullMQ / Redis Fallback

When `process.env.REDIS_URL` is set, the guardian agent is dispatched via `triggerGuardian()` from `src/lib/guardian-trigger.ts`, which enqueues a BullMQ job in the `@roadmap/queue` package. When Redis is not available (local dev without Redis), it calls `analyzeProject()` directly in-process. The fallback is silent — no error is thrown.

## Error Handling

All agent invocations are wrapped in individual try/catch blocks inside `Promise.allSettled()`. A failing agent logs to `console.error` but does not affect other agents or the calling request.
