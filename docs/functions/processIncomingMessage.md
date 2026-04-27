# processIncomingMessage

**File:** `src/lib/ingestion-engine.ts`

Processes a single incoming ambient message from an external source, identifies which project it relates to, and applies AI-driven intelligence to extract actionable signals (risks, status changes, blockers). Called by the MCP ingest endpoint for every event in a payload.

## Signature

```typescript
async function processIncomingMessage(
  message: IncomingMessage,
  orgId:   string,
): Promise<IngestionResult>
```

## IncomingMessage Shape

```typescript
interface IncomingMessage {
  platform:   Platform;
  type:       MessageType;
  content:    string;
  source?:    string;     // sender name or email
  metadata?:  Record<string, unknown>;
  confidence?: number;    // 0–1, caller-supplied pre-score
}

type Platform = "slack" | "gmail" | "outlook" | "teams" | "zoom" | "meet"
              | "whatsapp" | "telegram" | "jira" | "github" | "linear";

type MessageType = "message" | "email" | "ticket_update" | "transcript" | "custom";
```

## IngestionResult

```typescript
interface IngestionResult {
  projectId?:   string;
  applied:      boolean;   // true if applyIntelligence() was called
  confidence:   number;
  signals:      Signal[];  // risks, alerts, status changes extracted
}
```

## Internal Flow

### 1. detectProject

```typescript
async function detectProject(text: string, orgId: string): Promise<string | null>
```

Fetches all active project names for the org, then uses a lightweight Claude call to identify which project (if any) the message is about. Returns the project ID or `null` if no match.

**Model:** `claude-sonnet-4-20250514`

### 2. Store AmbientMessage

The raw message is always persisted to the `AmbientMessage` table regardless of whether a project is identified. This ensures a complete audit trail of all external signals.

### 3. applyIntelligence (conditional)

```typescript
async function applyIntelligence(
  message: IncomingMessage,
  project: Project,
  org:     Organisation,
): Promise<Signal[]>
```

Only called when:
- A project was identified via `detectProject()`
- `confidence >= 0.6` (either caller-supplied or from `detectProject()`)

Sends the message content to Claude with the project context and asks it to extract structured signals:
- **Risks** — Claude returns `{ type: "risk", title, probability, impact, category }`
- **Status flags** — `{ type: "status", newStatus, reason }`
- **Blockers** — `{ type: "blocker", featureId, description }`

Each signal is then persisted to the appropriate DB table (creates a `Risk`, logs activity, etc.).

**Model:** `claude-sonnet-4-20250514`

## Called From

### MCP Ingest Endpoint

`POST /api/mcp/ingest` calls `processIncomingMessage()` once per event in the request payload:

```typescript
for (const event of body.events) {
  const result = await processIncomingMessage(mapped, orgId);
  if (result.confidence >= 0.6) {
    projectsUpdated.add(result.projectId);
  }
}
```

The MCP endpoint always stores the `AmbientMessage` and only invokes `applyIntelligence` when confidence meets the threshold.

## Platform Mapping (MCP → Internal)

| MCP source | Internal platform |
|-----------|------------------|
| `jira` | `jira` |
| `gmail` | `gmail` |
| `slack` | `slack` |
| `zoom` | `zoom` |
| `teams` | `teams` |
| `linear` | `linear` |
| `github` | `github` |
| `custom` | `telegram` (fallback) |

## Error Handling

The function never throws to the caller. If `detectProject()` or Claude returns an error, `applied` is set to `false` and signals is `[]`. The `AmbientMessage` record is still written.
