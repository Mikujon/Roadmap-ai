# Projects API

Internal project management endpoints. All require session authentication via Clerk (`getAuthContext()`). Access is scoped to the authenticated user's organisation — cross-org access is blocked at the query level by always filtering on `organisationId: ctx.org.id`.

**Base path:** `/api/projects`

---

## POST /api/projects

Creates a new project with phases, sprints, and default features.

**Auth:** Any authenticated user  
**Body:**
```json
{
  "name":            "string (required)",
  "brief":           "string?",
  "startDate":       "ISO date string (required)",
  "endDate":         "ISO date string (required)",
  "budgetTotal":     "number?",
  "revenueExpected": "number?",
  "phases": [
    { "title": "string", "duration": "string", "desc": "string" }
  ]
}
```

**What it creates:**
1. `Project` record
2. If `phases` array is provided — phases from the array. Otherwise — 3 default phases: Planning, Development, QA & Launch
3. 2 sprints per phase (14-day windows, sequential dates starting from `startDate`)
4. 4 default features in Sprint 1: kickoff, requirements, architecture review, environment setup
5. Triggers `project_created` via `triggerAgents()` (fire-and-forget)

**Response:** `{ project: Project }`

---

## GET /api/projects

Lists all projects for the authenticated org including phases, sprints, features, and counts.

**Auth:** Any authenticated user  
**Response:** `Project[]` (full includes: phases, sprints with features, `_count.sprints`)

---

## GET /api/projects/[id]

Fetches a single project's full detail.

**Auth:** Any authenticated user  
**Org isolation:** Returns 404 if `id` exists but belongs to a different org  
**Response:**
```json
{
  "id": "...",
  "name": "...",
  "phases": [...],
  "sprints": [{ "features": [...], "phase": {...} }],
  "statusLogs": [...]   // last 10, newest first
}
```

---

## PATCH /api/projects/[id]

Updates project fields. Role-gated to users who can edit projects.

**Auth:** `can.editProject(role)` — PMO, ADMIN  
**Body:** Any subset of:
```json
{
  "name":            "string?",
  "description":     "string?",
  "status":          "ACTIVE | PAUSED | COMPLETED | ARCHIVED | CLOSED?",
  "budgetTotal":     "number?",
  "revenueExpected": "number?",
  "requestedById":   "string?",
  "startDate":       "ISO date?",
  "endDate":         "ISO date?",
  "statusNote":      "string?"
}
```

**Side effects on `status` change:**
- Revalidates `/dashboard`, `/portfolio`, `/cost`, `/archive` Next.js cache paths
- Writes a `ProjectStatusLog` entry
- Logs an `Activity` record (`project.status_changed`)
- If `status === "CLOSED"` → calls `generateClosureReport()` in background

**Auto-snapshot trigger:** If `endDate` or `budgetTotal` changes, fires a `POST /api/projects/[id]/snapshots` internally (non-blocking fetch).

---

## DELETE /api/projects/[id]

Hard-deletes a project and all related data (cascades defined in Prisma schema).

**Auth:** `can.deleteProject(role)` — ADMIN only

---

## GET /api/projects/[id]/risks

Returns all risks for a project ordered by probability × impact descending.

**Auth:** Any authenticated user  
**Org isolation:** Verifies project belongs to org before returning risks

---

## POST /api/projects/[id]/risks

Creates a new risk on a project.

**Auth:** `can.editRisks(role)` — PMO, ADMIN  
**Body (Zod-validated):**
```json
{
  "title":       "string (1–200 chars, required)",
  "description": "string?",
  "probability": "integer 1–5 (default 3)",
  "impact":      "integer 1–5 (default 3)",
  "mitigation":  "string?",
  "ownerId":     "string?",
  "ownerName":   "string?",
  "category":    "string?"
}
```

---

## GET /api/projects/[id]/snapshots

Lists all snapshots for a project (metadata only, no data blob).

**Auth:** Any authenticated user  
**Response:** `{ id, version, name, reason, createdBy, createdAt }[]`

---

## POST /api/projects/[id]/snapshots

Creates a point-in-time snapshot of the full project state.

**Auth:** `can.editProject(role)` — PMO, ADMIN  
**Body:** `{ "reason": "string?" }`

Captures: name, description, dates, budget, phases, sprints + features, assignments + resources, risks. Stored as JSON blob in `ProjectSnapshot.data`. Version is auto-incremented.

---

## GET /api/projects/[id]/closure-report

Returns the most recent AI-generated closure report, or `{ report: null }` if none exists.

The report is stored as a JSON string in the `note` field of a `ProjectStatusLog` where `changedBy = "AI Guardian"` and `status = "CLOSED"`.

---

## POST /api/projects/[id]/closure-report

Generates an AI closure report for the project.

**Auth:** Any authenticated user  
**Model:** `claude-sonnet-4-5`

Computes full EVM metrics, assembles a detailed prompt with timeline, scope, financials, and status history, then asks Claude to return a structured JSON report:

```json
{
  "executiveSummary":    "string",
  "deliveryStatus":      "on_time | delayed | early",
  "overallRating":       "excellent | good | fair | poor",
  "scopeDelivery":       { "pct": 0, "summary": "" },
  "schedulePerformance": { "spi": 0.0, "summary": "" },
  "costPerformance":     { "cpi": 0.0, "summary": "" },
  "lessonsLearned":      ["..."],
  "recommendations":     ["..."],
  "achievements":        ["..."],
  "risks":               ["..."]
}
```

Saves the result to `ProjectStatusLog`.

---

## GET/POST /api/guardian/[projectId]

### GET

Returns the cached `GuardianReport` for a project. Cache TTL is 2 hours.

- If fresh cache exists → returns it with `_cached: true`
- If stale cache exists → enqueues a fresh BullMQ job, returns stale with `_stale: true`
- If no cache → enqueues job, returns placeholder with `_pending: true`

Query param `?refresh=true` bypasses the cache check and always enqueues a fresh run.

### POST

Force-enqueues a Guardian analysis for the project.

**Response:** `{ ok: true, message: "Guardian analysis queued" }`
