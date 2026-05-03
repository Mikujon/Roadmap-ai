import { db } from "@/lib/prisma";
import type { Skill, AgentContext, AgentResult } from "./types";
import { logActivity } from "./tools";

export const reportSkill: Skill = {
  id: "report-skill",
  name: "Report Generator",
  description: "Auto-generates sprint summary and closure documents on sprint close or project completion",
  version: "1.0.0",
  triggers: ["sprint_closed", "project_completed"],
};

export async function runReportAgent(ctx: AgentContext): Promise<AgentResult> {
  const { projectId, orgId, meta } = ctx;

  const project = await db.project.findUnique({
    where: { id: projectId },
    include: {
      sprints: {
        include: { features: true },
        orderBy: { order: "asc" },
      },
      risks:       { where: { status: "OPEN" } },
      assignments: { include: { resource: true } },
    },
  });
  if (!project) return { success: false, agentId: "report-skill", message: "Project not found" };

  const isProjectCompleted = meta?.event === "project_completed";

  if (isProjectCompleted) {
    // Closure report
    const allF    = project.sprints.flatMap(s => s.features);
    const done    = allF.filter(f => f.status === "DONE").length;
    const pct     = allF.length ? Math.round((done / allF.length) * 100) : 0;
    const ac      = project.assignments.reduce(
      (s, a) => s + a.actualHours * a.resource.costPerHour,
      0
    );
    const budgetVariance = project.budgetTotal - ac;

    const content = [
      `# Project Closure Report — ${project.name}`,
      ``,
      `**Status:** ${project.status}`,
      `**Completion:** ${pct}%`,
      `**Budget:** $${Math.round(ac).toLocaleString()} spent of $${Math.round(project.budgetTotal).toLocaleString()} (variance $${Math.round(budgetVariance).toLocaleString()})`,
      `**Open Risks at Close:** ${project.risks.length}`,
      ``,
      `## Sprint Summary`,
      ...project.sprints.map(s => {
        const sf  = s.features;
        const sdone = sf.filter(f => f.status === "DONE").length;
        return `- **${s.name}**: ${sdone}/${sf.length} features done`;
      }),
    ].join("\n");

    await db.projectDocument.create({
      data: {
        projectId,
        title:   `Closure Report — ${project.name}`,
        type:    "CLOSURE_REPORT",
        content: { markdown: content } as object,
        status:  "DRAFT",
        version: 1,
        createdBy: "guardian-agent",
      },
    });

    await logActivity({
      orgId,
      projectId,
      action:     "agent.closure_report_generated",
      entity:     "project",
      entityId:   projectId,
      entityName: project.name,
    });

    return { success: true, agentId: "report-skill", data: { type: "closure_report" } };
  }

  // Sprint summary (sprint_closed)
  const sprintId = meta?.sprintId as string | undefined;
  const sprint   = sprintId
    ? project.sprints.find(s => s.id === sprintId)
    : project.sprints.filter(s => s.status === "DONE").at(-1);

  if (!sprint) return { success: true, agentId: "report-skill", message: "No closed sprint found" };

  const sf      = sprint.features;
  const sdone   = sf.filter(f => f.status === "DONE").length;
  const sblocked = sf.filter(f => f.status === "BLOCKED").length;
  const spct    = sf.length ? Math.round((sdone / sf.length) * 100) : 0;

  const content = [
    `# Sprint Summary — ${sprint.name}`,
    ``,
    `**Project:** ${project.name}`,
    `**Completion:** ${spct}% (${sdone}/${sf.length} features done)`,
    `**Blocked:** ${sblocked} features`,
    ``,
    `## Features`,
    ...sf.map(f => `- [${f.status}] ${f.title}`),
    ``,
    ...(sprint.goal ? [`**Goal:** ${sprint.goal}`] : []),
  ].join("\n");

  await db.projectDocument.create({
    data: {
      projectId,
      title:   `Sprint Summary — ${sprint.name}`,
      type:    "MEETING_NOTES",
      content: { markdown: content } as object,
      status:  "DRAFT",
      version: 1,
      createdBy: "guardian-agent",
    },
  });

  await logActivity({
    orgId,
    projectId,
    action:     "agent.sprint_report_generated",
    entity:     "sprint",
    entityId:   sprint.id,
    entityName: sprint.name,
  });

  return { success: true, agentId: "report-skill", data: { type: "sprint_summary", sprintId: sprint.id } };
}
