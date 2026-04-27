# MCP Agent API

The MCP (Model Context Protocol) API allows external agents and integrations to push updates into RoadmapAI. Events from Jira, Slack, Gmail, Zoom, and other tools are ingested, classified by AI, and automatically applied to the relevant projects.

**Base path:** `/api/mcp`  
**Auth:** Bearer token (org API key)  
**Public:** Only `GET /api/mcp/schema` is unauthenticated

These routes are in the public middleware matcher and handle their own authentication — Clerk does not intercept them.

---

## GET /api/mcp/schema

Returns the server capabilities schema. No authentication required.

**Response:**
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
    "type":        "Bearer",
    "description": "Use your organisation API key from Settings > Integrations"
  }
}
```

---

## POST /api/mcp/ingest

Ingests one or more events from an external agent or integration.

**Auth:** `Authorization: Bearer rmai_<key>`

The key is validated against `Organisation.apiKey`. Additionally, the `orgId` in the request body must match the key's organisation — cross-org injection is blocked.

### Request

```json
{
  "orgId":    "org_cuid",
  "source":   "jira",
  "events": [
    {
      "type":       "ticket_update",
      "content":    "PROJ-123 moved to In Progress. Assigned to Alice. Due date: next Friday.",
      "source":     "jira-bot",
      "confidence": 0.9,
      "metadata":   { "ticketId": "PROJ-123", "priority": "HIGH" }
    }
  ]
}
```

**Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `orgId` | string | Must match the API key's organisation |
| `source` | string | Source system — used for platform mapping |
| `events` | array | One or more events to process |
| `events[].type` | string | `message`, `email`, `ticket_update`, `transcript`, `custom` |
| `events[].content` | string | The message/event text content |
| `events[].source` | string? | Sender name or identifier |
| `events[].confidence` | number? | Pre-computed confidence score (0–1) |
| `events[].metadata` | object? | Arbitrary extra data, stored with the AmbientMessage |

### Platform Mapping

| `source` value | Internal platform |
|---------------|------------------|
| `jira` | `jira` |
| `gmail` | `gmail` |
| `slack` | `slack` |
| `zoom` | `zoom` |
| `teams` | `teams` |
| `linear` | `linear` |
| `github` | `github` |
| `custom` | `telegram` (catch-all) |

### Processing

For each event:
1. `processIncomingMessage()` is called — identifies the project via AI, stores an `AmbientMessage`
2. If `confidence >= 0.6`, `applyIntelligence()` runs and may create risks, status changes, or blockers
3. Results are accumulated across all events

### Response

```json
{
  "ok":              true,
  "processed":       3,
  "projectsUpdated": ["proj_cuid_1"],
  "alertsCreated":   1
}
```

| Field | Description |
|-------|-------------|
| `processed` | Total events processed |
| `projectsUpdated` | Unique project IDs that received applied intelligence |
| `alertsCreated` | Number of alerts created as a side effect |

### Error Responses

| Status | Reason |
|--------|--------|
| 401 | Missing, invalid, or expired API key |
| 403 | `orgId` in body does not match key's organisation |
| 400 | Missing required fields |
| 500 | Internal error (stored to console, partial results may have been applied) |

---

## Example: Sending a Slack Message

```bash
curl -X POST https://your-domain.com/api/mcp/ingest \
  -H "Authorization: Bearer rmai_Su1Bs8Q_1HTL0MsUUhy2-MsVRidCahcM" \
  -H "Content-Type: application/json" \
  -d '{
    "orgId":  "org_2abc123",
    "source": "slack",
    "events": [{
      "type":    "message",
      "content": "Alpha project backend is blocked — database migrations keep failing in prod. We might miss the Friday deadline.",
      "source":  "dev-channel"
    }]
  }'
```

The system will:
1. Identify that this message is about the "Alpha" project
2. Extract a blocker signal with high impact
3. Optionally create a risk record if confidence ≥ 0.6

---

## API Key Management

API keys are generated per organisation and visible in **Settings > Integrations**.

| Endpoint | Description |
|----------|-------------|
| `GET /api/settings/api-key` | Returns `{ apiKey, masked }` where masked = `rmai_xxxx...xxxx` |
| `POST /api/settings/api-key` | Regenerates the key (admin only) |

Keys are prefixed `rmai_` followed by 32 random characters (nanoid).

---

## Ingestion Log

`GET /api/settings/ingestion-log` returns the last 20 `AmbientMessage` records for the organisation, with project relation included. Visible in Settings > Integrations.
