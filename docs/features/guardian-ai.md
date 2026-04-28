# Guardian AI

Guardian AI is the autonomous project intelligence engine in RoadmapAI. It analyses each project's full state using an agentic Claude loop, produces a structured health report, and surfaces prioritised alerts and recommendations to the PM — without any manual input.

---

## What It Produces

For each project, Guardian outputs a `GuardianProjectReport`:

| Field | Description |
|-------|-------------|
| `healthScore` | 0–100 weighted score (schedule 35%, cost 30%, scope 20%, risk 15%) |
| `progressReal` | AI-estimated true completion % (accounts for feature complexity) |
| `progressNominal` | Raw features-done / features-total |
| `onTrackProbability` | % chance of on-time delivery |
| `riskLevel` | `low` / `medium` / `high` / `critical` |
| `estimatedDelay` | Projected delay in days |
| `budgetRisk` | `none` / `low` / `medium` / `high` |
| `alerts` | Categorised alerts with level, title, detail, and recommended action |
| `recommendations` | Prioritised action list for the PM |

---

## Alert Categories

| Category | What triggers it |
|----------|-----------------|
| `schedule` | SPI below threshold, upcoming deadline with low progress |
| `budget` | CPI below threshold, actual cost approaching or exceeding budget |
| `resources` | Team underutilised, no assignments on active features |
| `scope` | Backlog growth, uncategorised features, missing module labels |
| `risk` | Open HIGH/CRITICAL risks with no mitigation |
| `progress` | No feature updates in the last N days, stalled sprints |
| `governance` | Missing documentation, no risks recorded on a complex project |

Alert levels: `critical` → `warning` → `info` → `success`

---

## How It Runs

### Trigger

`triggerGuardian(projectId, projectName)` is the entry point. It is always fire-and-forget — the caller does not wait.

```
triggerGuardian()
  └─ Redis available?
       ├─ YES → enqueueGuardianRun() → BullMQ job → apps/worker processes it
       └─ NO  → analyzeProject() directly in-process (synchronous Claude call)
```

### Deduplication

A 24-hour dedup window prevents re-running Guardian on the same project more than once per day unless forced. This is checked before enqueuing.

### Agentic Loop

The Guardian agent runs a multi-step Claude loop:

1. **Load context** — full project data: sprints, features, risks, assignments, EVM metrics, recent activity
2. **Initial analysis** — Claude reasons about health across all categories
3. **Tool calls** — Claude may call internal tools to fetch additional detail (sprint breakdowns, risk details)
4. **Refinement** — Claude updates its assessment based on tool results
5. **Report generation** — Final structured `GuardianProjectReport` output

Source: `src/lib/guardian-agent.ts` (agentic loop), `src/lib/guardian.ts` (types and `analyzeProject`), `apps/worker/src/processors/guardian.ts` (BullMQ processor).

### Storage

The report is upserted into `GuardianReport` (one record per project). The last report is served by:

```
GET /api/guardian/[projectId]   (2-hour Next.js cache)
POST /api/guardian/[projectId]/trigger   (force re-run, bypasses cache)
```

---

## Automatic Triggers

Guardian runs automatically on these events (via `triggerAgents()`):

| Event | Source |
|-------|--------|
| Project created | `POST /api/projects` |
| Feature status changed | `PATCH /api/features/[id]` (when status changes) |
| Risk added or updated | `POST /api/projects/[id]/risks` |
| Ambient message applied | `POST /api/mcp/ingest` (when intelligence is applied) |
| Snapshot created | `POST /api/projects/[id]/snapshots` |

Non-status feature mutations (title, notes, assignee) call `triggerGuardian()` directly without going through `triggerAgents()`.

---

## Chat Interface

Users can interact with Guardian AI directly through the chat panel (✦ button in the topbar). The chat uses `claude-haiku-4-5` for fast responses and has access to:
- Current project context
- Guardian report for the active project
- EVM metrics
- Risk registry

API: `POST /api/v1/ai/chat` — supports tool use including `update_ui_config`.

---

## Reading the Report in the UI

The Guardian report appears in two places:

1. **Project page** — health score badge, risk level pill, recommendations panel, and per-category alert list
2. **Portfolio page** — aggregated health across all projects; `OFF_TRACK` projects highlighted in red

The `healthStatus` value on portfolio rows is derived from `calculateHealth()` (the EVM engine), not directly from the Guardian report. Guardian provides richer narrative; the EVM engine provides the authoritative numeric score.

---

## Source Files

| File | Role |
|------|------|
| `src/lib/guardian.ts` | Types, `analyzeProject()` (direct Claude call) |
| `src/lib/guardian-agent.ts` | Agentic multi-step loop |
| `src/lib/guardian-trigger.ts` | `triggerGuardian()` — enqueue or run in-process |
| `src/lib/agent-triggers.ts` | `triggerAgents()` — event router |
| `apps/worker/src/processors/guardian.ts` | BullMQ job processor |
| `src/app/api/guardian/[projectId]/route.ts` | GET (cached report) |
| `src/app/api/guardian/[projectId]/trigger/route.ts` | POST (force re-run) |
| `src/lib/health.ts` | `calculateHealth()` — EVM engine (used as input to Guardian) |
