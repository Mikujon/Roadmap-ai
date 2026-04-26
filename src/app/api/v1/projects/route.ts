import { NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { getApiAuth } from "@/middleware/api-auth";
import { computeEvm, DB_PROJECT_INCLUDE, type ProjectRow } from "../_lib";

export async function GET(req: Request) {
  const auth = await getApiAuth(req);
  if (!auth.valid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const projects = await db.project.findMany({
    where:   { organisationId: auth.orgId, status: { notIn: ["ARCHIVED", "CLOSED"] } },
    include: DB_PROJECT_INCLUDE,
    orderBy: { updatedAt: "desc" },
  }) as unknown as ProjectRow[];

  const data = projects.map(p => {
    const h            = computeEvm(p);
    const activeSprint = p.sprints.find(s => s.status === "ACTIVE") ?? null;
    const sprintFeats  = activeSprint?.features ?? [];
    const sprintDone   = sprintFeats.filter(f => f.status === "DONE").length;
    const sprintProg   = sprintFeats.length > 0 ? Math.round((sprintDone / sprintFeats.length) * 100) : 0;

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
        progress: sprintProg,
      } : null,
      guardian: p.guardianReport ? {
        insight:      p.guardianReport.insight,
        lastAnalysis: p.guardianReport.generatedAt.toISOString(),
      } : null,
    };
  });

  return NextResponse.json({
    data,
    meta: {
      total:       data.length,
      org:         auth.orgId,
      generatedAt: new Date().toISOString(),
    },
  });
}
