import { z }           from "zod";
import { db }          from "@/lib/prisma";
import { withApiAuth } from "@/lib/api/route-handler";
import { ok, Errors }  from "@/lib/api/response";
import { validateBody } from "@/lib/api/validate";
import { computeEvm, phaseRange, DB_PROJECT_INCLUDE, type ProjectRow } from "@/app/api/v1/_lib";
import { orchestrate } from "@/lib/orchestrator";

const riskLevel = (score: number) =>
  score >= 20 ? "critical" : score >= 12 ? "high" : score >= 6 ? "medium" : "low";

export const GET = withApiAuth(async (_req, ctx, params) => {
  const p = await db.project.findFirst({
    where:   { id: params.id, organisationId: ctx.orgId },
    include: DB_PROJECT_INCLUDE,
  }) as unknown as ProjectRow | null;

  if (!p) return Errors.NOT_FOUND("Project");

  const h = computeEvm(p);

  return ok({
    id:     p.id,
    name:   p.name,
    status: p.status,
    healthScore: h.healthScore,
    health:      h.status,
    onTrackProbability: h.onTrackProbability,
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
    evm: {
      spi: h.spi,  cpi: h.cpi,
      eac: h.eac,  etc: h.etc,  vac: h.vac,
      sv:  h.sv,   cv:  h.cv,   tcpi: h.tcpi,
      ev:  h.ev,   pv:  h.pv,   ac:  h.ac,  bac: h.bac,
    },
    phases: p.phases.map((ph, i) => {
      const { start, end, progress } = phaseRange(i, p.phases.length, p.startDate, p.endDate);
      return { label: ph.label, order: ph.order, progress, startDate: start.toISOString(), endDate: end.toISOString() };
    }),
    sprints: p.sprints.map(s => {
      const feats   = s.features;
      const done    = feats.filter(f => f.status === "DONE").length;
      const blocked = feats.filter(f => f.status === "BLOCKED").length;
      return {
        id: s.id, name: s.name, status: s.status,
        startDate: s.startDate?.toISOString() ?? null,
        endDate:   s.endDate?.toISOString()   ?? null,
        progress:  feats.length > 0 ? Math.round((done / feats.length) * 100) : 0,
        features: feats.length, done, blocked,
      };
    }),
    risks: p.risks.map(r => ({
      id: r.id, title: r.title,
      probability: r.probability, impact: r.impact,
      score: r.probability * r.impact,
      level: riskLevel(r.probability * r.impact),
      status: r.status,
    })),
    team: p.assignments.map(a => ({
      name: a.resource.name,
      role: a.resource.role,
      utilization: a.resource.capacityHours > 0
        ? Math.round((a.actualHours / a.resource.capacityHours) * 100)
        : 0,
    })),
    guardian: p.guardianReport ? {
      insight:            p.guardianReport.insight,
      recommendation:     p.guardianReport.recommendation,
      riskFlag:           p.guardianReport.riskFlag,
      lastAnalysis:       p.guardianReport.generatedAt.toISOString(),
    } : null,
  });
});

const UpdateProjectSchema = z.object({
  name:        z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  status:      z.enum(["NOT_STARTED", "ACTIVE", "PAUSED", "COMPLETED", "ARCHIVED", "CLOSED"]).optional(),
  budgetTotal: z.number().min(0).optional(),
  startDate:   z.string().datetime().optional(),
  endDate:     z.string().datetime().optional(),
  category:    z.string().optional(),
});

export const PATCH = withApiAuth(async (req, ctx, params) => {
  const b = await validateBody(req, UpdateProjectSchema);
  if (b.error) return b.error;

  const project = await db.project.findFirst({
    where:  { id: params.id, organisationId: ctx.orgId },
    select: { id: true },
  });
  if (!project) return Errors.NOT_FOUND("Project");

  const updated = await db.project.update({
    where: { id: params.id },
    data: {
      ...(b.data.name        !== undefined && { name:        b.data.name }),
      ...(b.data.description !== undefined && { description: b.data.description }),
      ...(b.data.status      !== undefined && { status:      b.data.status }),
      ...(b.data.budgetTotal !== undefined && { budgetTotal: b.data.budgetTotal }),
      ...(b.data.startDate   !== undefined && { startDate:   new Date(b.data.startDate) }),
      ...(b.data.endDate     !== undefined && { endDate:     new Date(b.data.endDate) }),
      ...(b.data.category    !== undefined && { category:    b.data.category }),
    },
  });

  orchestrate("feature_updated", params.id, ctx.orgId, { userId: ctx.userId ?? undefined });

  return ok({
    id:        updated.id,
    name:      updated.name,
    status:    updated.status,
    updatedAt: updated.updatedAt.toISOString(),
  });
});
