import { db }          from "@/lib/prisma";
import { withApiAuth } from "@/lib/api/route-handler";
import { ok, Errors }  from "@/lib/api/response";
import { computeEvm, phaseRange, DB_PROJECT_INCLUDE, type ProjectRow } from "@/app/api/v1/_lib";

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
