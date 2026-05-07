import { z }           from "zod";
import { db }          from "@/lib/prisma";
import { withApiAuth } from "@/lib/api/route-handler";
import { ok, Errors }  from "@/lib/api/response";
import { validateBody } from "@/lib/api/validate";
import { orchestrate } from "@/lib/orchestrator";

const UpdateSprintSchema = z.object({
  name:      z.string().min(1).optional(),
  goal:      z.string().optional(),
  status:    z.enum(["UPCOMING", "ACTIVE", "DONE"]).optional(),
  startDate: z.string().datetime().optional(),
  endDate:   z.string().datetime().optional(),
});

export const PATCH = withApiAuth(async (req, ctx, params) => {
  const b = await validateBody(req, UpdateSprintSchema);
  if (b.error) return b.error;

  const sprint = await db.sprint.findUnique({
    where:   { id: params.id },
    include: { project: { select: { id: true, organisationId: true } } },
  });

  if (!sprint || sprint.project.organisationId !== ctx.orgId) {
    return Errors.NOT_FOUND("Sprint");
  }

  const updated = await db.sprint.update({
    where: { id: params.id },
    data: {
      ...(b.data.name      !== undefined && { name:      b.data.name }),
      ...(b.data.goal      !== undefined && { goal:      b.data.goal }),
      ...(b.data.status    !== undefined && { status:    b.data.status }),
      ...(b.data.startDate !== undefined && { startDate: new Date(b.data.startDate) }),
      ...(b.data.endDate   !== undefined && { endDate:   new Date(b.data.endDate) }),
    },
  });

  orchestrate("feature_updated", sprint.project.id, ctx.orgId, { userId: ctx.userId ?? undefined });

  return ok({
    id:        updated.id,
    name:      updated.name,
    status:    updated.status,
    startDate: updated.startDate?.toISOString() ?? null,
    endDate:   updated.endDate?.toISOString()   ?? null,
  });
});
