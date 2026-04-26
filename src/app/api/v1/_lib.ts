import { calculateHealth } from "@/lib/health";
import type { HealthReport } from "@/lib/health";

export interface ProjectRow {
  id: string;
  name: string;
  status: string;
  startDate: Date;
  endDate: Date;
  budgetTotal: number;
  costActual: number;
  revenueExpected: number;
  guardianReport: {
    insight: string;
    recommendation: string;
    riskFlag: boolean;
    generatedAt: Date;
  } | null;
  phases: { id: string; label: string; order: number }[];
  sprints: {
    id: string;
    name: string;
    status: string;
    startDate: Date | null;
    endDate: Date | null;
    order: number;
    features: {
      status: string;
      estimatedHours: number;
      actualHours: number;
      title: string;
      priority: string;
    }[];
  }[];
  risks: { id: string; title: string; probability: number; impact: number; status: string }[];
  assignments: {
    estimatedHours: number;
    actualHours: number;
    resource: { name: string; role: string; costPerHour: number; capacityHours: number };
  }[];
}

export function computeEvm(p: ProjectRow): HealthReport & {
  costActual: number;
  costEstimated: number;
  openRisksCount: number;
} {
  const allF           = p.sprints.flatMap(s => s.features);
  const done           = allF.filter(f => f.status === "DONE").length;
  const blocked        = allF.filter(f => f.status === "BLOCKED").length;
  const inProg         = allF.filter(f => f.status === "IN_PROGRESS").length;
  const total          = allF.length;
  const openRisks      = p.risks.filter(r => r.status === "OPEN");
  const highRisks      = openRisks.filter(r => r.probability * r.impact >= 9);
  const maxRiskScore   = openRisks.reduce((m, r) => Math.max(m, r.probability * r.impact), 0);
  const costActual     = p.assignments.reduce((s, a) => s + a.actualHours    * a.resource.costPerHour, 0);
  const costEstimated  = p.assignments.reduce((s, a) => s + a.estimatedHours * a.resource.costPerHour, 0);
  const totalCap       = p.assignments.reduce((s, a) => s + a.resource.capacityHours, 0);
  const totalHours     = p.assignments.reduce((s, a) => s + a.actualHours, 0);
  const doneSprints    = p.sprints.filter(s => s.status === "DONE").length;
  const activeSprints  = p.sprints.filter(s => s.status === "ACTIVE").length;

  const h = calculateHealth({
    startDate: p.startDate, endDate: p.endDate,
    totalFeatures: total, doneFeatures: done,
    blockedFeatures: blocked, inProgressFeatures: inProg,
    totalSprints: p.sprints.length, doneSprints, activeSprints,
    budgetTotal: p.budgetTotal, costActual, costEstimated,
    totalCapacityHours: totalCap, totalActualHours: totalHours,
    openRisks: openRisks.length, highRisks: highRisks.length, maxRiskScore,
  });

  return { ...h, costActual, costEstimated, openRisksCount: openRisks.length };
}

export function phaseRange(
  index: number, total: number, projectStart: Date, projectEnd: Date
): { start: Date; end: Date; progress: number } {
  const totalMs  = projectEnd.getTime() - projectStart.getTime();
  const phaseMs  = totalMs / total;
  const start    = new Date(projectStart.getTime() + index * phaseMs);
  const end      = new Date(projectStart.getTime() + (index + 1) * phaseMs);
  const now      = Date.now();
  const progress = now < start.getTime() ? 0
    : now > end.getTime() ? 100
    : Math.round((now - start.getTime()) / phaseMs * 100);
  return { start, end, progress };
}

export const DB_PROJECT_INCLUDE = {
  phases:      { orderBy: { order: "asc" as const } },
  sprints:     { orderBy: { order: "asc" as const }, include: { features: true } },
  risks:       true,
  assignments: { include: { resource: true } },
  guardianReport: true,
} as const;
