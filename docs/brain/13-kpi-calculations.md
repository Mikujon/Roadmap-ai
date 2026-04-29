# KPI Calculations

Complete reference for every metric computed in RoadmapAI. All formulas are as implemented in `src/lib/health.ts` and `src/lib/metrics.ts`.

---

## EVM Metrics (Primary)

### BAC — Budget at Completion
```
BAC = budgetTotal  (if > 0)
    = costEstimated  (if budgetTotal = 0)
    = 0  (if both = 0, EVM disabled)
```
The total approved project budget. Fixed at project creation; changes tracked via snapshots.

### EV — Earned Value
```
EV = BAC × (progressNominal / 100)
```
The monetary value of work actually completed. If 40% done on a €100k project: EV = €40k.

### PV — Planned Value
```
PV = BAC × (plannedPct / 100)
plannedPct = min(100, elapsedDays / totalDays × 100)
```
The work that *should* have been done by today. If we're 60% through the timeline: PV = 60% of BAC.

### AC — Actual Cost
```
AC = Σ (assignment.actualHours × resource.costPerHour)
```
Total cost actually incurred. Sum across all resource assignments.

### SPI — Schedule Performance Index
```
SPI = EV / PV   (1.0 = on schedule, > 1.0 = ahead, < 1.0 = behind)
```
The most important single metric. SPI < 0.8 requires action.

### CPI — Cost Performance Index
```
CPI = EV / AC   (1.0 = on budget, > 1.0 = under budget, < 1.0 = over budget)
```
If CPI = 0.80, you're spending €1.25 for every €1.00 of value delivered.

### EAC — Estimate at Completion
```
EAC = BAC / CPI   (PMBOK standard formula)
```
Forecasted total cost if current performance continues. EAC > BAC = over budget forecast.

### ETC — Estimate to Complete
```
ETC = EAC - AC
```
How much more money is needed to finish. If ETC < 0: theoretically already overspent beyond budget.

### VAC — Variance at Completion
```
VAC = BAC - EAC   (negative = over budget)
```
How much over or under budget the project will finish.

### SV — Schedule Variance (in $)
```
SV = EV - PV   (negative = behind schedule expressed as $)
```

### CV — Cost Variance (in $)
```
CV = EV - AC   (negative = over budget expressed as $)
```

### TCPI — To-Complete Performance Index
```
TCPI = (BAC - EV) / (BAC - AC)
```
The efficiency required to complete the remaining work within budget.  
TCPI > 1.0 = must work more efficiently than to date.  
TCPI > 1.2 = realistically unachievable without scope reduction.

---

## Schedule Metrics

### Planned Progress Percentage
```
plannedPct = min(100%, elapsedDays / totalDays × 100)
elapsedDays = (today - startDate) / 86400000
totalDays = (endDate - startDate) / 86400000
```

### Schedule Gap
```
scheduleGap = progressNominal - plannedPct   (positive = ahead)
```

### Days Left
```
daysLeft = ceil((endDate - today) / 86400000)
```
Negative = overdue.

### Delay Days
Depends on forecast mode:
- `overdue`: `delayDays = abs(daysLeft)`
- `velocity`: `delayDays = max(0, (forecastEndDate - endDate) / 86400000)`
- `time_vs_progress`, `insufficient`: `delayDays = 0` (cannot forecast)

---

## Progress Metrics

### Nominal Progress
```
progressNominal = doneFeatures / totalFeatures × 100
```
Pure feature count ratio. Used in EVM.

### Real Progress (AI-adjusted)
```
blockPenalty = (blockedFeatures / totalFeatures) × 20
progressReal = max(0, progressNominal - blockPenalty - scheduleGap penalty)
```
Accounts for hidden work: blocked features and schedule lag mask actual readiness.

### Sprint Progress
```
sprintProgress = sprintDoneFeatures / sprintTotalFeatures × 100
```
Per sprint. Used for sprint milestone alerts.

---

## Cost Metrics

### Cost Forecast
```
costForecast = EAC   (if BAC > 0 and CPI calculated)
             = (AC / progressNominal) × 100   (if progress > 5%)
             = costEstimated   (fallback)
```

### Budget Delta
```
budgetDelta = costForecast - BAC
```
Positive = over budget forecast. Used for budgetRisk classification.

### Burn Rate (Actual)
```
burnRateActual = AC / elapsedDays   (€ per day)
```

### Burn Rate (Planned)
```
burnRatePlanned = BAC / totalDays   (€ per day)
```

### Cost Efficiency
```
costEfficiency = (AC / progressNominal) / (BAC / 100) × 100
```
How efficiently the budget is being consumed per unit of progress. 100 = exactly on track.

---

## Resource Metrics

### Team Utilisation
```
totalCapacityHours = Σ resource.capacityHours per assignment
totalActualHours   = Σ assignment.actualHours
utilization        = totalActualHours / totalCapacityHours × 100
```
> 100% = team is overloaded.

### Per-Resource Utilisation
```
resourceUtil = assignment.actualHours / resource.capacityHours × 100
```

---

## Risk Metrics

### Risk Score
```
riskScore = probability × impact   (1–5 each, range 1–25)
```

### Max Risk Score
```
maxRiskScore = max(riskScore) across all OPEN risks
```
Used in health score risk component.

### High Risk Count
```
highRisks = count of OPEN risks where probability × impact >= 9
```

---

## Portfolio Metrics

### Portfolio Health Score
```
portfolioHealth = mean(project.healthScore) for all non-CLOSED/ARCHIVED projects
```

### Budget Exposure
```
budgetExposure = Σ max(0, costActual - budgetTotal) per project
```

### Average CPI
```
avgCpi = mean(project.cpi) across portfolio
```

---

## On-Track Probability

Not a formula — a lookup table based on SPI:

| SPI Range | Probability |
|-----------|-------------|
| ≥ 1.00 | 90% |
| 0.95–0.99 | 75% |
| 0.85–0.94 | 55% |
| 0.70–0.84 | 35% |
| 0.50–0.69 | 20% |
| < 0.50 | 10% |

---

## Worked Example

Project: 90 days total, day 45 (50% elapsed), 40% features done, BAC = €100k, AC = €30k, 2 blocked features / 10 total.

```
plannedPct = 50%
progressNominal = 40%
scheduleGap = 40 - 50 = -10pp (behind)

EV  = 100k × 0.40 = €40k
PV  = 100k × 0.50 = €50k
AC  = €30k

SPI = 40k / 50k = 0.80   ← AT_RISK threshold
CPI = 40k / 30k = 1.33   ← under budget (good)
EAC = 100k / 1.33 = €75k  ← project will cost less than budgeted
ETC = 75k - 30k = €45k
VAC = 100k - 75k = +€25k  ← saving €25k

blockPenalty = (2/10) × 20 = 4pp
progressReal = 40 - 4 = 36%

TCPI = (100k - 40k) / (100k - 30k) = 60k/70k = 0.857   ← achievable

scheduleHealth = 80 (SPI = 0.80)
costHealth     = 100 (CPI = 1.33)
scopeHealth    = 75 (blockRatio = 20%)
riskHealth     = 100 (assumed no risks)

healthScore = round(80×0.35 + 100×0.30 + 75×0.20 + 100×0.15)
            = round(28 + 30 + 15 + 15) = 88

status = AT_RISK (SPI < 0.8)
```
