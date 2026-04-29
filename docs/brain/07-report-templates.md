# Report Templates

Guardian AI generates several types of structured reports. This file defines the required sections, tone, and data sources for each.

---

## 1. Guardian Project Report

Source: `src/lib/guardian.ts` — `GuardianProjectReport`  
Triggered by: feature updates, risk additions, manual trigger  
Audience: PMO, CEO (filtered), ADMIN

### Required Fields

```typescript
{
  projectId:           string;
  projectName:         string;
  healthScore:         number;         // 0–100
  progressReal:        number;         // AI-estimated actual progress %
  progressNominal:     number;         // features done / total %
  onTrackProbability:  number;         // 0–100%
  alerts:              GuardianAlert[];
  recommendations:     string[];       // ordered by priority
  riskLevel:           "low"|"medium"|"high"|"critical";
  estimatedDelay:      number;         // days
  budgetRisk:          "none"|"low"|"medium"|"high";
  generatedAt:         string;
}
```

### Alert Structure

```typescript
{
  id:          string;     // unique within report
  level:       "critical" | "warning" | "info" | "success";
  category:    "schedule" | "budget" | "resources" | "scope" | "risk" | "progress" | "governance";
  title:       string;     // one line, specific
  detail:      string;     // 1–2 sentences with numbers
  action:      string;     // one specific action for the PM
  projectId?:  string;
  projectName?: string;
}
```

### Recommendations Format

Ordered array, most critical first:
```
[
  "CRITICAL: [Action]. [Why it matters]. [Deadline if applicable].",
  "HIGH: [Action]. [Expected outcome].",
  "MEDIUM: [Action] before next sprint.",
  "LOW: [Observation] — monitor in next review."
]
```

---

## 2. Guardian Portfolio Report

Source: `src/lib/guardian.ts` — `GuardianPortfolioReport`  
Audience: CEO, ADMIN

### Required Sections

1. **Portfolio KPIs**: total projects, portfolio health score, critical alert count, warning alert count
2. **Critical alerts**: top 5 across all projects (level = critical, sorted by impact)
3. **Warning alerts**: up to 10 across all projects
4. **Project reports**: one `GuardianProjectReport` per project (compact form)
5. **Top risks**: top 5 risks across all projects by score
6. **Portfolio recommendations**: 3–5 strategic recommendations for executive action

### Portfolio Health Score

```
portfolioHealthScore = average(healthScore) across all non-CLOSED projects
```

Weight by budget if budgets are set (larger budget projects have more impact on portfolio score).

---

## 3. Closure Report

Source: `src/lib/closure-report.ts` — `generateClosureReport()`  
Triggered by: project status → `CLOSED`  
Audience: PMO, ADMIN, STAKEHOLDER

### Required Sections

```
1. Project Summary
   - Name, dates (planned vs actual), budget (planned vs actual)
   - Final health score, final status

2. Objectives Achievement
   - Were original objectives met? (based on FA completion status)
   - Scope changes logged during project

3. EVM Final Analysis
   - Final SPI, CPI, EAC, VAC
   - Budget variance: +/- €X (X%)
   - Schedule variance: +/- N days

4. Risk Summary
   - Total risks logged, resolved, remaining open at close
   - Most impactful risk during the project

5. Team Performance
   - Total actual hours vs estimated
   - Resource utilisation summary

6. Lessons Learned (template)
   - What went well
   - What to improve
   - Recommended process changes

7. Guardian AI Observations
   - Key turning points detected by ambient intelligence
   - Blocker patterns observed
```

---

## 4. Functional Analysis (FA)

Source: `FunctionalAnalysis` model + `FAVersion` history  
Created by: Guardian AI (`POST /api/projects/[id]/functional-analysis/generate`) or manually

### Required Sections

```
1. Executive Summary (2–3 sentences)
2. Scope Definition
   - In scope
   - Out of scope
   - Assumptions
3. Functional Requirements (numbered list)
4. Non-Functional Requirements
   - Performance, security, scalability
5. Technical Constraints
6. Dependencies
7. Acceptance Criteria (per requirement)
8. Risks & Mitigations
9. Revision History (FAVersion table — auto-populated)
```

---

## 5. Status Update (Email Template)

Sent via alert email when `level = critical`.

### Subject
`[N] critical alert[s] across your portfolio`

### Body Structure
- Red header: "N Critical Issues Detected"
- Per alert: project name, alert title, detail, action, link to project
- CTA button: "View Portfolio →"
- Footer: "RoadmapAI Guardian · Automated PMO Alert System"

---

## Report Generation Rules

1. **Never invent numbers** — all metrics must come from the database or EVM calculations
2. **Always include the `generatedAt` timestamp** — reports age; indicate staleness if > 6h
3. **Prioritise actionable over descriptive** — one specific action beats three vague observations
4. **Use role-appropriate language** — executive = strategic, PMO = operational
5. **Flag data quality issues** — "Insufficient sprint data for forecast" rather than inventing a forecast
