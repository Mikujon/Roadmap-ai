# Roles & Behaviour

Source: `src/lib/permissions.ts` — `can`, `sidebarItems`, `projectTabs`, `dashboardConfig`

Each role represents a distinct perspective on the project portfolio. Guardian AI adapts its output — level of detail, tone, focus — to the role of the requesting user.

---

## Role Overview

| Role | Represents | Primary concern |
|------|-----------|-----------------|
| **ADMIN** | Org owner, IT, billing | Everything — full access |
| **PMO** | Project Manager, Scrum Master | Delivery, velocity, risks, team |
| **CEO** | Executive sponsor, C-suite | Portfolio health, financials, strategic decisions |
| **STAKEHOLDER** | Client, product owner, sponsor | Their projects, milestones, documents |
| **DEV** | Developer, designer | Their assigned tasks, blockers |

---

## What Each Role Sees

### ADMIN
- Full sidebar: dashboard, portfolio, cost, alerts, archive, roadmap, all settings
- All project tabs: Overview, Board, Backlog, Risks, Financials, Governance, FA, Docs, Chat
- Can: everything including delete, billing, role management, API key regeneration

### PMO
- Sidebar: dashboard, portfolio, cost, alerts, archive, roadmap, team settings, integrations, billing, settings
- Project tabs: Overview, Board, Backlog, Risks, Financials, Governance, FA, Docs, Chat
- Can: create/edit projects, manage sprints, risks, features, invite members
- Cannot: delete projects, manage roles, change billing

### CEO
- Sidebar: dashboard, portfolio, cost, alerts, archive, roadmap, settings
- Project tabs: Overview, Financials, Governance
- Can: view all projects and financials, approve budgets and scope
- Cannot: edit features, create risks, manage sprints

### STAKEHOLDER
- Sidebar: dashboard, alerts, roadmap
- Project tabs: Overview, Docs, FA
- Can: view their own projects only (where they are `requestedById` or in `assignments`)
- Cannot: view financials, edit anything

### DEV
- Sidebar: dashboard, my-tasks, alerts
- Project tabs: Overview, Board, Chat
- Can: update task status (their assigned features), view board
- Cannot: view financials, risks, governance, create features

---

## Guardian AI Tone by Role

### For PMO
- Operational detail: SPI, CPI, sprint-level analysis
- Specific action items: "Move [feature X] to IN_PROGRESS, assign to [dev Y]"
- Risk register entries with probability/impact
- Sprint velocity trend

### For CEO
- Executive summary only: overall health score, budget exposure, % on-track
- Financial framing: "Budget variance is €X across the portfolio"
- Strategic framing: "3 of 7 projects are AT_RISK — recommend executive review"
- No sprint-level detail
- Focus on decisions needed, not operational tasks

### For STAKEHOLDER
- Milestone-focused: "Sprint 3 ends on [date]. You are at [X]% completion."
- Budget summary (not detailed cost breakdown)
- Document status: "Your FA is pending approval"
- Plain language, no PMO jargon

### For DEV
- My tasks only: "You have 3 assigned features. 1 is BLOCKED."
- Sprint focus: "Sprint 2 ends in 4 days. You have 2 TODO items."
- No financial information
- Practical: "What can I do today?"

---

## Permission Quick Reference

```typescript
can.createProject      → ADMIN, PMO
can.editProject        → ADMIN, PMO
can.deleteProject      → ADMIN
can.viewAllProjects    → ADMIN, PMO, CEO
can.viewFinancials     → ADMIN, PMO, CEO
can.editBudget         → ADMIN, PMO
can.approveBudget      → ADMIN, CEO
can.manageSprints      → ADMIN, PMO
can.updateTaskStatus   → ADMIN, PMO, DEV
can.createRisk         → ADMIN, PMO
can.viewRisks          → ADMIN, PMO, CEO
can.approveScope       → ADMIN, CEO, PMO
can.approveDocuments   → ADMIN, CEO, PMO
can.inviteMembers      → ADMIN, PMO
can.removeMembers      → ADMIN
can.manageRoles        → ADMIN
can.manageSettings     → ADMIN
can.viewBilling        → ADMIN, CEO
can.manageIntegrations → ADMIN, PMO
```

---

## Role-Specific Dashboard Focus

| Role | Dashboard shows |
|------|----------------|
| PMO | Decisions feed, all projects, financials, team management panel, full Guardian analysis |
| CEO | Portfolio KPIs, budget exposure, strategic decisions, revenue vs cost, all projects |
| STAKEHOLDER | Own projects only, milestones, documents, no budget detail |
| DEV | My tasks only, sprint progress, blocked tasks, no financials |
| ADMIN | Everything |

---

## New Member Defaults

When a new member joins via Clerk invitation webhook:
- Default role: `PMO` (not VIEWER — replaced by PMO in RBAC migration)
- Admin invitation (Clerk `org:admin`): role = `ADMIN`

Default role can be changed by ADMIN via Settings > Team > Edit Role.
