# calculateHealth

**File:** `src/lib/health.ts`

Computes the health score, EVM metrics, and schedule/cost indicators for a single project. This is the single source of truth for project health across the entire application — Guardian AI, the REST API, and the dashboard all call this function. It never writes to the database; it only computes and returns a report.

## Signature

```typescript
function calculateHealth(input: HealthInput): HealthReport
```

## Input

```typescript
interface HealthInput {
  startDate:          Date;
  endDate:            Date;
  totalFeatures:      number;
  doneFeatures:       number;
  blockedFeatures:    number;
  inProgressFeatures: number;
  totalSprints:       number;
  doneSprints:        number;
  activeSprints:      number;
  budgetTotal:        number;
  costActual:         number;
  costEstimated:      number;
  totalCapacityHours: number;
  totalActualHours:   number;
  openRisks:          number;
  highRisks:          number;
  maxRiskScore:       number;
}
```

## Output

```typescript
interface HealthReport {
  healthScore:        number;        // 0–100
  status:             "ON_TRACK" | "AT_RISK" | "OFF_TRACK";
  // EVM
  spi:                number;        // Schedule Performance Index
  cpi:                number;        // Cost Performance Index
  eac:                number;        // Estimate at Completion
  etc:                number;        // Estimate to Complete
  vac:                number;        // Variance at Completion
  sv:                 number;        // Schedule Variance
  cv:                 number;        // Cost Variance
  tcpi:               number;        // To-Complete Performance Index
  ev:                 number;        // Earned Value
  pv:                 number;        // Planned Value
  ac:                 number;        // Actual Cost
  bac:                number;        // Budget at Completion
  // Progress
  progressNominal:    number;        // % of features DONE
  plannedPct:         number;        // % of timeline elapsed
  daysLeft:           number;
  delayDays:          number;        // 0 if on track
  onTrackProbability: number;        // 0–100
  costForecast:       number;
  alerts:             HealthAlert[];
}
```

## EVM Formulas

| Metric | Formula |
|--------|---------|
| BAC | `budgetTotal` |
| EV | `BAC × (doneFeatures / totalFeatures)` |
| PV | `BAC × plannedPct` |
| AC | `costActual` |
| SPI | `EV / PV` |
| CPI | `EV / AC` |
| EAC | `BAC / CPI` |
| ETC | `EAC - AC` |
| VAC | `BAC - EAC` |
| SV | `EV - PV` |
| CV | `EV - AC` |
| TCPI | `(BAC - EV) / (BAC - AC)` |

## Health Score Composition

The final score is a weighted sum of four independent components:

| Component | Weight | Basis |
|-----------|--------|-------|
| Schedule health | 35% | SPI ratio, time elapsed vs. features done |
| Cost health | 30% | CPI ratio |
| Scope health | 20% | Blocked/in-progress ratio, total progress |
| Risk health | 15% | Open risks, high-risk count, max risk score |

Each component is clamped to 0–100 before weighting.

**Status thresholds:**
- `>= 70` → `ON_TRACK`
- `>= 45` → `AT_RISK`
- `< 45` → `OFF_TRACK`

## New Project Guard

If `totalFeatures === 0` and elapsed time is less than 10% of the planned duration, the function returns early with `healthScore: 80` and `status: "ON_TRACK"`. This prevents a newly created project from immediately showing as off-track before any work has been loaded.

## Usage

```typescript
import { calculateHealth } from "@/lib/health";

const report = calculateHealth({
  startDate: project.startDate,
  endDate:   project.endDate,
  totalFeatures:  allFeatures.length,
  doneFeatures:   allFeatures.filter(f => f.status === "DONE").length,
  // ... other fields
});

console.log(report.healthScore); // e.g. 72
console.log(report.status);      // "ON_TRACK"
console.log(report.spi);         // e.g. 0.91
```

## Callers

| Location | Purpose |
|----------|---------|
| `src/app/api/v1/_lib.ts` — `computeEvm()` | REST API v1 health/project endpoints |
| `src/lib/guardian.ts` — `calculateProjectMetrics()` | Guardian AI report generation |
| `src/app/(app)/layout.tsx` | Sidebar project health dots |
| `src/app/api/projects/[id]/closure-report/route.ts` | Closure report AI prompt context |
