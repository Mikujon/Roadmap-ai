export const dynamic = 'force-dynamic';import { db } from "@/lib/prisma";
import { getAuthContext } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getProjectMetrics, fmtCurrency, fmtDate, fmtPct } from "@/lib/metrics";
import { HEALTH_STATUS_META } from "@/lib/health";
import { unstable_cache } from "next/cache";

export default async function PortfolioPage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/sign-in");

 const getProjects = () => db.project.findMany({
      where: { organisationId: ctx.org.id, status: { notIn: ["CLOSED", "ARCHIVED"] } },
      include: {
        sprints: { include: { features: true } },
        phases: { orderBy: { order: "asc" } },
        assignments: { include: { resource: true } },
        risks: true,
        requestedBy: { select: { name: true, email: true } },
        departments: { include: { department: true } },
        dependsOn: { include: { dependsOn: true } },
      },
      orderBy: { updatedAt: "desc" },
    });

  const projects = await getProjects();
  const rows = projects.map(p => getProjectMetrics(p as any));

  const RISK_META: Record<string, { color: string; bg: string }> = {
    CRITICAL: { color: "#DC2626", bg: "#FEF2F2" },
    HIGH:     { color: "#EA580C", bg: "#FFF7ED" },
    MEDIUM:   { color: "#D97706", bg: "#FFFBEB" },
    LOW:      { color: "#059669", bg: "#ECFDF5" },
  };

  const COLS = [
    "Project", "Client", "Department", "Health", "Score", "Progress",
    "Start", "End Planned", "End Forecast", "Delay", "Sched.",
    "Budget", "Actual", "Forecast", "Revenue", "Margin €", "Margin %", "Burn/day",
    "Team", "Util%", "⚠", "Risk", "Risk Sc.", "Blocking",
    "Confidence", "Fail%", "Trend", "Pred.Delay", "Action", "Priority", "Updated",
  ];

  const criticalCount = rows.filter(r => r.health.status === "OFF_TRACK").length;
  const atRiskCount   = rows.filter(r => r.health.status === "AT_RISK").length;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; }
        .portfolio-table { width: 100%; border-collapse: collapse; font-size: 12px; }
        .portfolio-table th { background: #FAFBFC; border-bottom: 1px solid #E2E8F0; padding: 9px 12px; text-align: left; font-size: 10px; font-weight: 700; color: #94A3B8; text-transform: uppercase; letter-spacing: 0.07em; white-space: nowrap; position: sticky; top: 0; z-index: 1; }
        .portfolio-table td { padding: 12px 12px; border-bottom: 1px solid #F1F5F9; vertical-align: middle; white-space: nowrap; color: #0F172A; }
        .portfolio-row:hover td { background: #FAFBFC; }
        .portfolio-row:last-child td { border-bottom: none; }
        .badge { display: inline-flex; align-items: center; padding: 2px 8px; border-radius: 20px; font-size: 10px; font-weight: 700; white-space: nowrap; }
        .score-mini { height: 4px; background: #F1F5F9; border-radius: 2px; overflow: hidden; width: 60px; }
        .score-mini-fill { height: 100%; border-radius: 2px; }
        .open-btn { font-size: 11px; color: #006D6B; font-weight: 600; text-decoration: none; }
        .open-btn:hover { text-decoration: underline; }
      `}</style>

      <div style={{ padding: "28px 32px", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: "#0F172A", letterSpacing: "-0.5px", marginBottom: 4 }}>Portfolio View</h1>
            <p style={{ fontSize: 13, color: "#94A3B8", fontWeight: 500 }}>
              {ctx.org.name} · {projects.length} projects · Full PMO metrics
            </p>
          </div>
          <Link href="/projects/new" style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "10px 18px", background: "#006D6B", color: "#fff", borderRadius: 10, fontSize: 13, fontWeight: 600, textDecoration: "none", boxShadow: "0 2px 8px rgba(0,109,107,0.2)" }}>
            + New Project
          </Link>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 10, marginBottom: 24 }}>
          {[
            { label: "Total",     value: rows.length,                                                    color: "#0F172A" },
            { label: "On Track",  value: rows.filter(r => r.health.status === "ON_TRACK").length,        color: "#059669" },
            { label: "At Risk",   value: atRiskCount,                                                    color: "#D97706" },
            { label: "Off Track", value: criticalCount,                                                  color: "#DC2626" },
            { label: "Completed", value: rows.filter(r => r.health.status === "COMPLETED").length,       color: "#2563EB" },
            { label: "Delayed",   value: rows.filter(r => r.health.delayDays > 0).length,               color: "#EA580C" },
            { label: "Avg Score", value: rows.length ? Math.round(rows.reduce((s, r) => s + r.health.healthScore, 0) / rows.length) : 0, color: "#006D6B" },
          ].map(k => (
            <div key={k.label} style={{ background: "#fff", border: `1px solid ${k.label === "Off Track" && criticalCount > 0 ? "#FECACA" : "#E2E8F0"}`, borderRadius: 12, padding: "14px 16px" }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#94A3B8", letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: 6 }}>{k.label}</div>
              <div style={{ fontSize: 26, fontWeight: 800, color: k.color, letterSpacing: "-1px" }}>{k.value}</div>
            </div>
          ))}
        </div>

        {/* Critical alerts banner */}
        {rows.some(r => r.health.alerts.some(a => a.level === "critical")) && (
          <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 12, padding: "14px 20px", marginBottom: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#DC2626", marginBottom: 10 }}>🚨 Critical Issues</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {rows.flatMap(r => r.health.alerts.filter(a => a.level === "critical").map(a => (
                <div key={`${r.id}-${a.id}`} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#DC2626", minWidth: 120, flexShrink: 0 }}>{r.name}</span>
                  <span style={{ fontSize: 11, color: "#475569" }}>{a.title} — </span>
                  <span style={{ fontSize: 11, color: "#006D6B", fontWeight: 600 }}>→ {a.action}</span>
                </div>
              )))}
            </div>
          </div>
        )}

        {rows.length === 0 ? (
          <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 14, textAlign: "center", padding: "80px 0" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📋</div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: "#0F172A", marginBottom: 8 }}>No projects yet</h2>
            <p style={{ color: "#94A3B8", marginBottom: 24, fontSize: 13 }}>Create your first project to see portfolio metrics</p>
            <Link href="/projects/new" style={{ padding: "12px 28px", background: "#006D6B", color: "#fff", borderRadius: 10, fontSize: 14, fontWeight: 600, textDecoration: "none" }}>Create First Project</Link>
          </div>
        ) : (
          <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 14, overflow: "hidden" }}>
            <div style={{ overflowX: "auto" }}>
              <table className="portfolio-table">
                <thead>
                  <tr>{COLS.map(c => <th key={c}>{c}</th>)}<th></th></tr>
                </thead>
                <tbody>
                  {rows.map(r => {
                    const hm = HEALTH_STATUS_META[r.health.status] ?? HEALTH_STATUS_META.NOT_STARTED;
                    const rm = RISK_META[r.health.riskLevel.toUpperCase()] ?? RISK_META.LOW;
                    const hsColor = r.health.healthScore >= 80 ? "#059669" : r.health.healthScore >= 60 ? "#D97706" : "#DC2626";
                    const confColor = r.health.onTrackProbability >= 70 ? "#059669" : r.health.onTrackProbability >= 50 ? "#D97706" : "#DC2626";
                    const riskLevel = r.health.riskLevel.toUpperCase();
                    return (
                      <tr key={r.id} className="portfolio-row">
                        <td style={{ minWidth: 160 }}>
                          <Link href={`/projects/${r.id}`} style={{ fontSize: 13, fontWeight: 700, color: "#0F172A", textDecoration: "none" }}>{r.name}</Link>
                          <div style={{ fontSize: 10, color: "#94A3B8", marginTop: 2 }}>{r.deptNames}</div>
                        </td>
                        <td style={{ color: "#475569", fontSize: 12 }}>{r.client}</td>
                        <td style={{ color: "#475569", fontSize: 12, maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis" }}>{r.deptNames}</td>
                        <td><span className="badge" style={{ color: hm.color, background: hm.bg, border: `1px solid ${hm.border}` }}>{hm.label}</span></td>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <span style={{ fontSize: 13, fontWeight: 800, color: hsColor, minWidth: 28 }}>{r.health.healthScore}</span>
                            <div className="score-mini"><div className="score-mini-fill" style={{ width: r.health.healthScore + "%", background: hsColor }} /></div>
                          </div>
                        </td>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <div className="score-mini"><div className="score-mini-fill" style={{ width: r.health.progressNominal + "%", background: "#006D6B" }} /></div>
                            <span style={{ fontSize: 12, fontWeight: 700, color: "#0F172A" }}>{r.health.progressNominal}%</span>
                          </div>
                        </td>
                        <td style={{ color: "#64748B", fontSize: 11 }}>{fmtDate(r.startDate)}</td>
                        <td style={{ color: "#64748B", fontSize: 11 }}>{fmtDate(r.endDate)}</td>
                        <td style={{ color: r.health.delayDays > 0 ? "#DC2626" : "#059669", fontSize: 11, fontWeight: 600 }}>{fmtDate(r.health.endForecast)}</td>
                        <td style={{ color: r.health.delayDays > 0 ? "#DC2626" : "#059669", fontWeight: 700, fontSize: 12 }}>{r.health.delayDays > 0 ? `+${r.health.delayDays}d` : "—"}</td>
                        <td style={{ color: r.scheduleScore >= 70 ? "#059669" : r.scheduleScore >= 50 ? "#D97706" : "#DC2626", fontWeight: 700, fontSize: 12 }}>{r.scheduleScore}</td>
                        <td style={{ fontSize: 12, color: "#0F172A" }}>{r.budgetTotal > 0 ? fmtCurrency(r.budgetTotal) : "—"}</td>
                        <td style={{ fontSize: 12, color: "#059669", fontWeight: 600 }}>{fmtCurrency(r.costActual)}</td>
                        <td style={{ fontSize: 12, color: r.budgetTotal > 0 && r.costForecast > r.budgetTotal ? "#DC2626" : "#0F172A", fontWeight: r.budgetTotal > 0 && r.costForecast > r.budgetTotal ? 700 : 400 }}>{fmtCurrency(r.costForecast)}</td>
                        <td style={{ fontSize: 12, color: "#2563EB" }}>{r.revenueExpected > 0 ? fmtCurrency(r.revenueExpected) : "—"}</td>
                        <td style={{ fontSize: 12, fontWeight: 700, color: r.marginEur >= 0 ? "#059669" : "#DC2626" }}>{r.revenueExpected > 0 ? fmtCurrency(r.marginEur) : "—"}</td>
                        <td style={{ fontSize: 12, fontWeight: 700, color: r.marginPct >= 20 ? "#059669" : r.marginPct >= 0 ? "#D97706" : "#DC2626" }}>{r.revenueExpected > 0 ? fmtPct(r.marginPct) : "—"}</td>
                        <td style={{ fontSize: 11, color: "#64748B" }}>{r.burnRateActual > 0 ? fmtCurrency(r.burnRateActual) : "—"}</td>
                        <td style={{ fontSize: 12, color: "#0F172A" }}>{r.teamSize}</td>
                        <td><span style={{ fontSize: 12, fontWeight: 700, color: r.utilization > 100 ? "#DC2626" : r.utilization > 80 ? "#D97706" : "#059669" }}>{r.utilization}%</span></td>
                        <td style={{ textAlign: "center" }}>{r.overloaded ? <span style={{ fontSize: 12, color: "#DC2626" }}>⚠</span> : <span style={{ color: "#CBD5E1" }}>—</span>}</td>
                        <td><span className="badge" style={{ color: rm.color, background: rm.bg }}>{riskLevel}</span></td>
                        <td style={{ fontSize: 12, fontWeight: 700, color: r.riskScore > 15 ? "#DC2626" : r.riskScore > 8 ? "#D97706" : "#059669" }}>{r.riskScore}</td>
                        <td style={{ fontSize: 12, fontWeight: r.blockingIssues > 0 ? 700 : 400, color: r.blockingIssues > 0 ? "#DC2626" : "#CBD5E1" }}>{r.blockingIssues > 0 ? r.blockingIssues : "—"}</td>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <div className="score-mini"><div className="score-mini-fill" style={{ width: r.health.onTrackProbability + "%", background: confColor }} /></div>
                            <span style={{ fontSize: 12, fontWeight: 700, color: confColor }}>{r.health.onTrackProbability}%</span>
                          </div>
                        </td>
                        <td style={{ fontSize: 12, fontWeight: 700, color: (100 - r.health.onTrackProbability) > 50 ? "#DC2626" : (100 - r.health.onTrackProbability) > 30 ? "#D97706" : "#059669" }}>{100 - r.health.onTrackProbability}%</td>
                        <td style={{ fontSize: 12, color: r.marginTrend.startsWith("↑") ? "#059669" : r.marginTrend.startsWith("↓") ? "#DC2626" : "#D97706", fontWeight: 600 }}>{r.revenueExpected > 0 ? r.marginTrend : "—"}</td>
                        <td style={{ fontSize: 12, fontWeight: r.health.delayDays > 0 ? 700 : 400, color: r.health.delayDays > 0 ? "#DC2626" : "#CBD5E1" }}>{r.health.delayDays > 0 ? `${r.health.delayDays}d` : "—"}</td>
                        <td style={{ maxWidth: 200, fontSize: 11, color: "#475569" }}>{r.action}</td>
                        <td><span className="badge" style={{ color: r.actionColor, background: r.actionColor + "15" }}>{r.actionPriority}</span></td>
                        <td style={{ fontSize: 11, color: "#94A3B8" }}>{fmtDate(r.updatedAt)}</td>
                        <td><Link href={`/projects/${r.id}`} className="open-btn">Open →</Link></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
