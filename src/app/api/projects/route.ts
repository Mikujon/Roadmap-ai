import { db } from "@/lib/prisma";
import { triggerAgents } from "@/lib/agent-triggers";
import { can } from "@/lib/permissions";
import { ok, created, Errors } from "@/lib/api/response";
import { withAuth, guard } from "@/lib/api/route-handler";
import type { Role } from "@/lib/permissions";

export const POST = withAuth(async (req, ctx) => {
  const forbidden = guard(ctx.role as Role, can.createProject);
  if (forbidden) return forbidden;

  const body = await req.json() as {
    name: string;
    brief?: string;
    startDate: string;
    endDate: string;
    budgetTotal?: number | string;
    revenueExpected?: number | string;
    phases?: { title: string; duration: string; desc: string }[];
  };

  const { name, brief, startDate, endDate, budgetTotal, revenueExpected, phases } = body;

  if (!name?.trim()) return Errors.VALIDATION("name is required");
  if (!startDate || !endDate) return Errors.VALIDATION("startDate and endDate are required");

  const project = await db.project.create({
    data: {
      name:            name.trim(),
      briefText:       brief ?? null,
      description:     brief ?? null,
      startDate:       new Date(startDate),
      endDate:         new Date(endDate),
      budgetTotal:     Number(budgetTotal) || 0,
      revenueExpected: Number(revenueExpected) || 0,
      organisationId:  ctx.org.id,
      requestedById:   ctx.user.id,
      phases: phases?.length
        ? {
            create: phases.map((ph, i) => ({
              num:   i + 1,
              label: ph.title || `Phase ${i + 1}`,
              sub:   ph.desc  || null,
              order: i,
            })),
          }
        : undefined,
    },
  });

  // Create default phases if none were provided
  let projectPhases = await db.phase.findMany({
    where:   { projectId: project.id },
    orderBy: { order: "asc" },
  });

  if (projectPhases.length === 0) {
    await db.phase.createMany({
      data: [
        { num: 1, label: "Planning",    sub: "Architecture, design, infrastructure setup", order: 0, projectId: project.id },
        { num: 2, label: "Development", sub: "Backend API, frontend, auth, database",      order: 1, projectId: project.id },
        { num: 3, label: "QA & Launch", sub: "Testing, deployment, documentation",         order: 2, projectId: project.id },
      ],
    });
    projectPhases = await db.phase.findMany({
      where:   { projectId: project.id },
      orderBy: { order: "asc" },
    });
  }

  // Create 2 sprints per phase
  const SPRINT_MS = 14 * 24 * 60 * 60 * 1000;
  let sprintCursor = new Date(startDate).getTime();
  let sprintOrder  = 0;

  for (const [phaseIdx, phase] of projectPhases.entries()) {
    for (let s = 0; s < 2; s++) {
      await db.sprint.create({
        data: {
          num:       `${phase.num}.${s + 1}`,
          name:      `Sprint ${sprintOrder + 1}`,
          status:    phaseIdx === 0 && s === 0 ? "ACTIVE" : "UPCOMING",
          startDate: new Date(sprintCursor),
          endDate:   new Date(sprintCursor + SPRINT_MS),
          order:     sprintOrder,
          projectId: project.id,
          phaseId:   phase.id,
        },
      });
      sprintCursor += SPRINT_MS;
      sprintOrder++;
    }
  }

  // Create default features for Sprint 1
  const firstSprint = await db.sprint.findFirst({
    where: { projectId: project.id },
    orderBy: { order: "asc" },
  });
  if (firstSprint) {
    await db.feature.createMany({
      data: [
        { title: "Project kickoff & team alignment", status: "TODO", priority: "HIGH",   order: 0, sprintId: firstSprint.id },
        { title: "Requirements gathering",           status: "TODO", priority: "HIGH",   order: 1, sprintId: firstSprint.id },
        { title: "Technical architecture review",    status: "TODO", priority: "MEDIUM", order: 2, sprintId: firstSprint.id },
        { title: "Development environment setup",    status: "TODO", priority: "MEDIUM", order: 3, sprintId: firstSprint.id },
      ],
    });
  }

  // Fire agents in background — don't block the response
  triggerAgents("project_created", project.id, ctx.org.id);

  return created({ project });
});

export const GET = withAuth(async (_req, ctx) => {
  const projects = await db.project.findMany({
    where: { organisationId: ctx.org.id },
    include: {
      phases: { orderBy: { order: "asc" } },
      sprints: { include: { features: true } },
      _count: { select: { sprints: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return ok(projects);
});
