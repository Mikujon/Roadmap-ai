# API v2 — Public Headless API

**Status:** Implemented. All endpoints live at `/api/v2/`.

---

## Authentication

Every endpoint accepts **either**:

| Method | Header | Notes |
|--------|--------|-------|
| Org API key | `Authorization: Bearer <org-api-key>` | Org API key from Settings → Integrations |
| Clerk session | Cookie (browser) | Auto-attached when called from the frontend |

---

## Standard Response Envelope

All responses use:

```json
{ "data": { ... }, "meta": { "timestamp": "...", "version": "1.0" } }
```

Errors:

```json
{ "error": { "code": "NOT_FOUND", "message": "Project not found", "status": 404 }, "meta": { ... } }
```

---

## Endpoints

### Projects

```
GET  /api/v2/projects                      — list (paginated, filterable by status)
GET  /api/v2/projects/:id                  — full project + EVM + phases + team
GET  /api/v2/projects/:id/sprints          — sprint breakdown with feature counts
GET  /api/v2/projects/:id/risks            — risk registry with scores
GET  /api/v2/projects/:id/health           — health report + EVM components + Guardian
```

#### GET /api/v2/projects

Query params: `page` (default 1), `limit` (default 20, max 100), `status` (optional: ACTIVE | ON_HOLD | COMPLETED | CLOSED | ARCHIVED)

Default excludes ARCHIVED and CLOSED.

```json
{
  "data": {
    "items": [
      {
        "id": "...", "name": "...", "status": "ACTIVE",
        "healthScore": 73, "health": "at_risk", "progress": 45,
        "budget": { "total": 100000, "spent": 45000, "forecast": 95000 },
        "schedule": { "start": "...", "end": "...", "daysLeft": 30, "delayDays": 0 },
        "spi": 0.95, "cpi": 1.02, "team": 4, "openRisks": 2,
        "activeSprint": { "name": "Sprint 3", "progress": 60 },
        "guardian": { "insight": "...", "lastAnalysis": "..." }
      }
    ],
    "total": 25, "page": 1, "limit": 20, "hasMore": true
  }
}
```

#### GET /api/v2/projects/:id/risks

Query params: `status` (optional: OPEN | MITIGATED | CLOSED | ACCEPTED)

#### GET /api/v2/projects/:id/health

Returns `healthScore`, `status`, `onTrackProbability`, full `evm` object, `components` breakdown, and `guardian` report.

---

### Portfolio

```
GET  /api/v2/portfolio   — org-level KPIs from mv_portfolio_summary
```

Returns: `totalProjects`, `activeProjects`, `completedProjects`, `onHoldProjects`, `closedProjects`, `totalBudget`, `avgHealthScore`, `atRiskProjects`, `flaggedProjects`, `openRisks`, `totalAlerts`, `refreshedAt`.

---

### Alerts

```
GET  /api/v2/alerts      — paginated alert list
```

Query params: `page`, `limit`, `status` (read | unread), `level` (critical | warning | info | success), `projectId`

---

### Ingest

```
POST /api/v2/ingest      — event ingestion (replaces /api/mcp/ingest)
```

Body:

```json
{
  "source": "slack",
  "events": [
    {
      "type": "message",
      "content": "The mobile sprint is behind schedule.",
      "sender": "alice@acme.com",
      "timestamp": "2026-05-03T10:00:00Z",
      "projectHint": "proj_abc123"
    }
  ]
}
```

Supported sources: `jira`, `gmail`, `slack`, `zoom`, `teams`, `linear`, `github`, `custom`  
Max 50 events per request.

Returns: `{ processed, projectsUpdated, alertsCreated }`

---

## Infrastructure

All utilities are in `src/lib/api/`:

- `response.ts` — `ok()`, `created()`, `noContent()`, `err()`, `Errors.*`
- `validate.ts` — `validateBody()`, `validateQuery()`, `PaginationSchema`, `IdParamSchema`
- `route-handler.ts` — `withAuth()` (Clerk only), `withApiAuth()` (Bearer + Clerk), `guard()`
- `client.ts` — type-safe frontend fetch wrapper
