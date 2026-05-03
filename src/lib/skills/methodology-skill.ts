import { db } from "@/lib/prisma";
import type { Skill, AgentContext, AgentResult } from "./types";
import { createAlert, logActivity } from "./tools";

export const methodologySkill: Skill = {
  id: "methodology-skill",
  name: "Methodology Advisor",
  description: "Evaluates sprint hygiene and Scrum/Kanban compliance; flags velocity drops and process anti-patterns",
  version: "1.0.0",
  triggers: ["sprint_closed"],
};

export async function runMethodologyAgent(ctx: AgentContext): Promise<AgentResult> {
  const { projectId, orgId, meta } = ctx;
  let alertsCreated = 0;

  const project = await db.project.findUnique({
    where: { id: projectId },
    include: {
      sprints: {
        include: { features: true },
        orderBy: { order: "asc" },
      },
    },
  });
  if (!project) return { success: false, agentId: "methodology-skill", message: "Project not found" };

  const doneSprints = project.sprints.filter(s => s.status === "DONE");
  if (doneSprints.length < 2) {
    return { success: true, agentId: "methodology-skill", message: "Not enough sprints for analysis" };
  }

  // Velocity: features completed per sprint
  const velocities = doneSprints.map(s => ({
    id:       s.id,
    name:     s.name,
    velocity: s.features.filter(f => f.status === "DONE").length,
    total:    s.features.length,
    blocked:  s.features.filter(f => f.status === "BLOCKED").length,
  }));

  const last     = velocities[velocities.length - 1];
  const prev     = velocities[velocities.length - 2];
  const avgVelocity = velocities.reduce((s, v) => s + v.velocity, 0) / velocities.length;

  // Velocity drop alert
  if (prev.velocity > 0 && last.velocity < prev.velocity * 0.6) {
    const drop = Math.round(((prev.velocity - last.velocity) / prev.velocity) * 100);
    const created = await createAlert({
      orgId,
      projectId,
      type:  "velocity_drop",
      level: "warning",
      title: `Velocity drop in ${project.name}`,
      detail: `${last.name}: ${last.velocity} features done vs ${prev.velocity} previous sprint (−${drop}%) · avg ${avgVelocity.toFixed(1)}/sprint`,
    });
    if (created) {
      alertsCreated++;
      await logActivity({
        orgId,
        projectId,
        action:     "agent.velocity_drop_alert",
        entity:     "sprint",
        entityId:   last.id,
        entityName: last.name,
        meta:       { velocity: last.velocity, prevVelocity: prev.velocity, drop },
      });
    }
  }

  // High carry-over: too many features not done at sprint close
  const carryOverPct = last.total > 0 ? ((last.total - last.velocity) / last.total) * 100 : 0;
  if (carryOverPct > 40) {
    const created = await createAlert({
      orgId,
      projectId,
      type:  "carry_over",
      level: "warning",
      title: `High carry-over in ${last.name}`,
      detail: `${Math.round(carryOverPct)}% of features not completed · ${last.blocked} blocked · consider sprint scope reduction`,
    });
    if (created) alertsCreated++;
  }

  // Chronic blocking: blocked features consistently high
  const recentSprints = doneSprints.slice(-3);
  const avgBlocked    = recentSprints.reduce((s, sp) => s + sp.features.filter(f => f.status === "BLOCKED").length, 0) / recentSprints.length;
  if (avgBlocked >= 2) {
    const created = await createAlert({
      orgId,
      projectId,
      type:  "chronic_blocking",
      level: "warning",
      title: `Persistent blockers in ${project.name}`,
      detail: `Avg ${avgBlocked.toFixed(1)} blocked features over last ${recentSprints.length} sprints · dependency or scope issue likely`,
      dedupWindowHours: 72,
    });
    if (created) alertsCreated++;
  }

  return {
    success: true,
    agentId: "methodology-skill",
    alertsCreated,
    data: {
      lastVelocity: last.velocity,
      avgVelocity:  +avgVelocity.toFixed(1),
      carryOverPct: +carryOverPct.toFixed(1),
      avgBlocked:   +avgBlocked.toFixed(1),
    },
  };
}
