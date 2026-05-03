import { z }            from "zod";
import { db }            from "@/lib/prisma";
import { withApiAuth }   from "@/lib/api/route-handler";
import { ok, Errors }    from "@/lib/api/response";
import { validateQuery } from "@/lib/api/validate";

const QuerySchema = z.object({
  status: z.enum(["OPEN", "MITIGATED", "CLOSED", "ACCEPTED"]).optional(),
});

const riskLevel = (score: number) =>
  score >= 20 ? "critical" : score >= 12 ? "high" : score >= 6 ? "medium" : "low";

export const GET = withApiAuth(async (req, ctx, params) => {
  const q = await validateQuery(req, QuerySchema);
  if (q.error) return q.error;

  const project = await db.project.findFirst({
    where:  { id: params.id, organisationId: ctx.orgId },
    select: { id: true },
  });
  if (!project) return Errors.NOT_FOUND("Project");

  const risks = await db.risk.findMany({
    where:   { projectId: params.id, ...(q.data.status ? { status: q.data.status } : {}) },
    orderBy: [{ probability: "desc" }, { impact: "desc" }],
  });

  const items = risks.map(r => ({
    id:          r.id,
    title:       r.title,
    description: r.description,
    probability: r.probability,
    impact:      r.impact,
    score:       r.probability * r.impact,
    level:       riskLevel(r.probability * r.impact),
    status:      r.status,
    category:    (r as { category?: string }).category ?? null,
    ownerId:     (r as { ownerId?: string }).ownerId   ?? null,
    createdAt:   r.createdAt.toISOString(),
  }));

  const open     = items.filter(r => r.status === "OPEN");
  const high     = open.filter(r => r.level === "high").length;
  const critical = open.filter(r => r.level === "critical").length;

  return ok({
    projectId: params.id,
    risks: items,
    summary: { total: items.length, open: open.length, high, critical },
  });
});
