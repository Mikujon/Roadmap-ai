import { NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { getApiAuth } from "@/middleware/api-auth";
import { computeEvm, phaseRange, DB_PROJECT_INCLUDE, type ProjectRow } from "../../_lib";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getApiAuth(req);
  if (!auth.valid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const p = await db.project.findFirst({
    where:   { id, organisationId: auth.orgId },
    include: DB_PROJECT_INCLUDE,
  }) as unknown as ProjectRow | null;

  if (!p) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const h = computeEvm(p);

  const riskLevel = (score: number): string =>
    score >= 20 ? "critical" : score >= 12 ? "high" : score >= 6 ? "medium" : "low";

  const phases = p.phases.map((ph, i) => {
    const { start, end, progress } = phaseRange(i, p.phases.length, p.startDate, p.endDate);
    return {
      label:     ph.label,
      order:     ph.order,
      progress,
      startDate: start.toISOString(),
      endDate:   end.toISOString(),
    };
  });

  const sprints = p.sprints.map(s => {
    const feats   = s.features;
    const done    = feats.filter(f => f.status === "DONE").length;
    const blocked = feats.filter(f => f.status === "BLOCKED").length;
    return {
      id:        s.id,
      name:      s.name,
      status:    s.status,
      startDate: s.startDate?.toISOString() ?? null,
      endDate:   s.endDate?.toISOString()   ?? null,
      progress:  feats.length > 0 ? Math.round((done / feats.length) * 100) : 0,
      features:  feats.length,
      done,
      blocked,
    };
  });

  const risks = p.risks.map(r => ({
    id:     r.id,
    title:  r.title,
    score:  r.probability * r.impact,
    level:  riskLevel(r.probability * r.impact),
    status: r.status,
  }));

  const totalCap = p.assignments.reduce((s, a) => s + a.resource.capacityHours, 0);
  const team = p.assignments.map(a => ({
    name:        a.resource.name,
    role:        a.resource.role,
    utilization: a.resource.capacityHours > 0
      ? Math.round((a.actualHours / a.resource.capacityHours) * 100)
      : 0,
  }));

  return NextResponse.json({
    id:          p.id,
    name:        p.name,
    status:      p.status,
    healthScore: h.healthScore,
    evm: {
      spi:  h.spi,  cpi:  h.cpi,
      eac:  h.eac,  etc:  h.etc,  vac: h.vac,
      sv:   h.sv,   cv:   h.cv,   tcpi: h.tcpi,
      ev:   h.ev,   pv:   h.pv,   ac:  h.ac,  bac: h.bac,
    },
    phases,
    sprints,
    risks,
    team,
    guardian: p.guardianReport ? {
      insight:             p.guardianReport.insight,
      recommendation:      p.guardianReport.recommendation,
      riskLevel:           p.guardianReport.riskFlag ? "high" : "low",
      onTrackProbability:  h.onTrackProbability,
    } : {
      insight:            "",
      recommendation:     "",
      riskLevel:          riskLevel(h.bac > 0 ? h.vac / h.bac * -100 : 0),
      onTrackProbability: h.onTrackProbability,
    },
  });
}
