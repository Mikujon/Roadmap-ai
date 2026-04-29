# Risk Engine

Source: `src/lib/health.ts` (riskHealth component), `src/app/api/projects/[id]/risks/route.ts`  
Standard: PMI Risk Management Framework, ISO 31000

---

## Risk Data Model

```prisma
model Risk {
  id          String     @id @default(cuid())
  title       String
  description String?
  probability Int        // 1–5 scale (1=rare, 5=almost certain)
  impact      Int        // 1–5 scale (1=negligible, 5=catastrophic)
  status      RiskStatus // OPEN | MITIGATED | CLOSED
  category    String?    // TECHNICAL | SCHEDULE | BUDGET | RESOURCE | SCOPE | EXTERNAL
  mitigation  String?
  projectId   String
  createdAt   DateTime
  updatedAt   DateTime
}
```

---

## Risk Score

```
riskScore = probability × impact   (range: 1–25)
```

| Score | Level | Color |
|-------|-------|-------|
| 1–5 | low | green |
| 6–11 | medium | amber |
| 12–19 | high | orange |
| 20–25 | critical | red |

---

## Risk Health Component (in EVM Health Score)

```
riskHealth = maxRiskScore === 0 → 100
           | maxRiskScore < 6   → 90
           | maxRiskScore < 12  → 70
           | maxRiskScore < 20  → 50
           | else               → 25
```

Only OPEN risks count. MITIGATED and CLOSED risks do not affect the health score.

---

## Risk Matrix

```
         Impact
         1    2    3    4    5
    1 [  1  |  2  |  3  |  4  |  5 ]   low
    2 [  2  |  4  |  6  |  8  | 10 ]   low/medium
P   3 [  3  |  6  |  9  | 12  | 15 ]   medium/high
r   4 [  4  |  8  | 12  | 16  | 20 ]   high/critical
o   5 [  5  | 10  | 15  | 20  | 25 ]   critical
b
```

Scores ≥ 9 in the alert engine: `highRisks` (used for "high-impact risk" alert trigger)  
Scores ≥ 20: `maxRiskScore >= 20` → riskLevel = "critical" in health report

---

## Risk Categories

| Category | Examples |
|----------|---------|
| `TECHNICAL` | Architecture uncertainty, technical debt, unproven technology |
| `SCHEDULE` | Dependency delays, resource unavailability, sprint carryover |
| `BUDGET` | Cost overrun, unplanned expenses, vendor price changes |
| `RESOURCE` | Key person dependency, sick leave, skill gap |
| `SCOPE` | Requirement changes, stakeholder additions, unclear acceptance criteria |
| `EXTERNAL` | Third-party API, regulatory, market conditions, client decision delays |

---

## Risk Lifecycle

```
OPEN → risk is active, affecting health score
  │
  ├─ Risk mitigated → MITIGATED (no longer affects score, stays in register)
  │
  └─ Risk no longer relevant → CLOSED (archived, removed from calculations)
```

A MITIGATED risk should have a `mitigation` note explaining how it was resolved.  
A CLOSED risk is typically because the threat passed without materialising.

---

## Guardian AI Risk Analysis

When analysing risks, Guardian must:

1. **Calculate portfolio risk exposure**: sum of `probability × impact` for all OPEN risks
2. **Identify unmitigated critical risks**: score ≥ 12, no mitigation text
3. **Check for risk concentration**: multiple risks in same category (e.g. 3 RESOURCE risks = systemic issue)
4. **Cross-reference with schedule**: SCHEDULE risks on AT_RISK projects need immediate attention
5. **Recommend mitigation strategies** based on category:
   - TECHNICAL → spike, proof of concept, architecture review
   - SCHEDULE → buffer sprint, scope reduction
   - RESOURCE → cross-train, hire contractor, reassign
   - EXTERNAL → contractual SLA, escalate to client
   - BUDGET → budget contingency, cost baseline revision

---

## Risk Escalation Thresholds

| Condition | Recommended Action |
|-----------|--------------------|
| maxRiskScore > 20 | Escalate to ADMIN/CEO immediately |
| > 3 HIGH risks open | Emergency risk review with PMO |
| Same risk open for > 14 days with no mitigation update | Flag as unactioned — escalate |
| Risk blocking a feature | Link risk to blocker, resolve together |
| Budget risk = critical AND open BUDGET risk | Double escalation path |

---

## Ambient Intelligence — Risk Creation

When MCP ingestion detects a threat signal:
- Keywords: "risk", "concern", "issue", "problem", "failure", "delay", "unexpected"
- `applyIntelligence()` creates a Risk record with:
  - `probability`: estimated from signal strength (3 if uncertain, 4 if explicit)
  - `impact`: estimated from context (3 default, 4 if "critical"/"severe" keywords)
  - `category`: inferred from signal source (Jira → TECHNICAL, Zoom transcript → SCHEDULE)
  - `mitigation`: null (requires human input)
  - `status`: OPEN
- Guardian re-runs after risk creation
