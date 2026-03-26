// ======================
// TYPES
// ======================
type Resource = {
  capacityHours?: number;
};

type Assignment = {
  estimatedHours?: number;
  actualHours?: number;
  resource?: Resource;
};

type Risk = {
  probability?: number;
  impact?: number;
  status: "OPEN" | "CLOSED";
};

export type ProjectHealthInput = {
  startDate: string | Date;
  endDate: string | Date;
  endDateForecast?: string | Date;
  budgetTotal?: number;
  costActual: number;
  assignments: Assignment[];
  risks: Risk[];
};

// ======================
// HELPERS
// ======================
function daysBetween(start: string | Date, end: string | Date): number {
  const s = new Date(start).getTime();
  const e = new Date(end).getTime();
  return Math.ceil((e - s) / (1000 * 60 * 60 * 24));
}

function clamp(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, value));
}

// ======================
// MAIN FUNCTION
// ======================
export function calculateProjectHealth(input: ProjectHealthInput) {
  const now = new Date();

  // ======================
  // SCHEDULE
  // ======================
  const plannedDuration = Math.max(
    1,
    daysBetween(input.startDate, input.endDate)
  );

  const forecastEnd = input.endDateForecast ?? input.endDate;

  const forecastDuration = Math.max(
    1,
    daysBetween(input.startDate, forecastEnd)
  );

  const scheduleVariance =
    ((forecastDuration - plannedDuration) / plannedDuration) * 100;

  const scheduleScore = clamp(
    100 - Math.max(0, scheduleVariance * 2)
  );

  // ======================
  // COST
  // ======================
  const budget = Math.max(1, input.budgetTotal || 1);

  const costVariance = (input.costActual / budget) * 100;

  const costScore = clamp(
    100 - Math.max(0, costVariance - 100) * 2
  );

  // ======================
  // RESOURCE
  // ======================
  const totalEstimated = input.assignments.reduce(
    (sum: number, a: Assignment) =>
      sum + (a.estimatedHours || 0),
    0
  );

  const totalActual = input.assignments.reduce(
    (sum: number, a: Assignment) =>
      sum + (a.actualHours || 0),
    0
  );

  const totalCapacity = input.assignments.reduce(
    (sum: number, a: Assignment) =>
      sum + (a.resource?.capacityHours ?? 0),
    0
  );

  const utilization =
    totalCapacity > 0 ? (totalActual / totalCapacity) * 100 : 0;

  const effortVariance =
    totalEstimated > 0
      ? ((totalActual - totalEstimated) / totalEstimated) * 100
      : 0;

  const resourcePenalty =
    Math.max(0, utilization - 100) +
    Math.max(0, effortVariance);

  const resourceScore = clamp(100 - resourcePenalty);

  // ======================
  // RISK
  // ======================
  const openRisks = input.risks.filter(
    (r: Risk) => r.status === "OPEN"
  );

  const riskExposure = openRisks.reduce(
    (sum: number, r: Risk) =>
      sum + (r.probability || 0) * (r.impact || 0),
    0
  );

  const normalizedRisk = Math.min(riskExposure / 25, 1);

  const riskScore = clamp(100 - normalizedRisk * 100);

  // ======================
  // OVERALL
  // ======================
  const overall =
    scheduleScore * 0.3 +
    costScore * 0.3 +
    resourceScore * 0.2 +
    riskScore * 0.2;

  let label: "ON_TRACK" | "AT_RISK" | "CRITICAL" = "ON_TRACK";

  if (overall < 70) label = "AT_RISK";
  if (overall < 40) label = "CRITICAL";

  return {
    overall: Math.round(overall),
    label,
    breakdown: {
      schedule: Math.round(scheduleScore),
      cost: Math.round(costScore),
      resource: Math.round(resourceScore),
      risk: Math.round(riskScore),
    },
    metrics: {
      plannedDuration,
      forecastDuration,
      scheduleVariance: Math.round(scheduleVariance),
      costVariance: Math.round(costVariance),
      utilization: Math.round(utilization),
      effortVariance: Math.round(effortVariance),
      riskExposure,
      evaluatedAt: now.toISOString(),
    },
  };
}