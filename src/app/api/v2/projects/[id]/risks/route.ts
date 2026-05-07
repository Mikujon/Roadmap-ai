import { z }                        from "zod";
import { db }                        from "@/lib/prisma";
import { withApiAuth }               from "@/lib/api/route-handler";
import { ok, created, Errors }       from "@/lib/api/response";
import { validateQuery, validateBody } from "@/lib/api/validate";
import { orchestrate }               from "@/lib/orchestrator";

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

const CreateRiskSchema = z.object({
  title:       z.string().min(1).max(300),
  description: z.string().optional(),
  probability: z.coerce.number().int().min(1).max(5).default(3),
  impact:      z.coerce.number().int().min(1).max(5).default(3),
  status:      z.enum(["OPEN", "MITIGATED", "CLOSED"]).default("OPEN"),
  mitigation:  z.string().optional(),
  ownerName:   z.string().optional(),
  category:    z.string().optional(),
});

export const POST = withApiAuth(async (req, ctx, params) => {
  const b = await validateBody(req, CreateRiskSchema);
  if (b.error) return b.error;

  const project = await db.project.findFirst({
    where:  { id: params.id, organisationId: ctx.orgId },
    select: { id: true },
  });
  if (!project) return Errors.NOT_FOUND("Project");

  const risk = await db.risk.create({
    data: {
      title:       b.data.title,
      description: b.data.description,
      probability: b.data.probability,
      impact:      b.data.impact,
      status:      b.data.status,
      mitigation:  b.data.mitigation,
      ownerName:   b.data.ownerName,
      category:    b.data.category,
      projectId:   params.id,
    },
  });

  orchestrate("feature_updated", params.id, ctx.orgId, { userId: ctx.userId ?? undefined });

  const score = risk.probability * risk.impact;

  return created({
    id:          risk.id,
    title:       risk.title,
    probability: risk.probability,
    impact:      risk.impact,
    score,
    level:       riskLevel(score),
    status:      risk.status,
    createdAt:   risk.createdAt.toISOString(),
  });
});
