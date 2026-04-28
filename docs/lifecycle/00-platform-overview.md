# RoadmapAI — Platform Overview

RoadmapAI is a multi-tenant PMO SaaS platform that combines project portfolio management with ambient AI intelligence. It is built for professional services organisations that need real-time project health, EVM-based metrics, and AI-assisted risk detection — all in a single workspace.

---

## Who It's For

| Role | Primary Use |
|------|-------------|
| **PMO** | Create and manage projects, sprints, risks, team assignments |
| **CEO** | Portfolio-level health dashboard, financial view, governance oversight |
| **Stakeholder** | Read-only access to projects they sponsor — docs, functional analysis |
| **Dev** | Assigned task board, status updates, chat with Guardian AI |
| **Admin** | Full access + billing + org settings + API key management |

---

## Core Capabilities

### Project Portfolio Management
Projects are structured as **phases → sprints → features (tasks)**. Each project has:
- EVM health score computed on-demand (SPI, CPI, EAC, VAC, TCPI)
- Risk registry with probability/impact matrix
- Resource assignments and department mapping
- Financial tracking (budget vs. actual cost vs. expected revenue)
- Dependency graph across projects

### Guardian AI
An agentic loop powered by Claude that analyses each project and produces:
- Health score (0–100) with weighted schedule/cost/scope/risk components
- On-track probability (% chance of on-time delivery)
- Per-category alerts: schedule, budget, resources, scope, risk, governance
- Prioritised recommendations for the PM

Guardian runs automatically on every significant project event and is also available on-demand via a chat panel embedded in the UI.

### Ambient Intelligence (MCP Ingestion)
External signals — Slack messages, Jira ticket updates, Zoom call transcripts, emails — are ingested through a Bearer-authenticated `/api/mcp/ingest` endpoint. Claude identifies which project each signal belongs to and applies intelligence: creating risks, changing feature statuses, or raising alerts, without any manual input from the team.

### Alert Engine
Six alert categories are evaluated continuously:
- Schedule deviation (SPI < 0.85)
- Budget overrun (CPI < 0.85 or actual > budget)
- Risk count above threshold
- Stalled progress (no updates in N days)
- Blocked features
- Upcoming deadline with low health

Alerts are deduped per 24 h and emailed to org members via Resend.

### REST API v1
A headless API at `/api/v1/` exposes all portfolio data for external dashboards, BI tools, and integrations. Authenticated with the same org API key used for MCP ingestion.

---

## Technical Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 15 (App Router), React 19, inline styles (no Tailwind) |
| Auth | Clerk (multi-tenant organisations) |
| Database | Neon PostgreSQL + Prisma ORM |
| AI | Anthropic Claude (`claude-sonnet-4-6` for Guardian, `claude-haiku-4-5` for chat) |
| Background jobs | BullMQ + Redis (Guardian runs, alert sweeps, outbox poller) |
| Email | Resend |
| Monorepo | pnpm workspaces — `src/` (Next.js app), `apps/worker/`, `packages/` |

---

## Key Design Decisions

**Health scores are never stored on the project record.** `calculateHealth()` is called on demand from raw sprint/feature/assignment/risk data. This means the score always reflects current state without stale-data bugs.

**Org isolation is enforced at the query level.** Every DB query in API routes filters by `ctx.org.id`. There is no middleware-level sharding — correctness is in the query.

**Guardian is fire-and-forget.** `triggerAgents()` returns void. If Redis is available, the job is enqueued; if not, it runs in-process. The caller never waits.

**CSS variables drive theming.** Org-level brand colour is injected server-side into a `<style>` tag in layout.tsx (zero flash), then kept in sync client-side by AppContext via `document.documentElement.style.setProperty()`.

**Role-based access is declarative.** `src/lib/permissions.ts` exports `can`, `sidebarItems`, and `projectTabs` — all indexed by `Role`. No inline role checks are scattered across components.

---

## Directory Map

```
src/
  app/
    (app)/          ← authenticated app shell (layout.tsx, sidebar, topbar)
      dashboard/
      portfolio/
      projects/[id]/
      settings/
    api/            ← internal API routes (Clerk-auth)
    setup/          ← new-user org creation (no auth required)
  lib/              ← pure server utilities
    auth.ts         ← getAuthContext()
    health.ts       ← calculateHealth() — single EVM source of truth
    guardian.ts     ← analyzeProject(), GuardianProjectReport
    guardian-trigger.ts ← triggerGuardian()
    alert-engine.ts ← runHealthCheck(), sendAlertEmails()
    permissions.ts  ← can.*, sidebarItems, projectTabs
    metrics.ts      ← getProjectMetrics()
    ingestion-engine.ts ← processIncomingMessage(), applyIntelligence()
  contexts/
    AppContext.tsx   ← global client state (projects, alerts, uiConfig, role)

apps/
  worker/           ← BullMQ worker (Guardian, alert sweep, outbox, cron)

packages/
  engines/          ← calculateHealth (shared with worker)
  queue/            ← BullMQ queue definitions
  events/           ← emit() — domain event outbox
  ai/               ← Anthropic client wrapper
```

---

## Lifecycle of a Project

```
1. PMO creates project  →  POST /api/projects
   └─ Phases (3 default) + Sprints (6) + initial features created automatically
   └─ triggerAgents("project_created") → Guardian first analysis

2. Team updates features  →  PATCH /api/features/[id]
   └─ Sprint status auto-updated (ACTIVE → DONE when all features done)
   └─ Project status auto-updated (ACTIVE → COMPLETED when all sprints done)
   └─ Domain event emitted → outbox → BullMQ → Guardian re-analysis

3. External signals arrive  →  POST /api/mcp/ingest
   └─ Claude identifies project from message text
   └─ AmbientMessage stored
   └─ If confidence ≥ 0.6: risks/statuses applied

4. Guardian runs  →  runGuardianAgent() in worker
   └─ Reads full project state + history
   └─ Claude agentic loop: analyse → call tools → refine
   └─ GuardianReport upserted → served by GET /api/guardian/[id]

5. Alerts fire  →  alert-engine.ts
   └─ Conditions evaluated → Alert records created → emails sent via Resend

6. Project closes  →  status: COMPLETED
   └─ Closure report generated (GET /api/projects/[id]/closure-report)
   └─ Archived in portfolio view
```
