# MCP Agent — Ambient Intelligence Ingestion

The MCP (Model Context Protocol) Agent is the external-signal ingestion layer of RoadmapAI. It allows any external system — Slack, Jira, Gmail, Zoom, GitHub, Linear — to push events into the platform. Claude classifies each event, identifies the relevant project, and automatically applies changes to the project data without any human intervention.

---

## Concept

Traditional project management tools require humans to manually update task statuses, log risks, and enter blockers. The MCP agent inverts this: external signals are pushed in and intelligence is extracted automatically.

A Slack message saying _"the database migration is still failing, we might miss Friday"_ becomes:
- An `AmbientMessage` stored in the org's ingestion log
- A blocker risk created on the relevant project
- A Guardian AI re-analysis triggered
- Optionally, a `feature.blocked` domain event emitted

No human touched the PM tool.

---

## Architecture

```
External system (Slack bot, Jira webhook, etc.)
  │
  └─ POST /api/mcp/ingest
       │   Authorization: Bearer rmai_<org-api-key>
       │
       ├─ getApiAuth(req) → validate key → resolve org
       ├─ orgId cross-check (body.orgId must match key's org)
       │
       └─ For each event:
            processIncomingMessage()
              ├─ detectProject()     ← Claude identifies project from text
              ├─ Store AmbientMessage (always, regardless of confidence)
              └─ applyIntelligence() ← if confidence ≥ 0.6
                   ├─ Create risks
                   ├─ Change feature statuses
                   ├─ Create BLOCKED markers
                   └─ triggerGuardian() → re-analysis
```

Source: `src/lib/ingestion-engine.ts`, `src/app/api/mcp/ingest/route.ts`

---

## Authentication

MCP routes are **not** protected by Clerk. They are listed in the public middleware matcher and authenticate via Bearer token:

```
Authorization: Bearer rmai_Su1Bs8Q_1HTL0MsUUhy2-MsVRidCahcM
```

The token is validated against `Organisation.apiKey`. The `orgId` field in the request body is additionally checked to prevent cross-org injection.

**Get your API key:** Settings → Integrations → API Key section.  
**Regenerate:** `POST /api/settings/api-key` (Admin only).

---

## Request Format

```json
POST /api/mcp/ingest
Authorization: Bearer rmai_<key>
Content-Type: application/json

{
  "orgId":  "org_cuid",
  "source": "slack",
  "events": [
    {
      "type":       "message",
      "content":    "Alpha project DB migration failing, may miss Friday deadline.",
      "source":     "dev-channel",
      "confidence": 0.9,
      "metadata":   { "channel": "C04ABC", "ts": "1714220400.000100" }
    }
  ]
}
```

| Field | Required | Description |
|-------|----------|-------------|
| `orgId` | yes | Organisation CUID — must match API key |
| `source` | yes | Source system: `jira`, `slack`, `gmail`, `zoom`, `teams`, `linear`, `github`, `custom` |
| `events` | yes | Array of one or more event objects |
| `events[].type` | yes | `message`, `email`, `ticket_update`, `transcript`, `custom` |
| `events[].content` | yes | Raw text content — this is what Claude reads |
| `events[].source` | no | Sender name or channel identifier |
| `events[].confidence` | no | Pre-computed confidence 0–1; if omitted Claude estimates it |
| `events[].metadata` | no | Arbitrary JSON stored with the AmbientMessage |

---

## Response

```json
{
  "ok":              true,
  "processed":       3,
  "projectsUpdated": ["proj_cldabc123"],
  "alertsCreated":   1
}
```

---

## Intelligence Application

When `confidence >= 0.6`, `applyIntelligence()` may:

| Action | When |
|--------|------|
| Create a `Risk` record | Signal mentions a threat, blocker, or problem |
| Change a feature's status to `BLOCKED` | Signal explicitly mentions a blocker |
| Trigger Guardian re-analysis | Any applied change (always) |
| Emit `feature.blocked` domain event | Status changed to BLOCKED → outbox → BullMQ |

When `confidence < 0.6`, the message is stored as an `AmbientMessage` only — no mutations are made.

---

## Supported Sources

| `source` value | Use case |
|---------------|----------|
| `slack` | Team chat, dev channels, standup bots |
| `jira` | Ticket updates, sprint changes, comments |
| `gmail` | Client emails, stakeholder feedback |
| `zoom` | Meeting transcripts (paste or auto-transcribe) |
| `teams` | Microsoft Teams messages |
| `linear` | Issue tracker updates |
| `github` | PR comments, CI failure notifications |
| `custom` | Any other source (catch-all) |

---

## Schema Endpoint

`GET /api/mcp/schema` returns server capabilities — no auth required. Used by MCP-compatible agent frameworks to discover available endpoints.

```json
{
  "name":    "RoadmapAI MCP Server",
  "version": "1.0.0",
  "endpoints": {
    "ingest": "POST /api/mcp/ingest",
    "schema": "GET /api/mcp/schema"
  },
  "supportedSources": ["jira", "gmail", "slack", "zoom", "teams", "linear", "github", "custom"],
  "eventTypes":       ["message", "email", "ticket_update", "transcript", "custom"],
  "authentication": {
    "type": "Bearer",
    "description": "Use your organisation API key from Settings > Integrations"
  }
}
```

---

## Ingestion Log

All `AmbientMessage` records are visible in **Settings → Integrations → Ingestion Log** (last 20 events). Each entry shows the source, platform, project detected, confidence score, and whether intelligence was applied.

API: `GET /api/settings/ingestion-log`

---

## Integration Example — Slack Bot

```bash
curl -X POST https://your-domain.com/api/mcp/ingest \
  -H "Authorization: Bearer rmai_<your-key>" \
  -H "Content-Type: application/json" \
  -d '{
    "orgId":  "org_2xYz9abc",
    "source": "slack",
    "events": [{
      "type":    "message",
      "content": "Just got off a call with the client — they want to add SSO to the Alpha project scope. That is going to push us back at least a week.",
      "source":  "pm-channel"
    }]
  }'
```

Result: Claude identifies the Alpha project, creates a scope-change risk, triggers Guardian, which then updates the health score and raises an `AT_RISK` alert.

---

## Source Files

| File | Role |
|------|------|
| `src/lib/ingestion-engine.ts` | `processIncomingMessage()`, `applyIntelligence()`, `detectProject()` |
| `src/app/api/mcp/ingest/route.ts` | POST handler — auth, batching, response |
| `src/app/api/mcp/schema/route.ts` | GET schema — unauthenticated |
| `src/app/api/settings/api-key/route.ts` | Key management (GET + POST regenerate) |
| `src/app/api/settings/ingestion-log/route.ts` | Last 20 AmbientMessages |
| `src/app/(app)/settings/integrations/` | UI for API key + ingestion log |
