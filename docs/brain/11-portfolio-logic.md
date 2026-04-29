# Portfolio Logic

The portfolio is the collection of all active projects in an organisation. Portfolio-level analysis identifies cross-project patterns, concentrations of risk, and aggregate financial exposure.

---

## Portfolio Data Model

Portfolio is not a separate model — it is computed on-demand from all projects belonging to `organisationId`.

Active portfolio = projects where `status NOT IN ('CLOSED', 'ARCHIVED')`

---

## Portfolio KPIs

| KPI | Formula | Source |
|-----|---------|--------|
| **Portfolio Health Score** | `avg(healthScore)` across all active projects | `calculateHealth()` per project |
| **At Risk Count** | Projects with `healthStatus = AT_RISK` | Health status |
| **Off Track Count** | Projects with `healthStatus = OFF_TRACK` | Health status |
| **On Track Count** | Projects with `healthStatus IN (ON_TRACK, COMPLETED)` | Health status |
| **Budget Exposure** | Sum of `max(0, costActual - budgetTotal)` per project | `metrics.costActual - metrics.budgetTotal` |
| **Average CPI** | `avg(cpi)` across all active projects | EVM engine |
| **Total Open Risks** | Sum of all OPEN risks across all projects | Risk table |

---

## Portfolio Health Score Calculation

```
portfolioHealthScore = mean(project.healthScore for each active project)
```

For executive reporting, weight by budget:
```
weightedScore = sum(project.healthScore × project.budgetTotal) / sum(project.budgetTotal)
```

Use weighted score when budgets are set (more budget = more impact on portfolio).

---

## Role-Based Portfolio Filtering

| Role | Projects Visible |
|------|-----------------|
| ADMIN, PMO, CEO | All active projects (`organisationId` match) |
| STAKEHOLDER | Projects where `requestedById = user.id` OR user is in `assignments.resource.name` |
| DEV | Projects with features assigned to `assignedToId = user.id` |

Source: `src/app/(app)/portfolio/page.tsx` — role-based Prisma query.

---

## Portfolio Analysis Scenarios

### Scenario A — Concentration Risk
**Condition**: 3+ projects are OFF_TRACK simultaneously.
**Guardian response**:
- Portfolio-level alert: "X projects off track — this is a systemic issue, not isolated incidents."
- Analyse common root causes: same PM, same resource pool, same time period, same tech stack
- Recommendation: portfolio-level intervention, not just project-level fixes

### Scenario B — Budget Exposure
**Condition**: `budgetExposure > 10% of total portfolio budget`
**Guardian response**:
- Executive alert: "Portfolio budget exposure is €X (Y% of total)"
- Identify top 3 overspending projects
- Recommend: cross-project resource reallocation or executive budget review

### Scenario C — Resource Contention
**Condition**: Same team members assigned to 3+ active projects simultaneously.
**Guardian response**:
- "Resource [name] is assigned to [N] active projects. This is a concentration risk — single point of failure."
- Recommend cross-training or workload redistribution

### Scenario D — Deadline Cluster
**Condition**: 3+ projects have deadlines within the same 2-week window.
**Guardian response**:
- "Portfolio delivery cluster detected: [N] projects due between [date1] and [date2]."
- Recommend: stagger deadlines or prioritise by strategic value
- Flag for CEO review

---

## Strategic Prioritisation

When portfolio capacity is exceeded, Guardian helps prioritise using:

1. **Strategic value** (from `revenueExpected` — higher revenue = higher priority)
2. **Health trajectory** (improving SPI vs declining SPI)
3. **Client commitment** (STAKEHOLDER projects with hard deadlines)
4. **Completion proximity** (projects at > 80% — cheap to finish)
5. **Budget criticality** (projects approaching critical budget risk)

Deprioritisation candidates: projects with LOW strategic value + AT_RISK health + early stage.

---

## Portfolio Report Structure

For CEO/executive audience:

```
1. Executive Summary
   - N active projects, portfolio health: [score]/100
   - N critical, N at risk, N on track
   - Total budget: €X, total exposure: €Y

2. Attention Required (top 3 by severity)
   - Project name, health, key issue, recommended action

3. Financial Summary
   - Avg CPI across portfolio
   - Budget exposure by project (chart data)
   - Revenue forecast vs cost forecast

4. Risk Concentration
   - Most common risk categories
   - Cross-project dependencies

5. Recommendations
   - Portfolio-level actions for executive decision
```

---

## Archive Logic

Projects move to ARCHIVED when:
- Status set to `ARCHIVED` (manual)
- Project is CLOSED + 90 days old (future automation)

Archived projects:
- Not counted in portfolio KPIs
- Visible in `/archive` page
- Can be reactivated (status → ACTIVE) by ADMIN/PMO

CLOSED projects appear in archive immediately. COMPLETED projects remain in active portfolio until manually archived.
