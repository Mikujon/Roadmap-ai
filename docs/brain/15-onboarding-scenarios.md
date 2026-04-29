# Onboarding Scenarios

This file defines the flows for new users, new organisations, new projects, and new team members. Guardian AI can guide users through these flows in the chat interface.

---

## 1. New Organisation Onboarding

### Flow

```
User signs up with Clerk
  │
  ├─ Has orgId? → Skip to app
  │
  └─ No orgId → /setup page
       │
       └─ Clerk CreateOrganization component
            └─ orgId assigned → redirect to /onboarding
                 │
                 └─ projectCount > 0? → /dashboard (already onboarded)
                                      → Show onboarding wizard
```

### Onboarding Wizard Steps (at `/onboarding`)

1. **Welcome** — Org name display, platform overview
2. **Create first project** — Name, dates, brief description
3. **Invite team** — Optional: invite PMO/DEV members
4. **Done** — Redirect to `/dashboard`

Completion signal: `projectCount > 0` (project creation = onboarding complete).  
`Organisation.onboardingCompleted` field exists but is secondary — project creation is the real gate.

### Database State After Onboarding

```
Organisation { clerkOrgId, name, slug, onboardingCompleted: false initially }
  └─ Member { userId, organisationId, role: "ADMIN" } ← org creator
       └─ Project { name, startDate, endDate, ... }
            └─ Phases (3 default)
                 └─ Sprints (6 default: 2 per phase)
                      └─ Features (4 default: Sprint 1)
```

### Existing Orgs

All orgs created before the onboarding feature was shipped have `onboardingCompleted = true` (backfilled via SQL migration). They skip the wizard.

---

## 2. New Project Onboarding

### What Gets Created Automatically (POST /api/projects)

```
1. Project record
   { name, brief, startDate, endDate, budgetTotal, revenueExpected, organisationId }

2. Phases (3 default if not provided)
   Phase 1: Planning    — "Architecture, design, infrastructure setup"
   Phase 2: Development — "Backend API, frontend, auth, database"
   Phase 3: QA & Launch — "Testing, deployment, documentation"

3. Sprints (2 per phase = 6 total)
   Sprint 1.1: ACTIVE  ← first sprint always starts active
   Sprint 1.2, 2.1, 2.2, 3.1, 3.2: UPCOMING
   Each sprint: 14 days, sequential from startDate

4. Features (4 default in Sprint 1)
   - "Project kickoff & team alignment"  [HIGH priority]
   - "Requirements gathering"             [HIGH priority]
   - "Technical architecture review"     [MEDIUM priority]
   - "Development environment setup"     [MEDIUM priority]

5. Guardian AI analysis triggered (triggerAgents("project_created", ...))
```

### PM Next Steps After Project Creation

Guardian recommends in this order:

1. **Add project brief** — If `briefText` is empty, Guardian cannot generate meaningful FA or analysis
2. **Set budget** — Without `budgetTotal`, EVM cost metrics are disabled
3. **Add team members** — Invite DEVs, assign features; empty `assignments` disables resource utilisation
4. **Customise phases** — Default phases are generic; rename to match actual project phases
5. **Refine Sprint 1 backlog** — Replace default features with real project tasks
6. **Log initial risks** — Every project starts with at least 1–2 known risks
7. **Generate Functional Analysis** — Start the FA workflow if this is a client-facing project

---

## 3. New Team Member Onboarding

### Invitation Flow

```
PMO/ADMIN → InviteForm → POST /api/invitations
  └─ Invitation record created { email, role, expiresAt, token }
       └─ Email sent via Resend
            └─ Recipient clicks link → Clerk signup/login
                 └─ Clerk webhook: organizationMembership.created
                      └─ Member record created { role: "PMO" (default) or "ADMIN" }
```

### Role Assignment at Invitation

| Invitation role | Member gets |
|----------------|-------------|
| PMO | PMO |
| CEO | CEO |
| STAKEHOLDER | STAKEHOLDER |
| DEV | DEV |
| ADMIN | ADMIN |

Default for new Clerk org members (not invited, just joined): `PMO`.

### First Login Experience by Role

**PMO**: Dashboard with all projects, Guardian analysis visible, full sidebar  
**CEO**: Portfolio view (no board/backlog), financial KPIs prominent  
**STAKEHOLDER**: Limited sidebar, sees only their projects, alert-focused  
**DEV**: My Tasks view, board access, no financial data  
**ADMIN**: Full access including billing and settings

### Feature Assignment for DEV

A DEV member sees only projects where features are assigned to `their user.id`.  
Until assigned, they see an empty dashboard.

Guardian recommends: "Assign features to your developers in the Board tab before they log in for the first time."

---

## 4. New Sprint Onboarding

When a sprint changes status from UPCOMING → ACTIVE:

**Automatic**:
- Previous sprint's DONE features remain DONE
- IN_PROGRESS features from previous sprint do NOT auto-carry — PM must manually move them

**Guardian advice at sprint start**:
- "Sprint [N] starts today with [X] features planned. Based on your velocity of [V] features/sprint, you can realistically complete [V×0.8] features. Consider descoping [N-V×0.8] features."
- Identify features without assignees
- Identify features that have dependencies on the previous sprint's unfinished work

**Guardian advice at sprint end**:
- Summary of what was completed vs planned
- Velocity comparison to previous sprints
- Recommendations for next sprint planning

---

## 5. Org Configuration Onboarding

### UI Config (Settings > General)

After org creation, customise:
- `uiTheme`: light (default) / dark
- `uiPrimaryColor`: #006D6B (default teal)
- `uiLanguage`: en (default)
- `uiCurrency`: EUR (default)
- `uiDateFormat`: DD/MM/YYYY (default)
- `brandColor`: override Guardian accent color

Changes apply immediately via CSS variable injection — no reload needed.

### API Key (Settings > Integrations)

For ambient intelligence:
1. Navigate to Settings > Integrations
2. Copy API key (format: `rmai_<32 chars>`)
3. Configure your Slack bot / Jira webhook / email forwarding
4. Test with: `POST /api/mcp/schema` (no auth) → confirms endpoint is reachable
5. Send a test event to `/api/mcp/ingest` and check the Ingestion Log

Guardian can walk through this via chat: "How do I connect Slack to RoadmapAI?"

---

## Guardian Onboarding Guidance

When a user is new (first session, empty dashboard), Guardian proactively:

1. Greets the user by role
2. Explains what they can see (role-appropriate)
3. Suggests the most important first action:
   - PMO: "Create your first project to get started"
   - CEO: "Your portfolio is ready — invite your PMO to create projects"
   - DEV: "You have no assigned tasks yet — ask your PM to assign features to you"
   - STAKEHOLDER: "You'll see your projects here once your PM adds you to them"

Guardian does NOT overwhelm new users with all features at once. One action at a time.
