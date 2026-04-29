# Communication Types

Effective PM communication requires the right message, to the right person, at the right time, in the right format. This file defines the communication types that Guardian AI supports, recommends, and can generate.

---

## Communication Channels in RoadmapAI

| Channel | Implementation | Audience |
|---------|---------------|----------|
| **In-app alerts** | Alert table → TopBar bell icon | All authenticated users |
| **Email digest** | Resend → `sendAlertEmails()` | Org email (critical alerts only) |
| **Guardian chat** | AI chat panel (✦ button) | PMO, DEV (any authenticated) |
| **Guardian report** | GuardianReport stored in DB | PMO, CEO (via project page) |
| **Closure report** | Auto-generated on CLOSE | PMO, ADMIN, STAKEHOLDER |
| **Ambient ingestion** | MCP endpoint | External systems → PM |
| **Functional Analysis** | FA workflow | Stakeholder-facing deliverable |

---

## Meeting Types & Guardian Support

### 1. Daily Standup (15 min)
**Purpose**: What did we do? What's blocked? What's next?  
**Guardian input**:
- List of BLOCKED features per developer
- Features moved to DONE since yesterday
- Sprint completion % and days remaining

**Sample Guardian output**:
```
Sprint 2 — Day 8 of 14 (57% elapsed)
Progress: 5 of 9 features done (56%) — on track ✓
Blocked: Feature "API Integration" (Alice, 2 days)
In Progress: "Dashboard UI" (Bob), "Auth flow" (Carol)
Sprint completion forecast: 89% at current velocity
```

### 2. Sprint Review (end of sprint)
**Purpose**: Demonstrate completed work, get feedback, accept/reject items.  
**Guardian input**:
- Sprint summary: features done/total, velocity vs previous sprints
- Carryover items
- EVM update for sprint period

### 3. Sprint Retrospective
**Purpose**: Improve team process.  
**Guardian input**:
- Velocity trend over last 3 sprints
- Blocked items count trend
- Most common blocker categories this sprint

### 4. Stakeholder Status Meeting
**Purpose**: Communicate progress to client/sponsor.  
**Guardian input**:
- Health score and status (ON_TRACK/AT_RISK/OFF_TRACK)
- Milestone progress: Sprint X of Y done
- Budget status: on/over/under budget
- Next milestone: Sprint X ends [date] with these deliverables

**What NOT to include for STAKEHOLDER role**:
- Internal team velocity
- EVM technical metrics (SPI/CPI — rephrase as plain language)
- Resource utilisation details
- Internal risk details (unless directly affecting client)

### 5. Executive Portfolio Review
**Purpose**: CEO/board visibility on portfolio health.  
**Guardian input**:
- Portfolio KPIs: N projects, N on track, N critical
- Budget exposure across portfolio
- Top 3 projects requiring executive attention
- Strategic recommendations

### 6. Risk Review
**Purpose**: Review open risks, assign mitigations, close resolved risks.  
**Guardian input**:
- All OPEN risks sorted by score (probability × impact)
- Risks without mitigation text (unactionable risks)
- Risks open > 14 days with no update
- New risks from ambient intelligence

---

## Communication Cadences by Role

| Role | Frequency | Channel | Content |
|------|-----------|---------|---------|
| PMO | Daily | Dashboard + Guardian chat | Operational detail, blockers, SPI/CPI |
| CEO | Weekly | Portfolio dashboard + email digest | KPIs, budget exposure, strategic decisions |
| STAKEHOLDER | Weekly or milestone | Status report | Progress %, next milestones, documents ready |
| DEV | Daily | My tasks view + Guardian chat | Their tasks, blockers, sprint progress |
| ADMIN | As needed | Full dashboard + alerts | System health, billing, team management |

---

## Alert Communication Rules

**Critical alerts** (level = `critical`):
- Stored immediately in Alert table
- Email sent within minutes via `sendAlertEmails()`
- Visible in TopBar bell icon with count badge
- Deduped: same alert not sent within 24h (12h for team_blocked)

**Warning alerts** (level = `warning`):
- Stored in Alert table
- NOT emailed
- Visible in TopBar bell icon
- Intended for PM to see at next login

**Info alerts** (level = `info`):
- Stored in Alert table
- No notification
- Informational context only

---

## Tone & Language Guidelines

### For PMO (operational)
- Use PM terminology: SPI, CPI, EVM, sprint velocity, backlog
- Be specific: exact numbers, feature names, dates
- Action-oriented: "Do X by Friday"
- Direct: "This sprint is behind. Here's why."

### For CEO (strategic)
- Translate metrics: "CPI = 0.85" → "We're spending 18% more than planned"
- Use money and time, not percentages
- Frame around decisions needed
- Business impact: "This delay costs €X in opportunity cost"

### For STAKEHOLDER (client-facing)
- Plain language: no PMO jargon
- Milestone-focused: "Phase 2 is 70% complete"
- Positive framing when possible
- Manage expectations gently: "We're tracking a 5-day delay — we're addressing it"

### For DEV (tactical)
- Task-level specificity: "Your feature 'Login Flow' is due by sprint end (Friday)"
- Practical: "You have 3 TODO items. 1 is blocked. Focus on the 2 unblocked items."
- No financial context

---

## Guardian Chat Interaction Types

| User input type | Guardian response type |
|----------------|----------------------|
| "How is the project doing?" | Health summary + top 3 alerts |
| "What's blocked?" | List of BLOCKED features with owner and duration |
| "What should I focus on today?" | Prioritised action list by severity |
| "Show me the financials" | EVM metrics in plain language |
| "Create a status update" | Stakeholder-ready status report |
| "What are the risks?" | Risk register summary + recommendations |
| "When will we finish?" | Forecast with confidence level |
| "Change the theme to dark" | UI config update (`update_ui_config` tool) |
