import { db }          from "@/lib/prisma";
import { withApiAuth } from "@/lib/api/route-handler";
import { ok, Errors }  from "@/lib/api/response";
import { computeEvm, DB_PROJECT_INCLUDE, type ProjectRow } from "@/app/api/v1/_lib";
import { calculateHealth } from "@/lib/health";

export const GET = withApiAuth(async (_req, ctx, params) => {
  const p = await db.project.findFirst({
    where:   { id: params.id, organisationId: ctx.orgId },
    include: DB_PROJECT_INCLUDE,
  }) as unknown as ProjectRow | null;

  if (!p) return Errors.NOT_FOUND("Project");

  const h = computeEvm(p);

  const allFeatures    = p.sprints.flatMap(s => s.features);
  const done           = allFeatures.filter(f => f.status === "DONE").length;
  const blocked        = allFeatures.filter(f => f.status === "BLOCKED").length;
  const inProg         = allFeatures.filter(f => f.status === "IN_PROGRESS").length;
  const doneSprints    = p.sprints.filter(s => s.status === "DONE").length;
  const activeSprints  = p.sprints.filter(s => s.status === "ACTIVE").length;
  const costActual     = p.assignments.reduce((s, a) => s + a.actualHours    * a.resource.costPerHour, 0);
  const costEstimated  = p.assignments.reduce((s, a) => s + a.estimatedHours * a.resource.costPerHour, 0);
  const totalCap       = p.assignments.reduce((s, a) => s + a.resource.capacityHours, 0);
  const totalHours     = p.assignments.reduce((s, a) => s + a.actualHours, 0);
  const openRisks      = p.risks.filter(r => r.status === "OPEN");
  const highRisks      = openRisks.filter(r => r.probability * r.impact >= 9);
  const maxRiskScore   = openRisks.reduce((m, r) => Math.max(m, r.probability * r.impact), 0);

  const raw = calculateHealth({
    startDate: p.startDate, endDate: p.endDate,
    totalFeatures: allFeatures.length, doneFeatures: done,
    blockedFeatures: blocked, inProgressFeatures: inProg,
    totalSprints: p.sprints.length, doneSprints, activeSprints,
    budgetTotal: p.budgetTotal, costActual, costEstimated,
    totalCapacityHours: totalCap, totalActualHours: totalHours,
    openRisks: openRisks.length, highRisks: highRisks.length, maxRiskScore,
  });

  return ok({
    projectId:          p.id,
    healthScore:        h.healthScore,
    status:             h.status,
    onTrackProbability: h.onTrackProbability,
    evm: {
      spi: h.spi, cpi: h.cpi,
      eac: h.eac, etc: h.etc, vac: h.vac,
      sv:  h.sv,  cv:  h.cv,  tcpi: h.tcpi,
      ev:  h.ev,  pv:  h.pv,  ac:  h.ac, bac: h.bac,
    },
    components: (raw as { components?: Record<string, number> }).components ?? null,
    guardian: p.guardianReport ? {
      insight:        p.guardianReport.insight,
      recommendation: p.guardianReport.recommendation,
      riskFlag:       p.guardianReport.riskFlag,
      lastAnalysis:   p.guardianReport.generatedAt.toISOString(),
    } : null,
  });
});
