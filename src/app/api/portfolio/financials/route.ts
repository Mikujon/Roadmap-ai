import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";
import { db } from "@/lib/prisma";
import { getProjectMetrics } from "@/lib/metrics";

export async function GET() {
  const ctx = await getAuthContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const projects = await db.project.findMany({
    where: { organisationId: ctx.org.id, status: { notIn: ["CLOSED", "ARCHIVED"] } },
    include: {
      sprints: { include: { features: true } },
      phases:  { orderBy: { order: "asc" } },
      assignments: { include: { resource: true } },
      risks: true,
      requestedBy: { select: { name: true, email: true } },
      departments: { include: { department: true } },
      dependsOn:   { include: { dependsOn: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  const rows = projects.map(p => {
    const m = getProjectMetrics(p as any);
    return {
      id:          p.id,
      name:        p.name,
      status:      p.status,
      budgetTotal: p.budgetTotal,
      acwp:        m.costActual,
      eac:         m.costForecast,
      spi:         m.health.spi,
      cpi:         m.health.cpi,
      vac:         p.budgetTotal - m.costForecast,
      sv:          m.health.sv,
      cv:          m.health.cv,
      healthScore: m.health.healthScore,
      healthStatus:m.health.status,
      delayDays:   m.health.delayDays,
      endDate:     p.endDate.toISOString(),
      endForecast: m.health.endForecast?.toISOString() ?? null,
    };
  });

  const totalBAC      = rows.reduce((s, r) => s + (r.budgetTotal ?? 0), 0);
  const totalEAC      = rows.reduce((s, r) => s + r.eac, 0);
  const totalACWP     = rows.reduce((s, r) => s + r.acwp, 0);
  const avgCPI        = rows.length ? rows.reduce((s, r) => s + r.cpi, 0) / rows.length : 1;
  const avgSPI        = rows.length ? rows.reduce((s, r) => s + r.spi, 0) / rows.length : 1;
  const overrunAmount = Math.max(0, totalEAC - totalBAC);
  const overrunPct    = totalBAC > 0 ? (overrunAmount / totalBAC) * 100 : 0;

  return NextResponse.json({
    totalBAC, totalEAC, totalACWP, avgCPI, avgSPI, overrunAmount, overrunPct,
    projects: rows,
  });
}
