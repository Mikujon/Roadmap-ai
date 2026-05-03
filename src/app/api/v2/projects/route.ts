import { z }                from "zod";
import { db }               from "@/lib/prisma";
import { withApiAuth }      from "@/lib/api/route-handler";
import { ok, Errors }       from "@/lib/api/response";
import { validateQuery, PaginationSchema } from "@/lib/api/validate";
import { computeEvm, DB_PROJECT_INCLUDE, type ProjectRow } from "@/app/api/v1/_lib";

const QuerySchema = PaginationSchema.extend({
  status: z.enum(["ACTIVE", "ON_HOLD", "COMPLETED", "CLOSED", "ARCHIVED"]).optional(),
});

export const GET = withApiAuth(async (req, ctx) => {
  const q = await validateQuery(req, QuerySchema);
  if (q.error) return q.error;

  const { page, limit, status } = q.data;
  const skip = (page - 1) * limit;

  const where = {
    organisationId: ctx.orgId,
    ...(status ? { status } : { status: { notIn: ["ARCHIVED", "CLOSED"] as const } }),
  };

  const [projects, total] = await Promise.all([
    db.project.findMany({
      where,
      include:  DB_PROJECT_INCLUDE,
      orderBy:  { updatedAt: "desc" },
      skip,
      take: limit,
    }) as unknown as Promise<ProjectRow[]>,
    db.project.count({ where }),
  ]);

  const items = projects.map(p => {
    const h            = computeEvm(p);
    const activeSprint = p.sprints.find(s => s.status === "ACTIVE") ?? null;
    const sprintFeats  = activeSprint?.features ?? [];
    const sprintDone   = sprintFeats.filter(f => f.status === "DONE").length;

    return {
      id:          p.id,
      name:        p.name,
      status:      p.status,
      healthScore: h.healthScore,
      health:      h.status,
      progress:    h.progressNominal,
      budget: {
        total:    p.budgetTotal,
        spent:    h.costActual,
        forecast: h.costForecast,
      },
      schedule: {
        start:     p.startDate.toISOString(),
        end:       p.endDate.toISOString(),
        daysLeft:  h.daysLeft,
        delayDays: h.delayDays,
      },
      spi:       h.spi,
      cpi:       h.cpi,
      team:      p.assignments.length,
      openRisks: h.openRisksCount,
      activeSprint: activeSprint ? {
        name:     activeSprint.name,
        progress: sprintFeats.length > 0 ? Math.round((sprintDone / sprintFeats.length) * 100) : 0,
      } : null,
      guardian: p.guardianReport ? {
        insight:      p.guardianReport.insight,
        lastAnalysis: p.guardianReport.generatedAt.toISOString(),
      } : null,
    };
  });

  return ok({ items, total, page, limit, hasMore: skip + items.length < total });
});
