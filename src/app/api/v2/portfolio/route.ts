import { dbRead }      from "@/lib/prisma";
import { withApiAuth } from "@/lib/api/route-handler";
import { ok }          from "@/lib/api/response";

interface PortfolioRow {
  organisationId:     string;
  total_projects:     bigint;
  active_projects:    bigint;
  completed_projects: bigint;
  on_hold_projects:   bigint;
  closed_projects:    bigint;
  total_budget:       string;
  avg_health_score:   number;
  at_risk_projects:   bigint;
  flagged_projects:   bigint;
  open_risks:         bigint;
  total_alerts:       bigint;
  refreshed_at:       Date;
}

export const GET = withApiAuth(async (_req, ctx) => {
  const rows = await dbRead.$queryRaw<PortfolioRow[]>`
    SELECT * FROM mv_portfolio_summary
    WHERE "organisationId" = ${ctx.orgId}
    LIMIT 1
  `;

  if (rows.length === 0) {
    return ok({
      totalProjects: 0, activeProjects: 0, completedProjects: 0,
      onHoldProjects: 0, closedProjects: 0, totalBudget: 0,
      avgHealthScore: 0, atRiskProjects: 0, flaggedProjects: 0,
      openRisks: 0, totalAlerts: 0, refreshedAt: null, _pending: true,
    });
  }

  const r = rows[0]!;
  return ok({
    totalProjects:     Number(r.total_projects),
    activeProjects:    Number(r.active_projects),
    completedProjects: Number(r.completed_projects),
    onHoldProjects:    Number(r.on_hold_projects),
    closedProjects:    Number(r.closed_projects),
    totalBudget:       parseFloat(r.total_budget ?? "0"),
    avgHealthScore:    r.avg_health_score,
    atRiskProjects:    Number(r.at_risk_projects),
    flaggedProjects:   Number(r.flagged_projects),
    openRisks:         Number(r.open_risks),
    totalAlerts:       Number(r.total_alerts),
    refreshedAt:       r.refreshed_at?.toISOString() ?? null,
  });
});

export const dynamic = "force-dynamic";
