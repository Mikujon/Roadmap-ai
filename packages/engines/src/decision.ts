// ── Decision Engine ───────────────────────────────────────────────────────────
// Pure function: computes Command Center "Decisions needed" from project metrics.
// Output is immediately usable — AI enrichment is optional/additive.

import type { Decision } from "@roadmap/core/types";
import type { ProjectMetrics } from "./metrics";

const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);

export interface DecisionInput {
  id:          string;
  name:        string;
  budgetTotal: number;
  metrics:     ProjectMetrics;
}

export function computeDecisions(projects: DecisionInput[]): Decision[] {
  const decisions: Decision[] = [];

  for (const p of projects) {
    const { metrics: m } = p;

    if (m.budgetVariance > 0 && p.budgetTotal > 0)
      decisions.push({
        id:          `budget-${p.id}`,
        severity:    "critical",
        type:        "budget_overrun",
        title:       `"${p.name}" budget overrun`,
        detail:      `Forecast ${fmt(m.costForecast)} vs budget ${fmt(p.budgetTotal)} — ${fmt(m.budgetVariance)} over.`,
        projectId:   p.id,
        projectName: p.name,
        fixTab:      "financials",
      });

    if (m.isOverdue && m.health !== "COMPLETED")
      decisions.push({
        id:          `overdue-${p.id}`,
        severity:    "critical",
        type:        "overdue",
        title:       `"${p.name}" is past deadline`,
        detail:      `${Math.abs(m.daysLeft)} days overdue at ${m.progressPct}% completion.`,
        projectId:   p.id,
        projectName: p.name,
        fixTab:      "overview",
      });
    else if (!m.isOverdue && m.daysLeft <= 7 && m.progressPct < 80 && m.health !== "COMPLETED")
      decisions.push({
        id:          `deadline-${p.id}`,
        severity:    "warning",
        type:        "deadline_risk",
        title:       `"${p.name}" deadline in ${m.daysLeft}d`,
        detail:      `Only ${m.progressPct}% complete — ${100 - m.progressPct}% remaining with ${m.daysLeft} days left.`,
        projectId:   p.id,
        projectName: p.name,
        fixTab:      "timeline",
      });

    if (m.highRisks > 0)
      decisions.push({
        id:          `risks-${p.id}`,
        severity:    "critical",
        type:        "high_risk",
        title:       `${m.highRisks} critical risk${m.highRisks > 1 ? "s" : ""} in "${p.name}"`,
        detail:      `${m.highRisks} open risk${m.highRisks > 1 ? "s" : ""} with P×I ≥ 9 — unmitigated.`,
        projectId:   p.id,
        projectName: p.name,
        fixTab:      "risks",
      });

    if (m.blockedFeatures >= 3)
      decisions.push({
        id:          `blocked-${p.id}`,
        severity:    "warning",
        type:        "blocked_sprint",
        title:       `${m.blockedFeatures} features blocked in "${p.name}"`,
        detail:      `${m.blockedFeatures} blocked features across active sprints — velocity at risk.`,
        projectId:   p.id,
        projectName: p.name,
        fixTab:      "board",
      });
  }

  return decisions
    .sort((a, b) => (a.severity === "critical" && b.severity !== "critical" ? -1 : b.severity === "critical" && a.severity !== "critical" ? 1 : 0))
    .slice(0, 5);
}
