import { z }            from "zod";
import { db }            from "@/lib/prisma";
import { withApiAuth }   from "@/lib/api/route-handler";
import { ok }            from "@/lib/api/response";
import { validateQuery, PaginationSchema } from "@/lib/api/validate";

const QuerySchema = PaginationSchema.extend({
  status:    z.enum(["read", "unread"]).optional(),
  level:     z.enum(["critical", "warning", "info", "success"]).optional(),
  projectId: z.string().optional(),
});

export const GET = withApiAuth(async (req, ctx) => {
  const q = await validateQuery(req, QuerySchema);
  if (q.error) return q.error;

  const { page, limit, status, level, projectId } = q.data;
  const skip = (page - 1) * limit;

  const where = {
    organisationId: ctx.orgId,
    ...(status === "read"   ? { read: true  } : {}),
    ...(status === "unread" ? { read: false } : {}),
    ...(level     ? { level }     : {}),
    ...(projectId ? { projectId } : {}),
  };

  const [alerts, total] = await Promise.all([
    db.alert.findMany({
      where,
      include:  { project: { select: { id: true, name: true } } },
      orderBy:  { createdAt: "desc" },
      skip,
      take: limit,
    }),
    db.alert.count({ where }),
  ]);

  const items = alerts.map(a => ({
    id:          a.id,
    title:       a.title,
    detail:      (a as { detail?: string }).detail ?? null,
    level:       a.level,
    read:        a.read,
    projectId:   a.project?.id   ?? null,
    projectName: a.project?.name ?? null,
    createdAt:   a.createdAt.toISOString(),
  }));

  return ok({ items, total, page, limit, hasMore: skip + items.length < total });
});
