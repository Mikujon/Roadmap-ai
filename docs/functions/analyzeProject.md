# analyzeProject / Guardian AI

**File:** `src/lib/guardian.ts`, `src/lib/guardian-agent.ts`

The Guardian AI system analyzes individual projects and the full portfolio. It combines deterministic metric calculation with Claude AI to produce actionable insights, recommendations, and risk flags. The health score is always sourced from `calculateHealth()` — Claude never invents it.

## analyzeProject

```typescript
async function analyzeProject(projectId: string, orgId: string): Promise<void>
```

Fetches the full project from the database, computes EVM metrics via `calculateProjectMetrics()`, runs a rule-based pre-screen via `generateRuleBasedReport()`, then calls Claude with a structured prompt to produce a `GuardianReport` which is upserted to the database.

### Flow

```
DB fetch → calculateProjectMetrics() → generateRuleBasedReport() → Claude API → upsert GuardianReport
```

### calculateProjectMetrics

Internal helper that queries sprints, features, assignments, and risks for a project, then calls `calculateHealth()` to produce the full EVM report. Returns `ProjectMetrics` — the same shape as `HealthReport` with additional raw counts.

### generateRuleBasedReport

Produces a fast, deterministic insight string without any AI calls. Used as a fallback and as context for the Claude prompt so the AI can focus on interpretation rather than calculation.

### AI Model

`claude-sonnet-4-5` (overridable via `process.env.ANTHROPIC_MODEL`)

### Output Written to DB

The function upserts a `GuardianReport` record with:
- `healthScore` — from `calculateHealth()`, not from Claude
- `healthStatus` — "ON_TRACK" | "AT_RISK" | "OFF_TRACK"
- `insight` — 2–3 sentence AI-generated summary
- `recommendation` — specific next action
- `riskFlag` — boolean, true if project needs immediate attention
- `confidence` — 0–1 AI confidence score
- `alertCount` — number of active alerts detected
- `generatedAt` — timestamp

---

## runGuardianAgent

**File:** `src/lib/guardian-agent.ts`

```typescript
async function runGuardianAgent(projectId: string, orgId: string): Promise<GuardianReportData>
```

An agentic loop (max 5 iterations) that gives Claude access to 7 database query tools. Claude selects which tools to call, inspects the results, and repeats until it has enough context to produce a final report. Replaces `analyzeProject()` when Redis/BullMQ is available and the worker processes the queue job.

### Available Tools

| Tool | What It Returns |
|------|----------------|
| `get_project_metrics` | EVM metrics, health score, SPI/CPI |
| `get_status_history` | `ProjectStatusLog` entries in chronological order |
| `get_risk_assessment` | Open risks sorted by score, mitigations |
| `get_team_performance` | Assignment hours, utilization per resource |
| `get_sprint_velocity` | Feature completion rate per sprint |
| `get_snapshot_comparison` | Diff between two project snapshots |
| `get_dependency_graph` | Blocked features and their blockers |

### Health Score Rule

The `healthScore` in the final output is always the value returned by `calculateHealth()`, retrieved via `get_project_metrics`. Claude cannot override or invent this number — it can only interpret it.

---

## analyzePortfolio

**File:** `src/lib/guardian.ts`

```typescript
async function analyzePortfolio(orgId: string): Promise<PortfolioReport>
```

Runs `calculateProjectMetrics()` for all active projects in the org, aggregates portfolio-level EVM (average SPI/CPI, total budget exposure, off-track count), and calls Claude once to produce a portfolio-level narrative and risk summary.

---

## Error Handling

All three functions are designed to be called from fire-and-forget contexts. They `throw` on unrecoverable errors (DB down, auth failure) but the callers (`triggerAgents`, `enqueueGuardianRun`) catch these via `Promise.allSettled()` or `.catch()`.

---

## Guardian Report Cache

`GET /api/guardian/[projectId]` returns cached `GuardianReport` if it is less than 2 hours old. On a cache miss it enqueues a fresh BullMQ job and returns stale data immediately (stale-while-revalidate pattern).
