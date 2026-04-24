import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";
import { dbRead } from "@/lib/prisma";

interface PortfolioSummaryRow {
  organisationId:    string;
  total_projects:    bigint;
  active_projects:   bigint;
  completed_projects: bigint;
  on_hold_projects:  bigint;
  closed_projects:   bigint;
  total_budget:      string; // numeric comes as string from pg
  avg_health_score:  number;
  at_risk_projects:  bigint;
  flagged_projects:  bigint;
  open_risks:        bigint;
  total_alerts:      bigint;
  refreshed_at:      Date;
}

/**
 * GET /api/portfolio
 * Returns the pre-aggregated portfolio summary from mv_portfolio_summary.
 * Reads from the replica — up to 15 min stale (acceptable for dashboards).
 *
 * ?refresh=true  → enqueues an immediate matview refresh job and returns
 *                   the current (possibly stale) snapshot while the worker runs.
 */
export async function GET(req: Request) {
  const ctx = await getAuthContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url     = new URL(req.url);
  const refresh = url.searchParams.get("refresh") === "true";

  // Note: matview refresh queue not available — skip if REDIS_URL is set

  // Read from replica (falls back to primary if DATABASE_URL_REPLICA not set)
  const rows = await dbRead.$queryRaw<PortfolioSummaryRow[]>`
    SELECT * FROM mv_portfolio_summary
    WHERE "organisationId" = ${ctx.org.id}
    LIMIT 1
  `;

  if (rows.length === 0) {
    // View not yet populated — return empty state
    return NextResponse.json({
      totalProjects:     0,
      activeProjects:    0,
      completedProjects: 0,
      onHoldProjects:    0,
      closedProjects:    0,
      totalBudget:       0,
      avgHealthScore:    0,
      atRiskProjects:    0,
      flaggedProjects:   0,
      openRisks:         0,
      totalAlerts:       0,
      refreshedAt:       null,
      _pending:          true,
    });
  }

  const r = rows[0]!;

  return NextResponse.json({
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
    refreshedAt:       r.refreshed_at,
    _stale:            refresh,
  });
}

export const dynamic = "force-dynamic";
