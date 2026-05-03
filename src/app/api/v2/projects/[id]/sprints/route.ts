import { db }          from "@/lib/prisma";
import { withApiAuth } from "@/lib/api/route-handler";
import { ok, Errors }  from "@/lib/api/response";

export const GET = withApiAuth(async (_req, ctx, params) => {
  const project = await db.project.findFirst({
    where:   { id: params.id, organisationId: ctx.orgId },
    select:  { id: true },
  });
  if (!project) return Errors.NOT_FOUND("Project");

  const sprints = await db.sprint.findMany({
    where:   { projectId: params.id },
    include: { features: { select: { status: true, priority: true, estimatedHours: true, actualHours: true } } },
    orderBy: { order: "asc" },
  });

  const items = sprints.map(s => {
    const feats      = s.features;
    const done       = feats.filter(f => f.status === "DONE").length;
    const blocked    = feats.filter(f => f.status === "BLOCKED").length;
    const inProgress = feats.filter(f => f.status === "IN_PROGRESS").length;
    const estHours   = feats.reduce((acc, f) => acc + f.estimatedHours, 0);
    const actHours   = feats.reduce((acc, f) => acc + f.actualHours,    0);

    return {
      id:        s.id,
      name:      s.name,
      status:    s.status,
      order:     s.order,
      startDate: s.startDate?.toISOString() ?? null,
      endDate:   s.endDate?.toISOString()   ?? null,
      progress:  feats.length > 0 ? Math.round((done / feats.length) * 100) : 0,
      features: {
        total: feats.length, done, blocked, inProgress,
        todo:  feats.length - done - blocked - inProgress,
      },
      hours: { estimated: estHours, actual: actHours },
    };
  });

  return ok({ projectId: params.id, sprints: items });
});
