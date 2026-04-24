# RoadmapAI — Frontend Map & Architecture
_Last updated: April 2026_

---

## Stack
- **Framework**: Next.js 16 App Router (src/)
- **Auth**: Clerk
- **DB**: PostgreSQL (Neon) + Prisma 6
- **AI**: Anthropic Claude (claude-sonnet-4-5)
- **Payments**: Stripe
- **Email**: Resend
- **Styling**: Inline styles + CSS vars (no Tailwind)
- **Fonts**: DM Sans (UI) + DM Mono (metrics)
- **Primary color**: #006D6B

---

## Directory structure

```
src/
├── app/
│   ├── (app)/                    ← authenticated routes
│   │   ├── layout.tsx            ← sidebar + topbar shell
│   │   ├── dashboard/            ← role-based dashboards
│   │   ├── portfolio/            ← portfolio views
│   │   ├── cost/                 ← org-level financials
│   │   ├── alerts/               ← notification center
│   │   ├── archive/              ← closed projects
│   │   ├── my-tasks/             ← DEV role task view
│   │   ├── roadmap/              ← product roadmap
│   │   ├── projects/
│   │   │   ├── new/              ← project wizard
│   │   │   └── [id]/             ← project detail
│   │   │       ├── board/
│   │   │       ├── risks/
│   │   │       ├── financials/
│   │   │       ├── governance/
│   │   │       ├── functional-analysis/
│   │   │       └── documents/
│   │   └── settings/
│   │       ├── team/
│   │       ├── integrations/
│   │       ├── billing/
│   │       ├── departments/
│   │       └── org/
│   ├── share/[token]/            ← public project share
│   ├── sign-in/ sign-up/         ← Clerk auth pages
│   ├── invite/[token]/           ← invitation acceptance
│   ├── layout.tsx                ← root layout
│   └── page.tsx                  ← root redirect
├── lib/                          ← business logic
└── components/                   ← shared UI components
```

---

## Pages inventory

### Public routes
| Route | File | Description |
|-------|------|-------------|
| `/` | `page.tsx` | Redirects to /dashboard |
| `/sign-in` | `sign-in/[[...sign-in]]/page.tsx` | Clerk sign in |
| `/sign-up` | `sign-up/[[...sign-up]]/page.tsx` | Clerk sign up |
| `/share/[token]` | `share/[token]/page.tsx` | Public project view |
| `/invite/[token]` | _(missing — needs creation)_ | Invitation acceptance |

### Authenticated routes (require Clerk session)

#### Dashboard
| Route | File | Role | Description |
|-------|------|------|-------------|
| `/dashboard` | `dashboard/page.tsx` | ALL | Role-based insights hub |
| — | `dashboard/DashboardClient.tsx` | PMO | Full PMO dashboard |
| — | `dashboard/CEODashboard.tsx` | CEO | Portfolio overview |
| — | `dashboard/CEOInsights.tsx` | CEO | KPIs + decisions |
| — | `dashboard/StakeholderDashboard.tsx` | STK | My projects view |
| — | `dashboard/StakeholderInsights.tsx` | STK | Project status cards |
| — | `dashboard/DevDashboard.tsx` | DEV | My tasks today |
| — | `dashboard/DevInsights.tsx` | DEV | Sprint + task focus |
| — | `dashboard/DecisionsCard.tsx` | PMO | Guardian AI decisions |
| — | `dashboard/ProjectsList.tsx` | PMO | Portfolio list widget |
| — | `dashboard/InsightsList.tsx` | PMO | AI insights list |

#### Portfolio
| Route | File | Role | Description |
|-------|------|------|-------------|
| `/portfolio` | `portfolio/page.tsx` | PMO/CEO | Project list with EVM |
| — | `portfolio/PortfolioClient.tsx` | ALL | Interactive table |
| `/portfolio/gantt` | `portfolio/gantt/page.tsx` | PMO | Portfolio Gantt chart |
| `/portfolio/quarter` | `portfolio/quarter/page.tsx` | CEO/PMO | Q1-Q4 planned vs realized |

#### Financials
| Route | File | Role | Description |
|-------|------|------|-------------|
| `/cost` | `cost/page.tsx` | PMO/CEO | Org-level EVM aggregated |
| `/cost/[id]` | `cost/[id]/page.tsx` | PMO | Cost detail |
| `/cost/new` | `cost/new/page.tsx` | PMO | New cost entry |

#### Alerts
| Route | File | Role | Description |
|-------|------|------|-------------|
| `/alerts` | `alerts/page.tsx` | ALL | Notification center |
| — | `alerts/AlertsClient.tsx` | ALL | Alert list + filters |

#### Archive
| Route | File | Role | Description |
|-------|------|------|-------------|
| `/archive` | `archive/page.tsx` | PMO/CEO | Closed projects |
| — | `archive/ClosureReport.tsx` | PMO | AI closure report modal |

#### Projects
| Route | File | Role | Description |
|-------|------|------|-------------|
| `/projects/new` | `projects/new/page.tsx` | PMO | 5-step wizard |
| `/projects/[id]` | `projects/[id]/page.tsx` | ALL | Project detail hub |
| — | `projects/[id]/OverviewView.tsx` | ALL | KPIs + phases + sprint |
| — | `projects/[id]/ProjectOverviewClient.tsx` | ALL | Overview client |
| — | `projects/[id]/BoardView.tsx` | PMO/DEV | Kanban board |
| — | `projects/[id]/board/BoardClient.tsx` | PMO/DEV | Board client |
| — | `projects/[id]/BacklogView.tsx` | PMO | Backlog management |
| — | `projects/[id]/FinancialsView.tsx` | PMO/CEO | EVM metrics |
| — | `projects/[id]/financials/FinancialsClient.tsx` | PMO | Financials client |
| — | `projects/[id]/GovernanceView.tsx` | PMO | Dependencies+RACI+audit |
| — | `projects/[id]/governance/GovernanceClient.tsx` | PMO | Governance client |
| — | `projects/[id]/RoadmapClient.tsx` | ALL | Project timeline |
| — | `projects/[id]/GuardianPanel.tsx` | PMO | AI analysis panel |
| — | `projects/[id]/HealthDecisionsView.tsx` | PMO | Health + decisions |
| — | `projects/[id]/risks/RisksClient.tsx` | PMO | Risk register |
| — | `projects/[id]/functional-analysis/FAClient.tsx` | PMO | FA document |
| — | `projects/[id]/documents/DocumentsClient.tsx` | ALL | Document manager |
| — | `projects/[id]/ErrorBoundary.tsx` | ALL | Error boundary |

#### Settings
| Route | File | Role | Description |
|-------|------|------|-------------|
| `/settings` | `settings/page.tsx` | ADMIN | Settings hub (6 tabs) |
| — | `settings/SettingsMainClient.tsx` | ADMIN | Profile+Org+Guardian+etc |
| `/settings/team` | `settings/team/page.tsx` | ADMIN | Members + invitations |
| — | `settings/team/TeamPageClient.tsx` | ADMIN | Team management |
| — | `settings/team/InviteForm.tsx` | ADMIN | Invite modal |
| `/settings/integrations` | `settings/integrations/page.tsx` | ADMIN | Tool connectors |
| `/settings/billing` | `settings/billing/page.tsx` | ADMIN | Stripe subscription |
| `/settings/departments` | `settings/departments/page.tsx` | ADMIN | Org departments |
| `/settings/org` | `settings/org/page.tsx` | ADMIN | Org settings + branding |
| — | `settings/org/OrgSettingsClient.tsx` | ADMIN | Org form |

#### Other
| Route | File | Role | Description |
|-------|------|------|-------------|
| `/my-tasks` | `my-tasks/page.tsx` | DEV | Dev task list |
| — | `my-tasks/MyTasksClient.tsx` | DEV | Task client |
| `/roadmap` | `roadmap/page.tsx` | ALL | Product roadmap |
| `/onboarding` | `onboarding/page.tsx` | NEW | First-time setup |

---

## Shared layout components

| File | Description |
|------|-------------|
| `layout.tsx` | Sidebar + topbar shell, auth guard, project list |
| `TopbarClient.tsx` | Logo, nav links, role switcher, notifications, search |
| `SidebarNav.tsx` | Navigation link items with active state |
| `SidebarUserButton.tsx` | User avatar + org switcher |
| `MobileSidebar.tsx` | Mobile drawer navigation |
| `NotificationBell.tsx` | Bell icon + slide-in notification drawer |
| `PortfolioSubNav.tsx` | Portfolio sub-navigation (List/Gantt/Quarter) |
| `workspace-pages.tsx` | Archive, Team, Integrations, Billing pages |

---

## Role visibility matrix

| Page | PMO | CEO | STK | DEV |
|------|-----|-----|-----|-----|
| Dashboard | Full | Portfolio KPIs + decisions | My projects only | My tasks only |
| Portfolio | Full table | Simplified + quarter view | Hidden | Hidden |
| Portfolio Gantt | ✓ | ✓ | ✗ | ✗ |
| Portfolio Quarter | ✓ | ✓ | ✗ | ✗ |
| Cost/Financials | ✓ | ✓ summary | ✗ | ✗ |
| Alerts | All alerts | Critical only | Their projects | Their tasks |
| Archive | ✓ | ✓ | Their projects | ✗ |
| My Tasks | ✗ | ✗ | ✗ | ✓ |
| Project Overview | Full | Summary | Their projects | Assigned only |
| Project Board | ✓ | ✗ | ✗ | ✓ |
| Project Risks | ✓ | Summary | ✗ | ✗ |
| Project Financials | ✓ | ✓ | ✗ | ✗ |
| Project Governance | ✓ | ✓ | ✗ | ✗ |
| Functional Analysis | ✓ | ✓ | Read only | ✗ |
| Documents | ✓ | ✓ | Read only | Read only |
| Settings | Full | Limited | ✗ | ✗ |
| Settings Team | ✓ | ✓ | ✗ | ✗ |
| Settings Billing | ✓ | ✓ | ✗ | ✗ |
| Settings Integrations | ✓ | ✗ | ✗ | ✗ |
| Roadmap | ✓ | ✓ | ✓ | ✓ |

---

## Missing pages (to build)

| Route | Priority | Description |
|-------|----------|-------------|
| `/invite/[token]` | HIGH | Invitation acceptance page |
| `/projects/[id]/gantt` | HIGH | Project Gantt with dependencies |
| `/projects/[id]/timeline` | MEDIUM | Stakeholder timeline view |
| `/projects/[id]/sprint-week` | MEDIUM | Sprint week view |
| `/projects/[id]/chat` | HIGH | Internal project chat |
| `/api-docs` | LOW | API documentation |
| `/admin` | LOW | Super admin panel |

---

## Component duplication to resolve

`src/` has duplicate implementations of some pages:
- `OverviewView.tsx` AND `ProjectOverviewClient.tsx` → merge into one
- `GovernanceView.tsx` AND `GovernanceClient.tsx` → merge into one
- `FinancialsView.tsx` AND `FinancialsClient.tsx` → merge into one
- `BoardView.tsx` AND `board/BoardClient.tsx` → merge into one

Resolution: keep `*View.tsx` (has more logic from apps/web),
deprecate `*Client.tsx` wrappers.

---

## Headless API readiness

### Current state
All data is server-side rendered. No public API.

### Target state (Phase 2)
Every page has a corresponding API endpoint:
- `GET /api/v1/projects` → portfolio data
- `GET /api/v1/projects/[id]` → project detail
- `GET /api/v1/projects/[id]/health` → EVM metrics
- `GET /api/v1/dashboard/[role]` → role-based insights
- `POST /api/v1/ai/chat` → AI assistant with tool use

### Frontend config (Phase 3)
Store per-org UI preferences:
```typescript
interface OrgUIConfig {
  theme: "light" | "dark" | "auto"
  primaryColor: string
  logo: string
  defaultDashboardRole: string
  visibleModules: string[]
  dashboardWidgets: WidgetConfig[]
  language: string
}
```

---

## AI Chat with tool use (Phase 3)

The AI assistant can directly modify the DB via function calling:

```typescript
const tools = [
  { name: "create_risk", description: "Add a risk to a project" },
  { name: "update_feature_status", description: "Update task status" },
  { name: "create_scope_change", description: "Request scope change" },
  { name: "add_team_member", description: "Assign person to project" },
  { name: "generate_report", description: "Generate Guardian AI report" },
  { name: "query_data", description: "Query project data and return insights" },
]
```

User: "Add a critical risk for the ERP dependency on Customer Portal"
→ Claude calls create_risk({ projectId, title, probability: 4, impact: 5 })
→ Returns: "Risk added — score 20, CRITICAL. I've also created an alert for Laura."

---

## MCP Server (Phase 4)

Expose RoadmapAI as MCP server so external agents can connect:

```
Customer activates agent in settings →
Agent connects to their tools (Jira/Gmail/Slack/etc) →
Agent reads updates →
Posts to RoadmapAI MCP endpoints →
Guardian AI processes and updates projects
```

MCP endpoints needed:
- `mcp://roadmapai/projects/update`
- `mcp://roadmapai/risks/create`
- `mcp://roadmapai/features/update`
- `mcp://roadmapai/messages/ingest`

---

## DB comments status

| Table | Commented | Priority |
|-------|-----------|----------|
| projects | ✗ | HIGH |
| sprints | ✗ | HIGH |
| features | ✗ | HIGH |
| risks | ✗ | HIGH |
| alerts | ✗ | HIGH |
| users | ✗ | MEDIUM |
| organisations | ✗ | MEDIUM |
| guardian_reports | ✗ | MEDIUM |
| activities | ✗ | LOW |
| project_snapshots | ✗ | LOW |

See: docs/database-comments.sql for full comment script.
