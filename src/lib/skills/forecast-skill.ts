import { db } from "@/lib/prisma";
import type { Skill, AgentContext, AgentResult } from "./types";
import { createAlert, logActivity } from "./tools";

export const forecastSkill: Skill = {
  id: "forecast-skill",
  name: "Schedule & Cost Forecaster",
  description: "Computes EAC, ETC and schedule-at-completion; updates endDateForecast and raises budget/schedule alerts",
  version: "1.0.0",
  triggers: ["sprint_closed", "daily_sweep"],
};

export async function runForecastAgent(ctx: AgentContext): Promise<AgentResult> {
  const { projectId, orgId } = ctx;
  let alertsCreated = 0;

  const project = await db.project.findUnique({
    where: { id: projectId },
    include: {
      sprints:     { include: { features: true } },
      assignments: { include: { resource: true } },
    },
  });
  if (!project) return { success: false, agentId: "forecast-skill", message: "Project not found" };

  const allF = project.sprints.flatMap(s => s.features);
  const done  = allF.filter(f => f.status === "DONE").length;
  const pct   = allF.length ? done / allF.length : 0;

  const bac = project.budgetTotal;
  const ac  = project.assignments.reduce(
    (s, a) => s + a.actualHours * a.resource.costPerHour,
    0
  );
  const ev  = bac * pct;
  const cpi = ac > 0 ? ev / ac : 1;
  const eac = bac > 0 && cpi > 0 ? bac / cpi : bac;
  const etc = eac - ac;

  const spanMs   = Math.max(1, new Date(project.endDate).getTime() - new Date(project.startDate).getTime());
  const elapsed  = Date.now() - new Date(project.startDate).getTime();
  const pv       = bac * Math.min(1, Math.max(0, elapsed / spanMs));
  const spi      = pv > 0 ? ev / pv : 1;

  // Compute schedule-at-completion (SAC) based on SPI
  const sacMs          = spi > 0 ? spanMs / spi : spanMs;
  const endDateForecast = new Date(new Date(project.startDate).getTime() + sacMs);
  const delayDays      = Math.max(0, Math.round((endDateForecast.getTime() - new Date(project.endDate).getTime()) / 86400000));

  // Persist forecast date if it changed by more than 1 day
  const existingForecast = project.endDateForecast;
  const forecastDrift = existingForecast
    ? Math.abs(endDateForecast.getTime() - existingForecast.getTime()) / 86400000
    : Infinity;

  if (forecastDrift > 1) {
    await db.project.update({
      where: { id: projectId },
      data:  { endDateForecast },
    });
  }

  // Budget overrun alert
  if (bac > 0 && eac > bac * 1.1) {
    const overrunPct = Math.round(((eac - bac) / bac) * 100);
    const created = await createAlert({
      orgId,
      projectId,
      type:               "budget_forecast",
      level:              eac > bac * 1.25 ? "critical" : "warning",
      title:              `Budget overrun forecast: ${project.name}`,
      detail:             `EAC $${Math.round(eac).toLocaleString()} (+${overrunPct}% over BAC) · ETC $${Math.round(etc).toLocaleString()} remaining · CPI ${cpi.toFixed(2)}`,
      requiresValidation: eac > bac * 1.25,
    });
    if (created) {
      alertsCreated++;
      await logActivity({
        orgId,
        projectId,
        action:     "agent.forecast_budget_alert",
        entity:     "project",
        entityId:   projectId,
        entityName: project.name,
        meta:       { eac, bac, cpi: +cpi.toFixed(2), overrunPct },
      });
    }
  }

  // Schedule delay alert
  if (delayDays > 0) {
    const created = await createAlert({
      orgId,
      projectId,
      type:  "schedule_forecast",
      level: delayDays > 14 ? "critical" : "warning",
      title: `Schedule delay forecast: ${project.name}`,
      detail: `Forecast completion ${endDateForecast.toISOString().slice(0, 10)} · ${delayDays}d past planned end · SPI ${spi.toFixed(2)}`,
    });
    if (created) alertsCreated++;
  }

  return {
    success: true,
    agentId: "forecast-skill",
    alertsCreated,
    data: { eac, etc, cpi: +cpi.toFixed(2), spi: +spi.toFixed(2), delayDays, endDateForecast },
  };
}
