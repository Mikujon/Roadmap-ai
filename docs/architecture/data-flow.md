# Data Flow Architecture

How data moves through RoadmapAI from user action to database and back.

---

## Request Lifecycle

### Internal (Browser → Next.js App Router)

```
Browser
  │
  ├─ Clerk session cookie
  │
  └─ Next.js App Router
       │
       ├─ src/proxy.ts (middleware)
       │    ├─ isPublicRoute? → pass through
       │    └─ Clerk auth check → redirect to /sign-in if unauthenticated
       │
       ├─ Server Component (page.tsx / layout.tsx)
       │    └─ getAuthContext() → upserts user+org+member, returns ctx
       │
       └─ API Route (route.ts)
            └─ getAuthContext() → same ctx shape
```

### External (External Agent → MCP API)

```
External Agent
  │
  └─ POST /api/mcp/ingest
       │
       ├─ Middleware: isPublicRoute → passes through (no Clerk check)
       │
       ├─ getApiAuth(req) → reads Bearer token → looks up Organisation.apiKey
       │
       ├─ processIncomingMessage()
       │    ├─ detectProject() → Claude identifies project from text
       │    ├─ Store AmbientMessage (always)
       │    └─ applyIntelligence() → if confidence ≥ 0.6
       │         └─ Creates risks, status changes, activity logs
       │
       └─ Response { processed, projectsUpdated, alertsCreated }
```

---

## Health Score Data Flow

Health score is computed on-demand from raw DB data — it is never stored on the project record.

```
DB (sprints, features, assignments, risks)
  │
  └─ calculateHealth(HealthInput) → HealthReport
       │
       ├─ EVM: BAC, EV, PV, AC, SPI, CPI, EAC, ETC, VAC, SV, CV, TCPI
       ├─ Weights: schedule×0.35 + cost×0.30 + scope×0.20 + risk×0.15
       └─ status: ON_TRACK | AT_RISK | OFF_TRACK
```

**Callers of calculateHealth:**

| Caller | When |
|--------|------|
| `computeEvm()` in `_lib.ts` | Every v1 API request for project data |
| `calculateProjectMetrics()` in `guardian.ts` | Before Guardian AI analysis |
| `src/app/(app)/layout.tsx` | On every page load (sidebar dots) |
| `closure-report/route.ts` | When generating closure report |

---

## Guardian AI Data Flow

```
Event trigger (feature updated, risk added, etc.)
  │
  └─ triggerAgents(event, projectId, orgId)      [fire-and-forget, returns void]
       │
       ├─ 24h dedup check
       │
       ├─ Redis available?
       │    ├─ YES → triggerGuardian() → enqueueGuardianRun() → BullMQ job
       │    │         └─ Worker picks up → runGuardianAgent() [agentic loop]
       │    └─ NO  → analyzeProject() [in-process, direct Claude call]
       │
       └─ GuardianReport upserted to DB
            └─ Served by GET /api/guardian/[projectId] (2h cache)
```

---

## UI Config Data Flow

```
Server-side (layout.tsx, on every navigation):
  DB.organisation.uiPrimaryColor → CSS :root variables injected in <style> tag
    → AppProvider initialUIConfig prop (zero-flash hydration)

Client-side (AppContext):
  uiConfig state ← initialUIConfig (server-supplied)
  useEffect → applyCSSVars() → document.documentElement.style.setProperty()

User changes color in OrgSettings:
  OrgSettingsClient → updateUIConfig(partial)
    → PATCH /api/settings/ui-config → DB update
    → setUiConfig(prev => ({ ...prev, ...partial }))
    → useEffect fires → applyCSSVars()
    → All C.guardian references update immediately (CSS var, no re-render needed)

AI changes color via chat:
  POST /api/v1/ai/chat → update_ui_config tool → DB.organisation.update()
  (Client must reload or navigate for change to take effect — no WebSocket push)
```

---

## Alert Data Flow

```
Scheduled / event-triggered:
  triggerAgents("budget_alert" | "feature_updated", ...)
    └─ runHealthCheck() in alert-engine.ts
         ├─ Scans all non-CLOSED projects
         ├─ Computes health via calculateHealth()
         ├─ Checks 6 alert conditions (schedule, budget, risk, etc.)
         ├─ 24h dedup: wasRecentlySent(projectId, alertType)
         ├─ Creates Alert records
         └─ sendAlertEmails() via Resend → project stakeholders

Client polling:
  AppContext → fetch("/api/alerts?limit=50") every 30 seconds
    └─ setAlerts() → unreadCount re-computed → TopBar badge updates
```

---

## AppContext (Client State)

The `AppProvider` wraps the entire app layout and maintains:

| State | Source | Refresh |
|-------|--------|---------|
| `projects` | `GET /api/v1/projects` | Every 30s + manual |
| `alerts` | `GET /api/alerts?limit=50` | Every 30s + manual |
| `uiConfig` | `initialUIConfig` prop (server) | On settings save |

The 30-second polling interval (`REFRESH_MS = 30_000`) keeps dashboard data fresh without WebSockets. Mutations (risk created, feature updated) call `refresh()` or `refreshProject(id)` immediately rather than waiting for the next poll.

---

## Authentication Context

`getAuthContext()` in `src/lib/auth.ts` is the single entry point for auth in server-side code. It:

1. Reads the Clerk session
2. Upserts the `User` record (creates on first login)
3. Upserts the `Organisation` record (creates on first org setup)
4. Upserts the `OrgMember` record linking user to org
5. Returns `{ user, org, role }` or `null` if unauthenticated

All internal API routes call `getAuthContext()` and check for null before proceeding. External routes use `getApiAuth(req)` which only validates the Bearer token.
