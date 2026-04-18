# RoadmapAI — Architecture & Intervention Guide

> Reference document for developers. Maps every layer of the system to its files,
> and maps every class of failure to the exact intervention point.

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Full File Map](#2-full-file-map)
3. [Data Flow](#3-data-flow)
4. [Intervention Guide — "Where to Look When X Breaks"](#4-intervention-guide)
5. [Database Schema Quick Reference](#5-database-schema-quick-reference)
6. [Background Worker & Queue Jobs](#6-background-worker--queue-jobs)
7. [AI / Guardian Pipeline](#7-ai--guardian-pipeline)
8. [Auth & Permissions](#8-auth--permissions)
9. [Environment Variables](#9-environment-variables)
10. [Monorepo Packages](#10-monorepo-packages)

---

## 1. System Overview

```
Browser
  │
  ▼
Next.js App (src/)          ← port 3000, App Router
  ├── UI (app/(app)/)       ← React pages + views
  ├── API Routes (app/api/) ← REST endpoints, server-side only
  └── lib/                  ← pure server utilities (no React)
        │
        ├── Prisma ──────────────────────── Neon PostgreSQL (DATABASE_URL)
        ├── Clerk ───────────────────────── Auth (CLERK_*)
        ├── Stripe ──────────────────────── Billing (STRIPE_*)
        ├── Anthropic ───────────────────── Claude AI (ANTHROPIC_API_KEY)
        └── packages/queue ──────────────── BullMQ → Redis (REDIS_URL)
                                                │
                                          apps/worker/   ← separate Node.js process
                                            ├── Guardian AI jobs
                                            ├── Alert sweep (cron)
                                            ├── MatView refresh (cron)
                                            ├── Partition maintenance (cron)
                                            └── Outbox poller (interval)
```

**Runtime processes (both must be running in dev):**

| Process | Command | Port |
|---------|---------|------|
| Next.js app | `pnpm dev` (root) | 3000 |
| BullMQ worker | `pnpm --filter @roadmap/worker dev` | — |

---

## 2. Full File Map

### `src/app/(app)/` — UI Pages

| File / Folder | What it does |
|---|---|
| `layout.tsx` | App shell: sidebar, topbar, permission context |
| `SidebarNav.tsx` | Left nav with health-dot indicators per project |
| `TopbarClient.tsx` | ⌘K search, "?" shortcuts, role strip (PMO/CEO/STK/DEV) |
| `NotificationBell.tsx` | Alert bell badge, opens alerts page |
| `MobileSidebar.tsx` | Hamburger sidebar for mobile screens |
| `dashboard/page.tsx` | Command Center: AI decisions feed, project list, KPIs |
| `dashboard/DashboardClient.tsx` | Client shell for dashboard |
| `portfolio/page.tsx` | EVM metrics, Health Heatmap, portfolio-level financials |
| `projects/new/page.tsx` | 4-step wizard: name → team → budget → generate AI |
| `projects/[id]/page.tsx` | Server entry for a single project |
| `projects/[id]/RoadmapClient.tsx` | Tab shell (Overview / Health / Execution / Plan / Financial / Risks) |
| `projects/[id]/OverviewView.tsx` | Summary + scope + timeline |
| `projects/[id]/HealthDecisionsView.tsx` | Health score + Guardian AI decisions |
| `projects/[id]/BoardView.tsx` | Kanban board (drag & drop) |
| `projects/[id]/BacklogView.tsx` | Feature list with filters |
| `projects/[id]/FinancialsView.tsx` | EVM charts, budget burn, cost actuals |
| `projects/[id]/GovernanceView.tsx` | RACI matrix + Audit log ⚠️ tab not wired (see §4) |
| `projects/[id]/GuardianPanel.tsx` | Expanded Guardian AI analysis panel |
| `projects/[id]/useProject.ts` | SWR data hook — single source of truth for project data |
| `archive/page.tsx` | Closed/archived projects list |
| `archive/ClosureReport.tsx` | Closure report modal |
| `cost/page.tsx` | Cost entries list |
| `cost/new/page.tsx` | New cost entry form |
| `cost/[id]/page.tsx` | Cost entry detail |
| `alerts/page.tsx` | Alert center |
| `alerts/AlertsClient.tsx` | Client for alert list |
| `onboarding/page.tsx` | First-run flow after signup |
| `settings/page.tsx` | Settings hub |
| `settings/billing/page.tsx` | Stripe subscription management |
| `settings/team/page.tsx` | Team members + invite |
| `settings/team/InviteForm.tsx` | Invite form component |
| `settings/departments/page.tsx` | Department CRUD |
| `settings/integrations/page.tsx` | External integrations |
| `settings/org/page.tsx` | Org name/logo settings |
| `settings/org/OrgSettingsClient.tsx` | Org settings client component |

### `src/app/api/` — API Routes

| Route | Methods | Purpose |
|---|---|---|
| `/api/projects` | GET POST | List all / create project |
| `/api/projects/[id]` | GET PUT DELETE | Project CRUD |
| `/api/projects/[id]/health` | GET | Compute health score |
| `/api/projects/[id]/financial` | GET POST | Financial data |
| `/api/projects/[id]/risks` | GET POST | Risk register |
| `/api/projects/[id]/risks/[riskId]` | PUT DELETE | Risk update/delete |
| `/api/projects/[id]/risks/suggest-mitigation` | POST | AI risk mitigation |
| `/api/projects/[id]/resources` | GET POST | Resource assignments |
| `/api/projects/[id]/raci` | GET POST | RACI matrix |
| `/api/projects/[id]/raci/[entryId]` | PUT DELETE | RACI entry |
| `/api/projects/[id]/alerts` | GET POST | Per-project alerts |
| `/api/projects/[id]/audit` | GET POST | Audit log entries |
| `/api/projects/[id]/snapshots` | GET POST | Point-in-time snapshots |
| `/api/projects/[id]/snapshots/[snapshotId]` | GET | Single snapshot |
| `/api/projects/[id]/export` | GET | Export PDF/JSON |
| `/api/projects/[id]/share` | GET POST | Public share link |
| `/api/projects/[id]/scope-change` | POST | Log scope change |
| `/api/projects/[id]/closure-report` | GET POST | Closure report |
| `/api/projects/[id]/departments` | GET POST | Project↔department links |
| `/api/features/[id]` | GET PUT DELETE | Feature CRUD |
| `/api/sprints/[id]` | GET PUT | Sprint update |
| `/api/dependencies/features` | GET POST | Feature dependencies |
| `/api/dependencies/projects` | GET POST | Project dependencies |
| `/api/guardian` | GET POST | Guardian reports list |
| `/api/guardian/[projectId]` | GET POST | Guardian report for project |
| `/api/guardian/[projectId]/trigger` | POST | Manual Guardian trigger |
| `/api/guardian/alert` | POST | Guardian creates alert |
| `/api/guardian/tasks` | GET POST | Guardian task queue |
| `/api/generate` | POST | AI project generation |
| `/api/generate/decisions` | POST | AI decisions generation |
| `/api/alerts` | GET POST | Alert list |
| `/api/alerts/[id]/validate` | POST | Validate/dismiss alert |
| `/api/alerts/mark-all-read` | POST | Mark all alerts read |
| `/api/departments` | GET POST | Department list/create |
| `/api/departments/[id]` | GET PUT DELETE | Department CRUD |
| `/api/resources` | — | Global resources |
| `/api/portfolio` | GET | Portfolio summary |
| `/api/portfolio/financials` | GET | EVM across all projects |
| `/api/metrics` | GET | Global PMO metrics |
| `/api/search` | GET | Full-text search |
| `/api/org` | GET PUT | Organisation settings |
| `/api/users/me` | GET | Current user profile |
| `/api/invitations` | GET POST | Team invitations |
| `/api/billing/checkout` | POST | Stripe checkout session |
| `/api/billing/portal` | POST | Stripe billing portal |
| `/api/cron/health-check` | GET | Vercel cron ping |
| `/api/webhooks/clerk` | POST | Clerk user sync |
| `/api/webhooks/stripe` | POST | Stripe events |

### `src/lib/` — Server Utilities

| File | What it does |
|---|---|
| `prisma.ts` | Prisma singleton with Neon serverless pool |
| `auth.ts` | `getAuthContext()` — resolves Clerk session → org + member |
| `permissions.ts` | Role matrix: ADMIN / MANAGER / VIEWER → capabilities |
| `health.ts` | EVM health score engine (PMI PMBOK formulas) |
| `guardian.ts` | Guardian orchestration (decide when to run, store report) |
| `guardian-agent.ts` | Claude API call — builds prompt, parses structured output |
| `guardian-trigger.ts` | Enqueues a Guardian job via BullMQ |
| `alert-engine.ts` | Rule-based alert generation (budget overrun, blocked sprints…) |
| `closure-report.ts` | Generates AI closure report on project close |
| `activity.ts` | Writes `ActivityLog` entries |
| `metrics.ts` | EVM + portfolio-level metrics calculations |
| `anthropic.ts` | Anthropic SDK singleton |
| `stripe.ts` | Stripe SDK singleton |
| `rate-limit.ts` | Per-IP rate limiting for API routes |
| `validations.ts` | Zod schemas shared by API routes |

### `src/components/ui/` — Reusable Components

| File | What it does |
|---|---|
| `toast.tsx` | `toast(msg, variant)` — success/error/warning/info |
| `global-search.tsx` | ⌘K modal with keyboard nav |
| `feature-modal.tsx` | Feature detail/edit modal |
| `project-modals.tsx` | Scope Change, Budget Update, Escalation, Export modals |
| `inactivity-modal.tsx` | Auto-logout after 30 min idle |
| `keyboard-shortcuts.tsx` | "?" modal listing all shortcuts |
| `kpi-card.tsx` | KPI metric card with hover lift |
| `status-badge.tsx` | Project/feature status badge |
| `decision-item.tsx` | AI decision feed item |
| `guardian-bar.tsx` | Guardian status strip in project header |
| `validation-inbox.tsx` | Pending validation inbox |

---

## 3. Data Flow

### Request path (page load)

```
User → Browser
  → Next.js page (server component)
      → getAuthContext()          src/lib/auth.ts
          → Clerk session validate
          → DB lookup: Member + Organisation
      → Prisma query               src/lib/prisma.ts → Neon
      → Render HTML
  → Client hydration
      → useProject() hook          src/app/(app)/projects/[id]/useProject.ts
          → SWR fetch /api/projects/[id]
```

### Mutation path (e.g. update feature status)

```
User action (drag feature on board)
  → BoardView.tsx — optimistic UI update
  → fetch PUT /api/features/[id]
      → getAuthContext()
      → permissions check
      → Prisma update
      → activity.ts: write ActivityLog
      → guardian-trigger.ts: enqueue Guardian job (if significant change)
  → SWR mutate → re-fetch → UI sync
```

### Guardian AI path

```
Trigger: manual button / feature update / cron
  → POST /api/guardian/[projectId]/trigger
      → guardian-trigger.ts → enqueueGuardianRun()
          → packages/queue/queues.ts → BullMQ "guardian" queue → Redis

  → apps/worker/ picks up job
      → processors/guardian.ts
          → packages/ai/guardian.ts
              → builds prompt (packages/ai/prompts/guardian.ts)
              → Anthropic SDK call (claude-sonnet-4-6)
              → parse structured JSON response
          → Prisma: upsert GuardianReport
          → alert-engine.ts: generate alerts from findings
          → Prisma: write Alert rows
```

### Alert sweep path (cron)

```
Cron: every hour (ALERT_SWEEP_REPEAT pattern)
  → apps/worker/processors/alert-sweep.ts
      → queries all active projects
      → alert-engine.ts: evaluateProjectAlerts(project)
          → checks: budget overrun, blocked features, missed milestones,
                    stale sprints, high open risks
      → Prisma: upsert Alert rows
      → POST /api/guardian/alert (internal) if severity ≥ HIGH
```

---

## 4. Intervention Guide

### UI is broken / page shows nothing

| Symptom | File to check |
|---|---|
| Blank page, no sidebar | `src/app/(app)/layout.tsx` |
| Sidebar renders but page body is empty | page-level `loading.tsx` or the page's server component |
| Client crash (React error boundary caught) | `src/app/(app)/projects/[id]/ErrorBoundary.tsx` |
| Toast never appears | `src/app/layout.tsx` — confirm `<ToastProvider>` wraps children |
| ⌘K search broken | `src/components/ui/global-search.tsx` |
| Keyboard shortcuts not firing | `src/components/ui/keyboard-shortcuts.tsx` |

### API returns 401 / 403

| Symptom | File to check |
|---|---|
| 401 Unauthorized | `src/lib/auth.ts` — `getAuthContext()` — Clerk session missing or CLERK_SECRET_KEY wrong |
| 403 Forbidden | `src/lib/permissions.ts` — role check logic; verify member role in DB |
| Any route ignoring auth | Check that the route calls `getAuthContext()` at the top |

### API returns 500

| Symptom | File to check |
|---|---|
| Prisma error (`P2025 Record not found`) | The route — check `where` clause, org scoping |
| Prisma connection error | `src/lib/prisma.ts` — check `DATABASE_URL` env var + Neon connection |
| Zod validation error | `src/lib/validations.ts` + the route's `req.json()` parse block |
| Rate limit hit (429) | `src/lib/rate-limit.ts` — adjust limits or check Redis connection |

### Health score is wrong

| Symptom | File to check |
|---|---|
| Score calculation incorrect | `src/lib/health.ts` — EVM formulas |
| Health score not updating | `src/app/api/projects/[id]/health/route.ts` — check Prisma aggregation query |
| Health dot in sidebar is stale | `SidebarNav.tsx` — SWR revalidation interval |
| Health data missing on project view | `src/app/(app)/projects/[id]/HealthDecisionsView.tsx` |

### Guardian AI not running / wrong output

| Symptom | File to check |
|---|---|
| Manual trigger does nothing | `src/app/api/guardian/[projectId]/trigger/route.ts` → `src/lib/guardian-trigger.ts` |
| Job enqueued but never processed | `apps/worker/` — is the worker process running? Check Redis connection |
| Wrong Claude output / parse error | `packages/ai/guardian.ts` + `packages/ai/prompts/guardian.ts` |
| Report saved but alerts not created | `src/lib/alert-engine.ts` |
| Guardian runs too often or not enough | `apps/worker/src/index.ts` — `limiter` config on the worker |

### Alerts not appearing

| Symptom | File to check |
|---|---|
| Alert bell shows wrong count | `src/app/(app)/NotificationBell.tsx` — fetch + interval |
| Alert not created after guardian run | `src/lib/alert-engine.ts` — rule conditions |
| Alert sweep cron not firing | `apps/worker/src/index.ts` — `ALERT_SWEEP_REPEAT` schedule |
| Alert sweep logic wrong | `apps/worker/src/processors/alert-sweep.ts` |
| Validate/dismiss alert broken | `src/app/api/alerts/[id]/validate/route.ts` |

### Background worker / queue issues

| Symptom | File to check |
|---|---|
| Worker crashes on startup | `apps/worker/src/index.ts` — missing env vars (`DATABASE_URL`, `REDIS_URL`) |
| Jobs stuck in queue | Redis connection: `packages/queue/src/connection.ts` |
| Job type unknown / wrong processor | `apps/worker/src/processors/` — each file maps to one queue |
| Cron not firing at right interval | `packages/queue/src/jobs.ts` — `ALERT_SWEEP_REPEAT` etc. |
| Outbox events piling up | `apps/worker/src/processors/outbox-poller.ts` |
| MatView stale | `apps/worker/src/processors/matview-refresh.ts` |

### Database / migration issues

| Symptom | File to check |
|---|---|
| Schema out of sync | `prisma/schema.prisma` → run `pnpm prisma migrate dev` |
| Migration failed | `prisma/migrations/` — check latest folder for SQL errors |
| Missing column error in runtime | A migration was not applied — check `prisma migrate status` |
| Performance slow queries | `prisma/migrations/20260408082831_add_performance_indexes/` — check indexes |
| Materialized view stale | `prisma/migrations/20260409000002_sprint5_matviews_partitions/` + `matview-refresh.ts` |

### Billing / Stripe issues

| Symptom | File to check |
|---|---|
| Checkout redirects to wrong URL | `src/app/api/billing/checkout/route.ts` — `successUrl`/`cancelUrl` |
| Subscription not updating in DB | `src/app/api/webhooks/stripe/route.ts` — `STRIPE_WEBHOOK_SECRET` |
| Billing portal broken | `src/app/api/billing/portal/route.ts` |
| Plan gate not enforced | `src/lib/permissions.ts` — check `subscriptionStatus` logic |

### Auth / Clerk issues

| Symptom | File to check |
|---|---|
| User not synced to DB after signup | `src/app/api/webhooks/clerk/route.ts` — `user.created` event handler |
| Org not found after creation | Same webhook — `organization.created` event |
| Role not updating | `src/app/api/users/me/route.ts` + `Member` model in DB |
| Session expired / redirects loop | `src/lib/auth.ts` — Clerk `currentUser()` call; check middleware |

### Portfolio / metrics wrong

| Symptom | File to check |
|---|---|
| EVM numbers incorrect | `src/lib/metrics.ts` — EVM formula implementations |
| Portfolio page shows empty | `src/app/api/portfolio/route.ts` — org scoping query |
| Portfolio financials wrong | `src/app/api/portfolio/financials/route.ts` |
| KPI cards show 0 | `src/app/(app)/dashboard/page.tsx` → `/api/metrics` |

### Governance tab not visible

> Known issue (v0.6): `GovernanceView.tsx` exists with full RACI + Audit Log
> but the tab is not in the `TABS` array.

| Fix location | What to do |
|---|---|
| `src/app/(app)/projects/[id]/RoadmapClient.tsx` | Add `{ id: "history", label: "Governance" }` to the `TABS` array and add the `GovernanceView` case in the tab renderer |

---

## 5. Database Schema Quick Reference

### Core models

| Model | Table | Key fields |
|---|---|---|
| `Organisation` | `organisations` | `clerkOrgId`, `subscriptionStatus` |
| `User` | `users` | `clerkId`, `preferredView` |
| `Member` | `members` | `userId`, `orgId`, `role` (ADMIN/MANAGER/VIEWER) |
| `Project` | `projects` | `status`, `healthScore`, `orgId` |
| `Phase` | `phases` | `projectId`, `order`, `startDate`, `endDate` |
| `Sprint` | `sprints` | `phaseId`, `status`, `capacity` |
| `Feature` | `features` | `sprintId`, `status`, `assigneeId`, `storyPoints` |
| `Risk` | `risks` | `projectId`, `probability`, `impact`, `ownerId`, `category` |
| `Resource` | `resources` | `orgId`, `name`, `dailyRate` |
| `ResourceAssignment` | `resource_assignments` | `resourceId`, `projectId`, `hours`, `costActual` |
| `Alert` | `alerts` | `projectId`, `severity`, `type`, `readAt` |
| `GuardianReport` | `guardian_reports` | `projectId`, `findings`, `score` |
| `ProjectStatusLog` | `project_status_logs` | `projectId`, `status`, `note` |
| `ProjectSnapshot` | `project_snapshots` | `projectId`, `data` (JSON), `createdAt` |
| `DomainEvent` | `domain_events` | `type`, `payload`, `orgId` |
| `OutboxEvent` | `outbox_events` | `type`, `payload`, `processedAt` |
| `Department` | `departments` | `orgId`, `name` |

### Migration history

| Migration | Date | What changed |
|---|---|---|
| `20260313164115_init` | 13 Mar | Initial schema |
| `20260319103126_add_dependencies` | 19 Mar | Feature/project dependencies |
| `20260319151358_add_financial_resource_risk` | 19 Mar | Financial engine, resources, risks |
| `20260326140327_add_project_category` | 26 Mar | Project.category |
| `20260326164229_add_department` | 26 Mar | Department model |
| `20260327095347_add_project_department_requester` | 27 Mar | ProjectDepartment join + requester |
| `20260330081929_add_feature_assignee` | 30 Mar | Feature.assigneeId |
| `20260401094746_add_closed_status` | 1 Apr | Status.CLOSED enum value |
| `20260401102152_add_project_lifecycle` | 1 Apr | Lifecycle phases |
| `20260401123109_add_status_log` | 1 Apr | ProjectStatusLog model |
| `20260401130314_add_guardian_report` | 1 Apr | GuardianReport model |
| `20260402083824_add_activity_fields` | 2 Apr | ActivityLog fields |
| `20260402105720_add_alerts` | 2 Apr | Alert model |
| `20260403203744_add_project_snapshots` | 3 Apr | ProjectSnapshot model |
| `20260407151758_add_risk_owner_category` | 7 Apr | Risk.ownerId + Risk.category |
| `20260408082831_add_performance_indexes` | 8 Apr | DB indexes for perf |
| `20260409000001_sprint3_events_rls` | 9 Apr | DomainEvent, OutboxEvent, RLS |
| `20260409000002_sprint5_matviews_partitions` | 9 Apr | Materialized views, partitions |

---

## 6. Background Worker & Queue Jobs

Worker entry: [apps/worker/src/index.ts](../apps/worker/src/index.ts)

### Queue names and their processors

| BullMQ Queue | Cron / Trigger | Processor file | What it does |
|---|---|---|---|
| `guardian` | On-demand (per project) | `processors/guardian.ts` | Runs Claude analysis on a project |
| `alert-sweep` | Every hour | `processors/alert-sweep.ts` | Evaluates alert rules for all projects |
| `matview` | Every 15 min | `processors/matview-refresh.ts` | Refreshes PostgreSQL materialized views |
| `partition` | Daily | `processors/partition-maintenance.ts` | Creates future partition tables |
| `decisions` | On-demand | *(enqueued, no dedicated worker yet)* | AI decisions generation |

### Outbox poller

File: [apps/worker/src/processors/outbox-poller.ts](../apps/worker/src/processors/outbox-poller.ts)

Polls `OutboxEvent` table every 5 seconds. Publishes events to downstream consumers (webhooks, etc.). If events pile up: check this poller and the `outbox_events` table.

### Adding a new background job

1. Define job data type in `packages/queue/src/jobs.ts`
2. Add queue getter + enqueue helper in `packages/queue/src/queues.ts`
3. Write processor in `apps/worker/src/processors/your-job.ts`
4. Register `new Worker("queue-name", handler)` in `apps/worker/src/index.ts`

---

## 7. AI / Guardian Pipeline

### Files involved

| Layer | File |
|---|---|
| HTTP trigger | `src/app/api/guardian/[projectId]/trigger/route.ts` |
| Enqueue | `src/lib/guardian-trigger.ts` → `packages/queue/src/queues.ts` |
| Worker picks up | `apps/worker/src/processors/guardian.ts` |
| AI package | `packages/ai/guardian.ts` |
| Prompt | `packages/ai/prompts/guardian.ts` |
| Claude client | `packages/ai/src/client.ts` → Anthropic SDK |
| Response cache | `packages/ai/src/cache.ts` → Redis |
| Store report | `src/lib/guardian.ts` → Prisma |
| Generate alerts | `src/lib/alert-engine.ts` |

### Changing the Guardian prompt

Edit: [packages/ai/src/prompts/guardian.ts](../packages/ai/src/prompts/guardian.ts)

The prompt expects a structured JSON response. Changing the schema requires updating the parser in [packages/ai/guardian.ts](../packages/ai/src/guardian.ts).

### Changing alert rules

Edit: [src/lib/alert-engine.ts](../src/lib/alert-engine.ts)

Each rule is a function that receives the project snapshot and returns an `Alert[]`. Add new rules by appending to the evaluator array.

---

## 8. Auth & Permissions

### Auth flow

```
Request hits API route
  → getAuthContext()          src/lib/auth.ts
      → Clerk.currentUser()   (server-side)
      → Prisma: find User by clerkId
      → Prisma: find Member (User × Organisation)
      → returns { user, member, org, permissions }
```

If `getAuthContext()` returns null → 401. If permissions check fails → 403.

### Role matrix

Defined in [src/lib/permissions.ts](../src/lib/permissions.ts):

| Role | canEdit | canManage | canViewFinancials |
|---|---|---|---|
| ADMIN | ✓ | ✓ | ✓ |
| MANAGER | ✓ | ✗ | ✓ |
| VIEWER | ✗ | ✗ | ✗ |

### View modes (preferredView)

Set per-user in `User.preferredView`. The TopbarClient role strip emits `CustomEvent("rolechange")` when switched. Values: `PMO` / `CEO` / `STK` / `DEV`. Used for UI layout only — not for access control.

### Webhook sync (Clerk → DB)

File: [src/app/api/webhooks/clerk/route.ts](../src/app/api/webhooks/clerk/route.ts)

Handles: `user.created`, `user.updated`, `organization.created`, `organizationMembership.created/deleted`.

If a user signs up but can't access the app: check this webhook is receiving events (`CLERK_WEBHOOK_SECRET` env var).

---

## 9. Environment Variables

All must be present in `.env.local` (dev) or deployment environment.

| Variable | Used in | Purpose |
|---|---|---|
| `DATABASE_URL` | `src/lib/prisma.ts`, `apps/worker/src/db.ts` | Neon PostgreSQL connection string |
| `CLERK_SECRET_KEY` | `src/lib/auth.ts` | Clerk server-side auth |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Layout | Clerk client-side |
| `CLERK_WEBHOOK_SECRET` | `/api/webhooks/clerk` | Verify Clerk webhook signatures |
| `ANTHROPIC_API_KEY` | `src/lib/anthropic.ts`, `packages/ai/client.ts` | Claude API |
| `STRIPE_SECRET_KEY` | `src/lib/stripe.ts` | Stripe server operations |
| `STRIPE_WEBHOOK_SECRET` | `/api/webhooks/stripe` | Verify Stripe webhook signatures |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Billing UI | Stripe client |
| `REDIS_URL` | `packages/queue/src/connection.ts` | BullMQ + AI response cache |

---

## 10. Monorepo Packages

Located in `packages/`. Shared across `src/` (Next.js) and `apps/worker/`.

| Package | Import | Purpose |
|---|---|---|
| `@roadmap/ai` | `packages/ai/src/` | Claude client, Guardian AI, decisions, prompt cache |
| `@roadmap/core` | `packages/core/src/` | Shared TypeScript types, Zod schemas, constants |
| `@roadmap/engines` | `packages/engines/src/` | Pure calculation engines: health, risk, alert, metrics, decision |
| `@roadmap/events` | `packages/events/src/` | Domain event types + publisher |
| `@roadmap/logger` | `packages/logger/src/` | Structured logger with context |
| `@roadmap/metrics` | `packages/metrics/src/` | Prometheus-compatible metric helpers |
| `@roadmap/queue` | `packages/queue/src/` | BullMQ queue definitions, job types, enqueue helpers |

### Where to put new shared logic

- **New calculation / formula** → `packages/engines/src/`
- **New TypeScript type used in >1 package** → `packages/core/src/types/`
- **New Zod schema** → `packages/core/src/schemas/`
- **New AI prompt / Claude call** → `packages/ai/src/`
- **New background job type** → `packages/queue/src/jobs.ts` + `queues.ts`
- **App-only utility (not shared)** → `src/lib/`

---

*Last updated: April 2026 — v0.6*
