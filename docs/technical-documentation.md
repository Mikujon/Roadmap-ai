# RoadmapAI — Technical Documentation

**Version:** 1.0  
**Date:** April 2026  
**Stack:** Next.js 16 · TypeScript 5 · PostgreSQL (Neon) · Prisma · Clerk · Anthropic · Stripe

---

## 1. Technology Stack

| Layer | Technology | Version | Purpose |
|---|---|---|---|
| Framework | Next.js (App Router) | 16.2.1 | Full-stack React framework with server components and API routes |
| Language | TypeScript | 5 | Type safety across frontend and backend |
| Styling | Tailwind CSS | v4 | Utility-first CSS via PostCSS |
| Database | PostgreSQL (Neon Serverless) | — | Primary data store with serverless connection pooling |
| ORM | Prisma | 6.7.0 | Type-safe DB client, migrations, schema management |
| Auth | Clerk | 7.0.4 | Authentication, organisation management, session tokens |
| AI | Anthropic Claude SDK | 0.78.0 | Guardian agent, project generation, risk analysis |
| Payments | Stripe | 20.4.1 | Subscription billing, checkout, customer portal |
| Email | Resend | 6.9.3 | Transactional email (alerts, invitations) |
| Webhooks | Svix | 1.88.0 | Clerk webhook signature verification |
| State | TanStack React Query | 5.90.21 | Client-side server state management |
| Charts | Recharts | 3.8.0 | Financial and metrics visualisations |
| Icons | Lucide React | 0.577.0 | Icon set |
| Validation | Zod | 4.3.6 | Runtime schema validation for API inputs |
| Date utils | date-fns | 4.1.0 | Date arithmetic and formatting |
| ID generation | nanoid | 5.1.6 | Short unique identifiers |
| Runtime | Node.js (Edge-compatible) | — | Serverless API route execution |

---

## 2. Project Structure

```
roadmap-ai/
├── src/
│   ├── app/
│   │   ├── (app)/                        # Protected routes (require auth)
│   │   │   ├── layout.tsx                # App shell: sidebar, navigation
│   │   │   ├── dashboard/                # Portfolio dashboard
│   │   │   ├── portfolio/                # Portfolio management view
│   │   │   ├── cost/                     # Cost tracking
│   │   │   ├── archive/                  # Closed/archived projects
│   │   │   ├── onboarding/               # First-run wizard
│   │   │   ├── settings/
│   │   │   │   ├── page.tsx              # Organisation settings
│   │   │   │   ├── team/                 # Member management
│   │   │   │   ├── departments/          # Department management
│   │   │   │   └── billing/              # Subscription management
│   │   │   └── projects/
│   │   │       ├── new/                  # AI project creation wizard
│   │   │       └── [id]/                 # Project detail (7 views)
│   │   │           ├── page.tsx          # Server component — data fetching
│   │   │           ├── RoadmapClient.tsx # Client shell — view switching
│   │   │           ├── OverviewView.tsx
│   │   │           ├── BoardView.tsx
│   │   │           ├── BacklogView.tsx
│   │   │           ├── RoadmapClient.tsx
│   │   │           ├── FinancialsView.tsx
│   │   │           ├── GovernanceView.tsx
│   │   │           └── GuardianPanel.tsx
│   │   ├── api/                          # API routes (Next.js Route Handlers)
│   │   │   ├── projects/
│   │   │   │   ├── route.ts              # GET list, POST create
│   │   │   │   └── [id]/
│   │   │   │       ├── route.ts          # GET, PATCH, DELETE
│   │   │   │       ├── risks/            # Risk CRUD + AI mitigation
│   │   │   │       ├── share/            # Share token management
│   │   │   │       ├── health/           # EVM health endpoint
│   │   │   │       ├── financial/        # Budget/cost PATCH
│   │   │   │       ├── resources/        # Resource assignments
│   │   │   │       ├── snapshots/        # Version snapshots
│   │   │   │       └── closure-report/   # AI closure report
│   │   │   ├── features/[id]/            # Feature PATCH
│   │   │   ├── sprints/[id]/             # Sprint PATCH
│   │   │   ├── generate/                 # AI project generation
│   │   │   ├── guardian/                 # Guardian analysis routes
│   │   │   ├── dependencies/             # Project + feature dependency graphs
│   │   │   ├── departments/              # Department CRUD
│   │   │   ├── invitations/              # Team invitation CRUD
│   │   │   ├── alerts/                   # Alert list
│   │   │   ├── billing/                  # Stripe checkout + portal
│   │   │   ├── cron/                     # Health check cron endpoint
│   │   │   └── webhooks/
│   │   │       ├── clerk/                # User/org sync
│   │   │       └── stripe/               # Subscription events
│   │   ├── share/[token]/                # Public project view (no auth)
│   │   ├── sign-in/                      # Clerk sign-in
│   │   └── sign-up/                      # Clerk sign-up
│   ├── lib/
│   │   ├── prisma.ts                     # Singleton PrismaClient
│   │   ├── auth.ts                       # getAuthContext(), requireProject()
│   │   ├── anthropic.ts                  # Anthropic SDK singleton
│   │   ├── stripe.ts                     # Stripe SDK + PLANS config
│   │   ├── health.ts                     # EVM engine (calculateHealth)
│   │   ├── metrics.ts                    # Aggregated health+financial metrics
│   │   ├── guardian.ts                   # Synchronous AI analysis
│   │   ├── guardian-agent.ts             # Agentic AI analysis (Tool Use)
│   │   ├── guardian-trigger.ts           # Fire-and-forget guardian trigger
│   │   ├── alert-engine.ts               # Alert generation + email delivery
│   │   ├── closure-report.ts             # AI closure report generation
│   │   ├── activity.ts                   # Audit log helper (logActivity)
│   │   ├── permissions.ts                # Role-based access control (can.*)
│   │   ├── validations.ts                # Zod schemas
│   │   └── rate-limit.ts                 # In-memory rate limiter
│   └── middleware.ts                     # Clerk auth + subscription gate
├── prisma/
│   ├── schema.prisma                     # Database schema
│   └── migrations/                       # Migration history
├── public/                               # Static assets
├── prisma.config.ts                      # Prisma configuration
├── next.config.ts                        # Next.js configuration
├── postcss.config.mjs                    # Tailwind v4 PostCSS
└── tsconfig.json                         # TypeScript config (@/* alias → src/)
```

---

## 3. Database Schema

### 3.1 Entity Relationship Overview

```
Organisation
  ├── Member (userId, organisationId, role)
  ├── Invitation
  ├── Department
  ├── Resource
  └── Project
        ├── Phase
        │     └── Sprint
        │           └── Feature ──── FeatureDependency
        ├── Risk
        ├── ResourceAssignment (project ↔ resource)
        ├── ProjectDepartment (project ↔ department)
        ├── ProjectDependency (project ↔ project)
        ├── Activity (audit log)
        ├── Alert
        ├── ProjectStatusLog
        ├── ProjectSnapshot
        └── GuardianReport
```

### 3.2 Key Models

**Organisation**
```
id, clerkOrgId (unique), name, slug (unique), logoUrl
stripeCustomerId, stripeSubscriptionId, stripePriceId
subscriptionStatus: FREE | PRO | BUSINESS | CANCELLED | PAST_DUE
trialEndsAt, currentPeriodEnd
```

**Project**
```
id, name, description, functionalAnalysis, startDate, endDate
status: NOT_STARTED | ACTIVE | PAUSED | COMPLETED | ARCHIVED | CLOSED
budgetTotal, costActual, revenueExpected, healthScore
shareToken (unique, nullable), shareEnabled
organisationId → Organisation
requestedById → User (nullable)

Indexes: (organisationId), (organisationId, status), (updatedAt)
```

**Sprint**
```
id, num, name, goal, startDate, endDate
status: UPCOMING | ACTIVE | DONE
order, projectId, phaseId

Indexes: (projectId), (projectId, status)
```

**Feature**
```
id, title, module, status: TODO|IN_PROGRESS|DONE|BLOCKED
priority: CRITICAL|HIGH|MEDIUM|LOW
order, notes, estimatedHours, actualHours
sprintId, assignedToId → Resource (nullable, SetNull on delete)

Indexes: (sprintId), (sprintId, status)
```

**Risk**
```
id, title, description, probability (1-5), impact (1-5)
status: OPEN | MITIGATED | CLOSED
mitigation, ownerId, ownerName, category
projectId

Indexes: (projectId), (projectId, status)
```

**GuardianReport**
```
id, projectId (unique), healthScore, riskLevel, onTrackProbability
estimatedDelay, alerts (JSON), recommendations (JSON)
summary, generatedAt, updatedAt
```

**Alert**
```
id, organisationId, projectId (nullable)
type, level, title, detail, action
read, emailSent, createdAt

Indexes: (organisationId), (projectId), (createdAt)
```

**Activity**
```
id, action, entity, entityId, entityName, meta (JSON)
userId, userName, projectId, organisationId, createdAt

Indexes: (organisationId), (organisationId, createdAt), (projectId)
```

### 3.3 Enums

```typescript
SubscriptionStatus: FREE | PRO | BUSINESS | CANCELLED | PAST_DUE
Role:               ADMIN | MANAGER | VIEWER
ProjectStatus:      NOT_STARTED | ACTIVE | PAUSED | COMPLETED | ARCHIVED | CLOSED
SprintStatus:       UPCOMING | ACTIVE | DONE
FeatureStatus:      TODO | IN_PROGRESS | DONE | BLOCKED
Priority:           CRITICAL | HIGH | MEDIUM | LOW
RiskStatus:         OPEN | MITIGATED | CLOSED
InviteStatus:       PENDING | ACCEPTED | EXPIRED
```

---

## 4. Authentication & Middleware

### 4.1 Clerk Integration

Authentication is handled entirely by Clerk. The `getAuthContext()` function in `src/lib/auth.ts` is the single entry point for all auth in API routes and server components:

```typescript
// Returns: { user, org, role } or null if unauthenticated
export async function getAuthContext()
```

On every call it:
1. Reads `userId` and `orgId` from Clerk session (`auth()`)
2. Fetches the Clerk user and organisation objects
3. Upserts the `User` and `Organisation` records into the database (Clerk → DB sync)
4. Upserts the `Member` record (creates with ADMIN role if first time)
5. Returns `{ user, org, role }`

**`requireProject()` helper** — org-isolated project fetch:
```typescript
export async function requireProject(projectId: string, orgId: string, include?)
// Returns project if it belongs to the org, null otherwise (→ 404)
```

### 4.2 Middleware

`src/middleware.ts` runs on every non-static request:

1. Public routes bypass auth: `/`, `/sign-in`, `/sign-up`, `/share/*`, `/api/webhooks/*`
2. All other routes call `auth.protect()` (Clerk redirects to sign-in if unauthenticated)
3. For non-billing routes: reads `sessionClaims.o.slg` (subscription status from session)
4. If status is `cancelled` or `past_due` → redirects to `/settings/billing`

```typescript
export const config = {
  matcher: ["/((?!_next|static assets).*)", "/(api|trpc)(.*)"],
};
```

---

## 5. API Reference

All API routes are Next.js Route Handlers under `src/app/api/`. All protected routes call `getAuthContext()` and return 401 if unauthenticated.

### 5.1 Projects

| Method | Path | Auth | Body/Params | Description |
|---|---|---|---|---|
| GET | `/api/projects` | Required | — | List all org projects with sprints and features |
| POST | `/api/projects` | ADMIN/MANAGER | `CreateProjectSchema` | Create project (AI-generated structure) |
| GET | `/api/projects/[id]` | Required | — | Get project with phases, sprints, features, status logs |
| PATCH | `/api/projects/[id]` | ADMIN/MANAGER | Partial project fields | Update project; logs status change; triggers closure report on CLOSED; auto-snapshots on deadline/budget change |
| DELETE | `/api/projects/[id]` | ADMIN | — | Delete project and all related data |

**PATCH `/api/projects/[id]` accepted fields:**
```typescript
{
  name?: string
  description?: string
  status?: ProjectStatus
  statusNote?: string        // logged with status transition
  budgetTotal?: number
  revenueExpected?: number
  requestedById?: string
  startDate?: string         // ISO date string
  endDate?: string           // ISO date string
}
```

### 5.2 Features

| Method | Path | Auth | Description |
|---|---|---|---|
| PATCH | `/api/features/[id]` | Required | Update feature; auto-advances sprint and project status; invalidates Guardian cache |

**PATCH body (`UpdateFeatureSchema`):**
```typescript
{
  status?:         "TODO" | "IN_PROGRESS" | "DONE" | "BLOCKED"
  priority?:       "CRITICAL" | "HIGH" | "MEDIUM" | "LOW"
  title?:          string       // max 255
  module?:         string       // max 100
  notes?:          string       // max 2000
  estimatedHours?: number       // min 0, max 10000
  actualHours?:    number       // min 0, max 10000
  assignedToId?:   string|null
}
```

**Side effects on PATCH:**
- If all features in sprint are DONE → sprint becomes DONE
- If any feature is IN_PROGRESS and sprint is UPCOMING → sprint becomes ACTIVE
- If all sprints DONE → project becomes COMPLETED
- `triggerGuardian(projectId)` called (fire-and-forget)
- `GuardianReport` deleted (cache invalidation)
- `revalidatePath` called for `/dashboard`, `/portfolio`, `/cost`

### 5.3 Sprints

| Method | Path | Auth | Description |
|---|---|---|---|
| PATCH | `/api/sprints/[id]` | ADMIN/MANAGER | Update sprint status, dates, goal |

### 5.4 Risks

| Method | Path | Auth | Body | Description |
|---|---|---|---|---|
| GET | `/api/projects/[id]/risks` | Required | — | List risks (org-isolated, sorted by severity) |
| POST | `/api/projects/[id]/risks` | ADMIN/MANAGER | `RiskSchema` | Create risk |

**POST body (RiskSchema):**
```typescript
{
  title:        string       // 1-200 chars
  description?: string
  probability:  number       // integer 1-5
  impact:       number       // integer 1-5
  mitigation?:  string
  ownerId?:     string
  ownerName?:   string
  category?:    string
}
```

### 5.5 Financial

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/projects/[id]/health` | Required | Full EVM health report + recommendations |
| PATCH | `/api/projects/[id]/financial` | ADMIN/MANAGER | Update budgetTotal, costActual, revenueExpected |

### 5.6 Guardian

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/guardian/[projectId]` | Required | Get or generate cached Guardian report |
| GET | `/api/guardian/[projectId]/trigger` | Required | Force-regenerate Guardian report |
| POST | `/api/guardian` | Required | Portfolio-wide Guardian analysis |
| GET | `/api/guardian/tasks` | Required | AI-generated dashboard insights |
| GET | `/api/guardian/alert` | Required | AI alert analysis |

### 5.7 Dependencies

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/dependencies/projects` | Required | Project-to-project dependency graph |
| GET | `/api/dependencies/features` | Required | Feature-to-feature dependency graph |

### 5.8 Snapshots

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/projects/[id]/snapshots` | Required | List all snapshots for a project |
| POST | `/api/projects/[id]/snapshots` | Required | Create a new snapshot |
| POST | `/api/projects/[id]/snapshots/[snapshotId]` | ADMIN/MANAGER | Restore a snapshot |

### 5.9 Team & Invitations

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/invitations` | Required | List pending invitations |
| POST | `/api/invitations` | ADMIN | Create and send invitation email |

### 5.10 Billing

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/billing/checkout` | ADMIN | Create Stripe Checkout session |
| POST | `/api/billing/portal` | ADMIN | Create Stripe Customer Portal session |

### 5.11 Webhooks

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/webhooks/clerk` | Svix signature | Sync user/org events from Clerk |
| POST | `/api/webhooks/stripe` | Stripe signature | Update subscription status from Stripe events |
| GET | `/api/cron/health-check` | Cron secret | Trigger alert engine for all orgs |

### 5.12 Share

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/projects/[id]/share` | ADMIN/MANAGER | Toggle share and generate/revoke token |
| GET | `/share/[token]` | None | Public read-only project view |

---

## 6. Core Library Reference

### 6.1 `calculateHealth(input: HealthInput): HealthReport`

Located: `src/lib/health.ts`

The EVM engine. Takes raw project metrics and returns a full `HealthReport`.

**Input:**
```typescript
interface HealthInput {
  startDate, endDate: Date | string
  totalFeatures, doneFeatures, blockedFeatures, inProgressFeatures: number
  totalSprints, doneSprints, activeSprints: number
  budgetTotal, costActual, costEstimated: number
  totalCapacityHours, totalActualHours: number
  openRisks, highRisks, maxRiskScore: number
}
```

**Output (HealthReport) key fields:**
```typescript
{
  status: HealthStatus          // ON_TRACK | AT_RISK | OFF_TRACK | COMPLETED | NOT_STARTED
  healthScore: number           // 0-100 composite score
  spi, cpi: number              // Schedule/Cost Performance Index
  eac, etc, vac: number         // Completion forecasts
  sv, cv: number                // Schedule/Cost variance ($)
  tcpi: number                  // To-Complete Performance Index
  daysLeft, delayDays: number
  plannedPct, progressNominal: number
  endForecast: Date
  forecastMode: string          // "velocity" | "overdue" | "time_vs_progress" | "insufficient"
  budgetRisk: BudgetRisk
  utilization: number           // team capacity %
  onTrackProbability: number    // 0-100
  alerts: HealthAlert[]         // auto-generated alerts from EVM thresholds
}
```

**Health score formula:**
```
healthScore = (scheduleHealth × 0.35) + (costHealth × 0.30) + (scopeHealth × 0.20) + (riskHealth × 0.15)
```

With hard caps: overdue → max 45, severe delay → max 35, critical budget → max 40, SPI<0.5 → max 35.

### 6.2 `analyzeProject(p: ProjectInput): Promise<GuardianProjectReport>`

Located: `src/lib/guardian.ts`

Sends EVM metrics to Claude and returns a structured report.

**Flow:**
1. Calls `calculateProjectMetrics(p)` to compute all EVM values
2. Builds structured prompt with all KPIs (project description included)
3. Calls `anthropic.messages.create()` with JSON-only instruction
4. Parses JSON response → returns `GuardianProjectReport`
5. On failure → falls back to `generateRuleBasedReport()` (deterministic, no AI)

**Model:** `process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-5"`

### 6.3 `runGuardianAgent(projectData): Promise<AgentReport>`

Located: `src/lib/guardian-agent.ts`

Agentic analysis using Anthropic Tool Use.

**Tools registered:**
```typescript
"get_project_metrics"       // EVM summary
"get_sprint_velocity"       // Sprint-by-sprint velocity trend
"get_risk_assessment"       // Full risk register breakdown
"get_resource_utilisation"  // Capacity and cost breakdown
"get_blocked_features"      // Blocked feature list
"get_snapshot_comparison"   // Change detection vs baseline
"get_dependency_graph"      // Feature dependency critical path
```

**Agentic loop:** Up to 5 iterations. The agent calls tools, receives results, and continues reasoning until it produces a final text response.

**Tool execution:** All tools are implemented as pure functions over the `projectData` object — no additional DB calls during the agent loop.

### 6.4 `runHealthCheck(organisationId, sendEmails): Promise<{checked, alerts}>`

Located: `src/lib/alert-engine.ts`

Scans all active projects for an org and creates alerts based on EVM thresholds.

**Deduplication:** Uses `wasRecentlySent(projectId, type, hours)` to query the last alert of the same type within the cooldown window before creating a new one.

**Email delivery:**
```typescript
export async function sendAlertEmails(organisationId, userEmail)
// Sends HTML email via Resend for all undelivered critical alerts
// Only marks emailSent=true after confirmed API success
```

**HTML output is XSS-safe** — all user-controlled values (project names, titles, alert details) are passed through `escapeHtml()` before interpolation.

### 6.5 `getAuthContext()`

Located: `src/lib/auth.ts`

Called at the top of every API route handler. Performs 3 DB upserts (user, org, member) on every call — acceptable for a low-traffic PMO tool but should be cached if scaling.

### 6.6 `can.*` Permissions

Located: `src/lib/permissions.ts`

```typescript
can.createProject(role)    // ADMIN | MANAGER
can.editProject(role)      // ADMIN | MANAGER
can.deleteProject(role)    // ADMIN
can.editFeature(role)      // ADMIN | MANAGER
can.editSprint(role)       // ADMIN | MANAGER
can.editFinancials(role)   // ADMIN | MANAGER
can.viewFinancials(role)   // always true
can.editRisks(role)        // ADMIN | MANAGER
can.editResources(role)    // ADMIN
can.editDependencies(role) // ADMIN | MANAGER
can.inviteMembers(role)    // ADMIN
can.removeMembers(role)    // ADMIN
can.viewBilling(role)      // ADMIN
can.editBilling(role)      // ADMIN
can.shareProject(role)     // ADMIN | MANAGER
```

### 6.7 `logActivity(options)`

Located: `src/lib/activity.ts`

Non-throwing audit log helper. All errors are caught and logged to `console.error` so activity logging never breaks the main request flow.

```typescript
await logActivity({
  organisationId, projectId, userId, userName,
  action,     // e.g., "project.status_changed"
  entity,     // e.g., "project"
  entityId, entityName,
  meta,       // any JSON-serialisable object
})
```

---

## 7. AI Integration Architecture

### 7.1 Model Configuration

All Claude API calls use:
```typescript
model: process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-5"
```

Exception: risk mitigation suggestions use `claude-haiku-4-5-20251001` directly (lower cost for simple suggestions).

Set `ANTHROPIC_MODEL` in `.env.local` to override globally.

### 7.2 Prompt Strategy

**Guardian analysis prompt:**
- Structured data dump of all EVM KPIs (no free-form user text in the prompt aside from project description)
- Instructs Claude to return ONLY valid JSON (no markdown wrapper)
- Health score is pre-computed and passed in — Claude is told not to change it, only to explain it
- Fallback: if JSON parsing fails, `generateRuleBasedReport()` is called deterministically

**Project generation prompt (AI Wizard):**
- Takes the user's functional analysis text
- Generates: phases (3–5), sprints per phase, features per sprint
- Output: complete JSON structure ready to insert into DB

**Closure report prompt:**
- Takes final project metrics (EVM snapshot)
- Generates: executive summary, delivery assessment, lessons learned, recommendations

### 7.3 Guardian Cache Strategy

```
Feature PATCH → delete GuardianReport → next GET regenerates
```

The `GuardianReport` table holds one row per project. On any feature update, the cache is cleared. The next call to `/api/guardian/[projectId]` will regenerate it.

This is a **write-through invalidation** pattern — no TTL, invalidated on data change. Suitable for low-to-medium update frequency. For high-frequency updates, consider debouncing the invalidation.

### 7.4 Error Handling in AI Calls

All AI calls are wrapped in try/catch:
- If the AI call fails (network, rate limit, model error) → log error, fall back to rule-based analysis
- If JSON parsing fails → same fallback
- The user always receives a report (AI or rule-based) — never a blank panel

---

## 8. Billing Architecture

### 8.1 Stripe Integration

```
User clicks "Upgrade" → POST /api/billing/checkout
  → stripe.checkout.sessions.create({ mode: "subscription" })
  → redirect to Stripe hosted checkout
  → Stripe webhook → POST /api/webhooks/stripe
  → update Organisation.subscriptionStatus
```

**Plan limits enforced at API layer:**
```typescript
// In /api/generate/route.ts (project creation)
const plan = PLANS[ctx.org.subscriptionStatus]
if (plan.projects !== -1 && count >= plan.projects) {
  return 403 "Project limit reached"
}
```

**Subscription statuses and middleware behaviour:**
- `FREE`, `PRO`, `BUSINESS` → normal access
- `CANCELLED`, `PAST_DUE` → middleware redirects all non-billing routes to `/settings/billing`

### 8.2 Webhook Events Handled

The Stripe webhook handler (`/api/webhooks/stripe`) processes:
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_succeeded`
- `invoice.payment_failed`

On each event it updates `Organisation.subscriptionStatus`, `stripeSubscriptionId`, `stripePriceId`, and `currentPeriodEnd`.

---

## 9. Data Flow Diagrams

### 9.1 Feature Status Update

```
Client PATCH /api/features/[id]
  │
  ├─ getAuthContext() → verify org membership
  ├─ fetch feature + sprint + project (with org check)
  ├─ validate body (UpdateFeatureSchema / Zod)
  ├─ db.feature.update(...)
  ├─ recalculate sprint status (auto-advance)
  ├─ recalculate project status (auto-complete)
  ├─ revalidatePath (dashboard, portfolio, cost)
  ├─ triggerGuardian(projectId) [fire-and-forget]
  ├─ db.guardianReport.deleteMany [cache invalidate]
  └─ return { ok: true }
```

### 9.2 Guardian Report Generation

```
GET /api/guardian/[projectId]
  │
  ├─ getAuthContext() → verify org
  ├─ check db.guardianReport (cache hit?)
  │   └─ yes → return cached report
  │
  ├─ fetch full project data (sprints, features, assignments, risks, snapshots)
  ├─ analyzeProject(projectInput)
  │   ├─ calculateProjectMetrics() [EVM sync]
  │   ├─ anthropic.messages.create() [AI call]
  │   │   └─ on failure → generateRuleBasedReport() [deterministic fallback]
  │   └─ return GuardianProjectReport
  │
  ├─ db.guardianReport.upsert(report)
  └─ return report
```

### 9.3 Alert Engine (Cron)

```
GET /api/cron/health-check (cron secret required)
  │
  ├─ fetch all organisations
  └─ for each org:
      ├─ runHealthCheck(orgId)
      │   ├─ fetch active projects with sprints, assignments, risks
      │   ├─ calculateHealth() for each project
      │   ├─ check alert conditions (overdue, SPI, CPI, blocked, milestone)
      │   ├─ wasRecentlySent() deduplication check
      │   ├─ db.alert.create() for new alerts
      │   └─ return { checked, alerts }
      └─ sendAlertEmails(orgId, adminEmail) [if sendEmails=true]
          ├─ fetch undelivered critical alerts
          ├─ resend.emails.send() [HTML, XSS-safe]
          └─ db.alert.updateMany({ emailSent: true }) [only on success]
```

### 9.4 Project Creation (AI Wizard)

```
POST /api/generate
  │
  ├─ getAuthContext() → check role + plan limits
  ├─ rateLimit(10 req/hour per org)
  ├─ validate body (CreateProjectSchema / Zod)
  ├─ anthropic.messages.create(generationPrompt)
  │   └─ returns: { phases, sprints[], features[], functionalAnalysis }
  ├─ db.$transaction([
  │   project.create,
  │   phase.createMany,
  │   sprint.createMany,
  │   feature.createMany
  │ ])
  ├─ logActivity("project.created")
  └─ return { projectId }
```

---

## 10. Security Controls

| Control | Implementation |
|---|---|
| Authentication | Clerk session validation on every request via `getAuthContext()` |
| Org isolation | All DB queries include `organisationId: ctx.org.id` filter |
| Role-based access | `can.*` checks in every mutation handler before DB write |
| Input validation | Zod schemas on all POST/PATCH body parsing |
| Risk probability/impact | Validated 1–5 integer at API layer (Zod `.int().min(1).max(5)`) |
| XSS prevention | `escapeHtml()` applied to all user data interpolated into HTML email templates |
| Webhook verification | Svix for Clerk webhooks, Stripe signature for Stripe webhooks |
| Rate limiting | 10 AI generation requests per org per hour (`rate-limit.ts`) |
| Share tokens | Random CUID tokens; org ownership verified before generation/revocation |
| SQL injection | Not applicable — Prisma ORM with parameterised queries throughout |
| CSRF | Next.js App Router + Clerk handles this via SameSite cookies |

---

## 11. Environment Variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | Neon PostgreSQL connection string (with pooling) |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Yes | Clerk public key |
| `CLERK_SECRET_KEY` | Yes | Clerk secret key |
| `CLERK_WEBHOOK_SECRET` | Yes | Svix webhook signing secret |
| `ANTHROPIC_API_KEY` | Yes | Anthropic Claude API key |
| `ANTHROPIC_MODEL` | No | Override Claude model (default: `claude-sonnet-4-5`) |
| `STRIPE_SECRET_KEY` | Yes | Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` | Yes | Stripe webhook signing secret |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Yes | Stripe publishable key |
| `RESEND_API_KEY` | Yes | Resend email API key |
| `NEXT_PUBLIC_APP_URL` | Yes | Full public URL (e.g., `https://app.roadmapai.com`) — used in email links and auto-snapshot trigger |
| `CRON_SECRET` | Yes | Secret for authenticating cron endpoint |

---

## 12. Performance Considerations

### 12.1 Database Indexes

The following indexes are in place (added in migration `20260408082831_add_performance_indexes`):

| Table | Index | Purpose |
|---|---|---|
| `projects` | `(organisationId)` | All org-scoped project queries |
| `projects` | `(organisationId, status)` | Dashboard filtered queries |
| `projects` | `(updatedAt)` | Default sort order |
| `sprints` | `(projectId)` | Sprint lookups per project |
| `sprints` | `(projectId, status)` | Status-filtered sprint queries |
| `features` | `(sprintId)` | Feature lookups per sprint |
| `features` | `(sprintId, status)` | Status-filtered feature queries |
| `risks` | `(projectId)` | Risk lookups per project |
| `risks` | `(projectId, status)` | Status-filtered risk queries |
| `activities` | `(organisationId)` | Activity feed queries |
| `activities` | `(organisationId, createdAt)` | Time-ordered activity queries |
| `activities` | `(projectId)` | Per-project activity |
| `alerts` | `(organisationId)` | Alert feed queries |
| `alerts` | `(projectId)` | Per-project alert queries |
| `alerts` | `(createdAt)` | Time-ordered alert queries |

### 12.2 Health Score Computation

`calculateHealth()` is a pure synchronous function — no DB calls. It runs per project in the dashboard map. For large portfolios (50+ projects), consider:
- Caching health scores in the `Project.healthScore` column (currently stored but not always kept in sync)
- Running health computation in a background job and reading the cached value

### 12.3 AI Call Latency

Guardian report generation involves a Claude API round-trip (1–5s). Mitigations in place:
- Reports are cached in `GuardianReport` (invalidated on feature change only)
- Dashboard and portfolio views do not call the AI — they use the EVM engine synchronously
- Guardian panel loads asynchronously after the project page is rendered

### 12.4 Neon Serverless

The app uses `@prisma/adapter-neon` for HTTP-based serverless connections. This eliminates cold-start connection overhead at the cost of slightly higher per-query latency vs persistent connections. Suitable for serverless/edge deployment on Vercel.

---

## 13. Deployment

The application is built for deployment on **Vercel** (inferred from Next.js App Router, Neon serverless adapter, and edge-compatible middleware).

**Recommended deployment checklist:**
1. Set all environment variables in Vercel project settings
2. Configure Clerk webhook endpoint: `https://[domain]/api/webhooks/clerk`
3. Configure Stripe webhook endpoint: `https://[domain]/api/webhooks/stripe`
4. Set up a cron job to hit `GET /api/cron/health-check` (with `Authorization: Bearer [CRON_SECRET]`) daily or hourly
5. Run `npx prisma migrate deploy` in the build pipeline (or manually after migration files are committed)
6. Ensure `NEXT_PUBLIC_APP_URL` matches the deployed domain exactly (used in email links and auto-snapshot fetches)

**Build command:** `next build`  
**Output:** Static + serverless functions (Next.js default)

---

## 14. Known Technical Debt

| Item | Severity | Notes |
|---|---|---|
| `getAuthContext()` performs 3 upserts per request | Medium | Acceptable at current scale; add a session-scoped cache if DB load increases |
| Guardian invalidation is eager (any feature change) | Low | High-frequency updates cause repeated Claude API calls; add debounce if needed |
| `ProjectStatusLog.changedBy` stores display name, not user ID | Low | Name changes don't retroactively update logs |
| `GuardianReport` stores alerts as JSON | Low | Cannot query individual alert types at DB level; parsing required in application code |
| No background job processor | Low | Closure reports and auto-snapshots are fire-and-forget fetches; a proper queue (e.g., Trigger.dev) would improve reliability |
| `viewFinancials` always returns true | Info | Intentional design decision — all members can view financials |
