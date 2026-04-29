# EVM Engine — Earned Value Management

Source: `src/lib/health.ts` — `calculateHealth(HealthInput): HealthReport`  
Standard: PMI PMBOK 7th Ed, ISO 21502

---

## Core EVM Formulas

| Metric | Formula | Meaning |
|--------|---------|---------|
| **BAC** | `budgetTotal` (or `costEstimated` if no budget) | Budget at Completion — total approved budget |
| **EV** | `BAC × (progressNominal / 100)` | Earned Value — work actually completed in $ |
| **PV** | `BAC × (plannedPct / 100)` | Planned Value — work that should be done by now |
| **AC** | Sum of `actualHours × costPerHour` per assignment | Actual Cost incurred to date |
| **SPI** | `EV / PV` | Schedule Performance Index (1.0 = on plan) |
| **CPI** | `EV / AC` | Cost Performance Index (1.0 = on budget) |
| **EAC** | `BAC / CPI` | Estimate at Completion — forecast final cost |
| **ETC** | `EAC - AC` | Estimate to Complete — remaining spend needed |
| **VAC** | `BAC - EAC` | Variance at Completion (negative = overrun) |
| **SV** | `EV - PV` | Schedule Variance in $ (negative = behind) |
| **CV** | `EV - AC` | Cost Variance in $ (negative = over budget) |
| **TCPI** | `(BAC - EV) / (BAC - AC)` | To-Complete Performance Index |

---

## Progress Calculation

```
progressNominal = doneFeatures / totalFeatures × 100
plannedPct      = min(100, elapsedDays / totalDays × 100)
scheduleGap     = progressNominal - plannedPct   (positive = ahead)

blockPenalty    = (blockedFeatures / totalFeatures) × 20
progressReal    = max(0, progressNominal - blockPenalty - scheduleGap penalty)
```

`progressReal` is used for narrative reporting. `progressNominal` drives EVM.

---

## Health Score Composite (0–100)

Four weighted components:

| Component | Weight | Input | Bands |
|-----------|--------|-------|-------|
| **Schedule Health** | 35% | SPI | ≥0.95→100 / ≥0.85→80 / ≥0.70→60 / ≥0.50→40 / else→20 |
| **Cost Health** | 30% | CPI | ≥0.95→100 / ≥0.85→80 / ≥0.70→60 / ≥0.50→40 / else→20 (no budget→80) |
| **Scope Health** | 20% | Blocked ratio | 0%→100 / <5%→90 / <10%→75 / <20%→55 / else→30 |
| **Risk Health** | 15% | maxRiskScore | 0→100 / <6→90 / <12→70 / <20→50 / else→25 |

```
healthScore = round(scheduleHealth×0.35 + costHealth×0.30 + scopeHealth×0.20 + riskHealth×0.15)
```

---

## Hard Caps (PMI RAG Thresholds)

These caps override the composite score when hard conditions are met:

| Condition | Cap |
|-----------|-----|
| Project overdue (daysLeft < 0 and progress < 100%) | ≤ 45 |
| Severe delay (delayDays > 30) | ≤ 35 |
| Moderate delay (delayDays > 7) | ≤ 60 |
| Budget risk critical | ≤ 40 |
| Budget risk high | ≤ 60 |
| SPI < 0.5 and progress < 50% | ≤ 35 |

---

## Status (RAG)

```
COMPLETED   → progressNominal = 100%
OFF_TRACK   → daysLeft < 0  OR  delayDays > 14  OR  budgetRisk = critical  OR  SPI < 0.5
AT_RISK     → delayDays > 3  OR  (daysLeft ≤ 7 AND progress < 80%)  OR  budgetRisk = medium  OR  SPI < 0.8  OR  blocked ≥ 3
ON_TRACK    → activeSprints > 0
NOT_STARTED → everything else
```

---

## Budget Risk

```
budgetDelta = EAC - BAC

none     → budgetDelta ≤ 0
low      → 0 < budgetDelta ≤ BAC × 5%
medium   → BAC×5% < budgetDelta ≤ BAC×15%
high     → BAC×15% < budgetDelta ≤ BAC×30%
critical → budgetDelta > BAC × 30%
```

---

## On-Track Probability

Derived from SPI only (conservative estimate):

| SPI | Probability |
|-----|-------------|
| ≥ 1.00 | 90% |
| ≥ 0.95 | 75% |
| ≥ 0.85 | 55% |
| ≥ 0.70 | 35% |
| ≥ 0.50 | 20% |
| < 0.50 | 10% |

---

## Forecast Modes

| Mode | Trigger | Method |
|------|---------|--------|
| `overdue` | daysLeft < 0 and progress < 100% | Report actual overdue days |
| `velocity` | ≥ 2 sprints done, not short project | Sprint velocity extrapolation |
| `time_vs_progress` | Short project (≤ 2 sprints) | Linear time-progress comparison |
| `insufficient` | < 2 sprints done | No forecast, flag for PM |
| `new_project` | 0 features, < 10% of timeline elapsed | Return healthy defaults |

---

## New Project Guard

When `totalFeatures = 0` AND `projectAgePercent < 10%`:
- Return healthScore = 80, status = ON_TRACK, SPI = CPI = 1.0
- Emit info alert: "No features added yet"
- onTrackProbability = 85%

This prevents false negatives on projects that just started.

---

## Interpretation Guide for Guardian AI

- **SPI < 0.8**: Behind schedule — look for blocked tasks, missing resources, scope creep
- **CPI < 0.9**: Cost overrun risk — check actual vs estimated hours per resource
- **TCPI > 1.2**: Team must work 20%+ more efficiently than to date — realistically unachievable without scope cut
- **VAC negative**: Project will finish over budget at current rate
- **scheduleGap < -20**: 20+ percentage points behind — requires immediate action, not monitoring
- **progressReal < progressNominal by > 15pp**: Hidden quality issues or significant blocked work
