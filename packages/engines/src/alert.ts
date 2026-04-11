// ── Alert Engine ─────────────────────────────────────────────────────────────
// Pure function: given project metrics, returns alert definitions.
// No DB access, no side-effects. The caller persists results.

import type { AlertEngineResult, HealthInput } from "@roadmap/core/types";
import { calculateHealth } from "./health";

export interface AlertEngineInput {
  projectId:      string;
  projectName:    string;
  startDate:      Date;
  endDate:        Date;
  budgetTotal:    number;
  sprints: Array<{
    id:       string;
    num:      string;
    name:     string;
    status:   string;
    endDate:  Date | null;
    features: Array<{ status: string }>;
  }>;
  assignments: Array<{
    estimatedHours: number;
    actualHours:    number;
    resource: { costPerHour: number; capacityHours: number };
  }>;
  risks: Array<{
    status:      string;
    probability: number;
    impact:      number;
  }>;
}

export function computeAlerts(p: AlertEngineInput): AlertEngineResult[] {
  const allF      = p.sprints.flatMap(s => s.features);
  const done      = allF.filter(f => f.status === "DONE").length;
  const blocked   = allF.filter(f => f.status === "BLOCKED").length;
  const inProgress = allF.filter(f => f.status === "IN_PROGRESS").length;
  const costActual = p.assignments.reduce((s, a) => s + a.actualHours * a.resource.costPerHour, 0);
  const costEst    = p.assignments.reduce((s, a) => s + a.estimatedHours * a.resource.costPerHour, 0);
  const openRisks  = p.risks.filter(r => r.status === "OPEN");
  const highRisks  = openRisks.filter(r => r.probability * r.impact >= 9);
  const maxRisk    = openRisks.length > 0 ? Math.max(...openRisks.map(r => r.probability * r.impact)) : 0;

  const healthInput: HealthInput = {
    startDate: p.startDate, endDate: p.endDate,
    totalFeatures: allF.length, doneFeatures: done,
    blockedFeatures: blocked, inProgressFeatures: inProgress,
    totalSprints: p.sprints.length,
    doneSprints: p.sprints.filter(s => s.status === "DONE").length,
    activeSprints: p.sprints.filter(s => s.status === "ACTIVE").length,
    budgetTotal: p.budgetTotal, costActual, costEstimated: costEst,
    totalCapacityHours: p.assignments.reduce((s, a) => s + a.resource.capacityHours, 0),
    totalActualHours: p.assignments.reduce((s, a) => s + a.actualHours, 0),
    openRisks: openRisks.length, highRisks: highRisks.length, maxRiskScore: maxRisk,
  };

  const h      = calculateHealth(healthInput);
  const results: AlertEngineResult[] = [];

  // 1. Overdue
  if (h.daysLeft < 0 && h.progressNominal < 100)
    results.push({
      type: "overdue", level: "critical",
      title: `${p.projectName} is overdue`,
      detail: `Deadline was ${Math.abs(h.daysLeft)} days ago with ${100 - h.progressNominal}% work remaining.`,
      action: "Renegotiate deadline or reduce scope immediately.",
    });

  // 2. SPI critical
  if (h.spi < 0.5)
    results.push({
      type: "spi_critical", level: "critical",
      title: `${p.projectName} — Critical schedule deviation (SPI: ${h.spi.toFixed(2)})`,
      detail: `Only ${h.progressNominal}% complete vs ${h.plannedPct}% planned. Severely behind.`,
      action: "Emergency scope review required. Consider project reset.",
    });
  // 3. SPI warning
  else if (h.spi < 0.8)
    results.push({
      type: "spi_warning", level: "warning",
      title: `${p.projectName} — Behind schedule (SPI: ${h.spi.toFixed(2)})`,
      detail: `${h.progressNominal}% done vs ${h.plannedPct}% planned. Gap: ${Math.abs(h.scheduleGap)}pp.`,
      action: "Review sprint velocity and remove blockers.",
    });

  // 4. Budget critical
  if (h.cpi < 0.7 && p.budgetTotal > 0)
    results.push({
      type: "budget_critical", level: "critical",
      title: `${p.projectName} — Critical budget overrun (CPI: ${h.cpi.toFixed(2)})`,
      detail: `EAC: $${Math.round(h.eac).toLocaleString()} vs BAC: $${Math.round(h.bac).toLocaleString()}.`,
      action: "Freeze spending. Escalate to finance immediately.",
    });

  // 5. Blocked features
  if (blocked >= 3)
    results.push({
      type: "team_blocked", level: "critical",
      title: `${p.projectName} — ${blocked} features blocked`,
      detail: `Multiple blocked features are reducing sprint velocity and SPI.`,
      action: "Hold emergency dependency review. Assign owners to each blocker.",
    });

  // 6. Sprint milestone risk
  const now = Date.now();
  for (const sprint of p.sprints) {
    if (sprint.status !== "ACTIVE" || !sprint.endDate) continue;
    const daysToEnd  = Math.ceil((sprint.endDate.getTime() - now) / 86400000);
    const sprintDone = sprint.features.filter(f => f.status === "DONE").length;
    const sprintPct  = sprint.features.length > 0 ? (sprintDone / sprint.features.length) * 100 : 100;
    if (daysToEnd <= 2 && daysToEnd >= 0 && sprintPct < 80)
      results.push({
        type: `milestone_${sprint.id}`, level: "warning",
        title: `${p.projectName} — Sprint ending in ${daysToEnd}d with ${Math.round(sprintPct)}% done`,
        detail: `Sprint "${sprint.name}" ends in ${daysToEnd} day${daysToEnd !== 1 ? "s" : ""} but only ${Math.round(sprintPct)}% complete.`,
        action: "Focus team on completing sprint tasks or negotiate scope.",
      });
  }

  return results;
}
