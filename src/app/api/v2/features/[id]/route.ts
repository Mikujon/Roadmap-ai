import { z }           from "zod";
import { db }          from "@/lib/prisma";
import { withApiAuth } from "@/lib/api/route-handler";
import { ok, Errors }  from "@/lib/api/response";
import { validateBody } from "@/lib/api/validate";
import { orchestrate } from "@/lib/orchestrator";

export const GET = withApiAuth(async (_req, ctx, params) => {
  const feature = await db.feature.findUnique({
    where:   { id: params.id },
    include: {
      sprint:     {
        select: {
          id: true, name: true, status: true, projectId: true,
          project: { select: { organisationId: true } },
        },
      },
      assignedTo: { select: { id: true, name: true, role: true } },
    },
  });

  if (!feature || feature.sprint.project.organisationId !== ctx.orgId) {
    return Errors.NOT_FOUND("Feature");
  }

  return ok({
    id:             feature.id,
    title:          feature.title,
    status:         feature.status,
    priority:       feature.priority,
    module:         feature.module,
    notes:          feature.notes,
    estimatedHours: feature.estimatedHours,
    actualHours:    feature.actualHours,
    sprint: {
      id:        feature.sprint.id,
      name:      feature.sprint.name,
      status:    feature.sprint.status,
      projectId: feature.sprint.projectId,
    },
    assignedTo: feature.assignedTo
      ? { id: feature.assignedTo.id, name: feature.assignedTo.name, role: feature.assignedTo.role }
      : null,
    createdAt: feature.createdAt.toISOString(),
    updatedAt: feature.updatedAt.toISOString(),
  });
});

const UpdateFeatureSchema = z.object({
  title:          z.string().min(1).optional(),
  status:         z.enum(["TODO", "IN_PROGRESS", "DONE", "BLOCKED"]).optional(),
  priority:       z.enum(["CRITICAL", "HIGH", "MEDIUM", "LOW"]).optional(),
  estimatedHours: z.number().min(0).optional(),
  actualHours:    z.number().min(0).optional(),
  notes:          z.string().optional(),
  assignedToId:   z.string().nullable().optional(),
});

export const PATCH = withApiAuth(async (req, ctx, params) => {
  const b = await validateBody(req, UpdateFeatureSchema);
  if (b.error) return b.error;

  const feature = await db.feature.findUnique({
    where:   { id: params.id },
    include: {
      sprint: {
        select: { projectId: true, project: { select: { organisationId: true } } },
      },
    },
  });

  if (!feature || feature.sprint.project.organisationId !== ctx.orgId) {
    return Errors.NOT_FOUND("Feature");
  }

  const updated = await db.feature.update({
    where: { id: params.id },
    data: {
      ...(b.data.title          !== undefined && { title:          b.data.title }),
      ...(b.data.status         !== undefined && { status:         b.data.status }),
      ...(b.data.priority       !== undefined && { priority:       b.data.priority }),
      ...(b.data.estimatedHours !== undefined && { estimatedHours: b.data.estimatedHours }),
      ...(b.data.actualHours    !== undefined && { actualHours:    b.data.actualHours }),
      ...(b.data.notes          !== undefined && { notes:          b.data.notes }),
      ...(b.data.assignedToId   !== undefined && { assignedToId:   b.data.assignedToId }),
    },
  });

  orchestrate("feature_updated", feature.sprint.projectId, ctx.orgId, { userId: ctx.userId ?? undefined });

  return ok({
    id:        updated.id,
    status:    updated.status,
    priority:  updated.priority,
    updatedAt: updated.updatedAt.toISOString(),
  });
});
