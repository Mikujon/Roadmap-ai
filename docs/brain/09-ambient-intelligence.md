# Ambient Intelligence

Source: `src/lib/ingestion-engine.ts` — `processIncomingMessage()`, `applyIntelligence()`, `detectProject()`  
Source: `src/app/api/mcp/ingest/route.ts`

Ambient Intelligence is the process of continuously absorbing external signals — Slack messages, Jira tickets, emails, Zoom transcripts — and applying PM intelligence without human intervention.

---

## Signal Processing Pipeline

```
External signal (text content)
  │
  └─ processIncomingMessage()
       │
       ├─ detectProject()
       │    └─ Claude analyses text → identifies project by name/context
       │         ├─ Returns projectId + confidence (0.0–1.0)
       │         └─ If no match → stores as unlinked AmbientMessage
       │
       ├─ Store AmbientMessage (always — regardless of confidence)
       │
       └─ confidence >= 0.6?
            ├─ YES → applyIntelligence()
            │         ├─ Classify signal type
            │         ├─ Extract entities (people, dates, features, risks)
            │         ├─ Apply mutations (risk create, status change, blocker)
            │         └─ triggerGuardian()
            └─ NO  → store only, no mutations
```

---

## AmbientMessage Model

```prisma
model AmbientMessage {
  id             String   @id @default(cuid())
  organisationId String
  projectId      String?  // null if project not detected
  platform       String   // slack | jira | gmail | zoom | teams | linear | github | telegram
  source         String   // sender name or channel
  content        String   // original message text
  confidence     Float    // 0.0–1.0 project detection confidence
  processed      Boolean  // true = applyIntelligence ran
  metadata       Json?    // arbitrary extra data from sender
  createdAt      DateTime
}
```

---

## Confidence Thresholds

| Confidence | Meaning | Action |
|-----------|---------|--------|
| ≥ 0.9 | Very high — explicit project name mentioned | Apply intelligence + Guardian |
| 0.7–0.9 | High — strong contextual match | Apply intelligence + Guardian |
| 0.6–0.7 | Medium — possible match | Apply intelligence (conservative mutations) |
| < 0.6 | Low — uncertain | Store only, no mutations |
| 0.0 | No project detected | Store as unlinked, flag in ingestion log |

---

## Signal Classification

When `applyIntelligence()` runs, the signal is classified into:

| Signal Type | Detection Keywords | Action |
|-------------|-------------------|--------|
| **Status update** | "completed", "done", "finished", "deployed", "shipped" | Mark feature DONE if identified |
| **Blocker** | "blocked", "waiting for", "can't proceed", "dependency not ready" | Mark feature BLOCKED, create risk |
| **Risk signal** | "risk", "concern", "might miss", "worried about", "failure" | Create Risk record |
| **Scope change** | "added to scope", "new requirement", "client wants", "out of scope" | Log as activity, Guardian flags |
| **Schedule signal** | "behind", "delay", "won't make", "pushing deadline" | Update Guardian context, SPI impact |
| **Budget signal** | "over budget", "costs more", "invoice came", "resource cost" | Log as activity, flag for PM |
| **Positive signal** | "on track", "ahead of schedule", "under budget", "client happy" | Positive Guardian alert |

---

## Intelligence Application Rules

`applyIntelligence()` follows these guardrails:

1. **Never delete data** — only create or update, never delete features, sprints, or projects
2. **Never change project status directly** — only features can be status-changed
3. **Always leave a trace** — every mutation creates an Activity log entry with `source: "ambient"`
4. **Conservative by default** — if classification is ambiguous, store as AmbientMessage only
5. **No financial mutations** — do not change `budgetTotal`, `costActual`, or `revenueExpected`
6. **One risk per signal** — do not create duplicate risks for the same signal

---

## Platform Mapping

| `source` input | Internal `platform` |
|---------------|---------------------|
| `jira` | `jira` |
| `gmail` | `gmail` |
| `slack` | `slack` |
| `zoom` | `zoom` |
| `teams` | `teams` |
| `linear` | `linear` |
| `github` | `github` |
| `custom` or unknown | `telegram` (catch-all) |

---

## Project Detection Strategy

`detectProject()` passes the message content to Claude with context:
- List of all project names in the org (from DB)
- Existing AmbientMessages for context
- Claude returns: `{ projectId, projectName, confidence, reasoning }`

Detection is strongest when:
- Project name is mentioned explicitly ("Alpha project", "the ERP migration")
- Jira ticket format matches a known project prefix
- Sender is a known member assigned to a specific project

Detection fails when:
- Message is generic ("the project", "our work")
- Multiple projects match the context
- Message is about org-level matters, not a specific project

---

## Ingestion Log

Last 20 `AmbientMessage` records visible in **Settings → Integrations**.

Each entry shows:
- Platform, source, timestamp
- Detected project (or "unlinked")
- Confidence score
- Whether intelligence was applied
- Content preview (first 100 chars)

---

## False Positive Prevention

Before applying a mutation, `applyIntelligence()` checks:
- Is the identified feature still in `TODO` or `IN_PROGRESS` state? (Don't re-close already-done work)
- Does the risk title already exist in the project? (Dedup by title similarity)
- Is the message about a different time period? ("We finished that last month" = past tense, skip)
- Is the message from a test/bot account? (metadata.isBot check)
