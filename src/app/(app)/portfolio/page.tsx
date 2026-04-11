export const dynamic = "force-dynamic";
import { db } from "@/lib/prisma";
import { getAuthContext } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getProjectMetrics, fmtCurrency, fmtDate, fmtPct } from "@/lib/metrics";
import { HEALTH_STATUS_META } from "@/lib/health";

export default async function PortfolioPage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/sign-in");

  const projects = await db.project.findMany({
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

  const rows = projects.map(p => getProjectMetrics(p as any));

  const criticalCount = rows.filter(r => r.health.status === "OFF_TRACK").length;
  const atRiskCount   = rows.filter(r => r.health.status === "AT_RISK").length;

  const COLS = [
    "Project", "Client", "Dept", "Health", "Score", "Progress",
    "Start", "End", "Forecast", "Delay", "SPI",
    "Budget", "Actual", "EAC", "Revenue", "Margin €", "Margin %", "Burn/d",
    "Team", "Util%", "⚠", "Risk", "Risk Sc.", "Blocked",
    "Conf%", "Fail%", "Trend", "Pred.Delay", "Action", "Priority", "Updated",
  ];

  return (
    <>
      <style>{`
        .ptbl { width:100%; border-collapse:collapse; font-size:12px; }
        .ptbl th { background:var(--surface2); border-bottom:1px solid var(--border); padding:8px 11px; text-align:left; font-size:10px; font-weight:700; color:var(--text3); text-transform:uppercase; letter-spacing:.07em; white-space:nowrap; position:sticky; top:0; z-index:1; }
        .ptbl td { padding:10px 11px; border-bottom:1px solid var(--border); vertical-align:middle; white-space:nowrap; color:var(--text); }
        .prow:hover td { background:var(--surface2); }
        .prow:last-child td { border-bottom:none; }
        .pbadge { display:inline-flex; align-items:center; padding:2px 7px; border-radius:4px; font-size:10px; font-weight:700; white-space:nowrap; border:1px solid transparent; }
        .pbar { height:4px; background:var(--surface2); border-radius:99px; overflow:hidden; width:56px; display:inline-block; }
        .pbar-fill { height:100%; border-radius:99px; }
      `}</style>

      <div style={{ padding: "20px 22px" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 }}>
          <div>
            <h1 style={{ fontSize: 18, fontWeight: 700, color: "var(--text)", letterSpacing: "-.3px", marginBottom: 2 }}>Portfolio</h1>
            <p style={{ fontSize: 12, color: "var(--text2)" }}>{ctx.org.name} · {projects.length} active projects</p>
          </div>
          <Link href="/projects/new" style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 14px", background: "var(--guardian)", color: "#fff", borderRadius: "var(--radius)", fontSize: 12, fontWeight: 600, textDecoration: "none" }}>
            + New Project
          </Link>
        </div>

        {/* KPI strip */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 8, marginBottom: 16 }}>
          {[
            { label: "Total",     value: rows.length,                                                          intent: "default" },
            { label: "On Track",  value: rows.filter(r => r.health.status === "ON_TRACK").length,              intent: "ok"      },
            { label: "At Risk",   value: atRiskCount,                                                          intent: atRiskCount > 0 ? "warn" : "ok"      },
            { label: "Off Track", value: criticalCount,                                                        intent: criticalCount > 0 ? "danger" : "ok"  },
            { label: "Completed", value: rows.filter(r => r.health.status === "COMPLETED").length,             intent: "info"    },
            { label: "Delayed",   value: rows.filter(r => r.health.delayDays > 0).length,                     intent: rows.filter(r => r.health.delayDays > 0).length > 0 ? "warn" : "default" },
            { label: "Avg Score", value: rows.length ? Math.round(rows.reduce((s, r) => s + r.health.healthScore, 0) / rows.length) : 0, intent: "default" },
          ].map(k => {
            const bg     = k.intent === "danger" ? "var(--red-bg)"    : k.intent === "warn" ? "var(--amber-bg)"  : k.intent === "ok" ? "var(--green-bg)"  : k.intent === "info" ? "var(--blue-bg)"  : "var(--surface)";
            const border = k.intent === "danger" ? "var(--red-border)": k.intent === "warn" ? "var(--amber-border)": k.intent === "ok" ? "var(--green-border)": k.intent === "info" ? "var(--blue-border)": "var(--border)";
            const color  = k.intent === "danger" ? "var(--red-text)"  : k.intent === "warn" ? "var(--amber-text)": k.intent === "ok" ? "var(--green-text)" : k.intent === "info" ? "var(--blue-text)" : "var(--text)";
            return (
              <div key={k.label} style={{ background: bg, border: `1px solid ${border}`, borderRadius: "var(--radius-lg)", padding: "11px 13px" }}>
                <div style={{ fontSize: 9, fontWeight: 700, color: "var(--text3)", letterSpacing: ".07em", textTransform: "uppercase", marginBottom: 4 }}>{k.label}</div>
                <div style={{ fontSize: 22, fontWeight: 700, color, letterSpacing: "-.5px" }}>{k.value}</div>
              </div>
            );
          })}
        </div>

        {/* Critical banner */}
        {rows.some(r => r.health.alerts.some((a: any) => a.level === "critical")) && (
          <div style={{ background: "var(--red-bg)", border: "1px solid var(--red-border)", borderRadius: "var(--radius-lg)", padding: "12px 16px", marginBottom: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--red-text)", marginBottom: 8 }}>Critical issues require attention</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              {rows.flatMap(r => r.health.alerts.filter((a: any) => a.level === "critical").map((a: any) => (
                <div key={`${r.id}-${a.id}`} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "var(--red-text)", minWidth: 130, flexShrink: 0 }}>{r.name}</span>
                  <span style={{ fontSize: 11, color: "var(--text2)" }}>{a.title} — </span>
                  <span style={{ fontSize: 11, color: "var(--guardian)", fontWeight: 600 }}>→ {a.action}</span>
                </div>
              )))}
            </div>
          </div>
        )}

        {rows.length === 0 ? (
          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", textAlign: "center", padding: "80px 0" }}>
            <p style={{ fontSize: 14, color: "var(--text3)", marginBottom: 16 }}>No active projects</p>
            <Link href="/projects/new" style={{ padding: "9px 20px", background: "var(--guardian)", color: "#fff", borderRadius: "var(--radius)", fontSize: 13, fontWeight: 600, textDecoration: "none" }}>
              Create first project
            </Link>
          </div>
        ) : (
          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", overflow: "hidden" }}>
            <div style={{ overflowX: "auto" }}>
              <table className="ptbl">
                <thead>
                  <tr>{COLS.map(c => <th key={c}>{c}</th>)}<th></th></tr>
                </thead>
                <tbody>
                  {rows.map(r => {
                    const hm  = HEALTH_STATUS_META[r.health.status] ?? HEALTH_STATUS_META.NOT_STARTED;
                    const hs  = r.health.healthScore;
                    const hsC = hs >= 80 ? "var(--green-text)" : hs >= 60 ? "var(--amber-text)" : "var(--red-text)";
                    const cc  = r.health.onTrackProbability >= 70 ? "var(--green-text)" : r.health.onTrackProbability >= 50 ? "var(--amber-text)" : "var(--red-text)";
                    const rl  = r.health.riskLevel?.toUpperCase() ?? "LOW";
                    const rlC = rl === "CRITICAL" || rl === "HIGH" ? "var(--red-text)" : rl === "MEDIUM" ? "var(--amber-text)" : "var(--green-text)";
                    const rlB = rl === "CRITICAL" || rl === "HIGH" ? "var(--red-bg)"   : rl === "MEDIUM" ? "var(--amber-bg)"  : "var(--green-bg)";
                    return (
                      <tr key={r.id} className="prow">
                        <td style={{ minWidth: 150 }}>
                          <Link href={`/projects/${r.id}`} style={{ fontSize: 12, fontWeight: 600, color: "var(--text)", textDecoration: "none" }}>{r.name}</Link>
                          {r.deptNames && <div style={{ fontSize: 10, color: "var(--text3)", marginTop: 1 }}>{r.deptNames}</div>}
                        </td>
                        <td style={{ color: "var(--text2)", fontSize: 11 }}>{r.client || "—"}</td>
                        <td style={{ color: "var(--text2)", fontSize: 11, maxWidth: 100, overflow: "hidden", textOverflow: "ellipsis" }}>{r.deptNames || "—"}</td>
                        <td>
                          <span className="pbadge" style={{ color: hm.color, background: hm.bg, borderColor: hm.border }}>{hm.label}</span>
                        </td>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <span style={{ fontSize: 12, fontWeight: 700, color: hsC, minWidth: 26 }}>{hs}</span>
                            <span className="pbar"><span className="pbar-fill" style={{ width: hs + "%", background: hsC }} /></span>
                          </div>
                        </td>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <span className="pbar"><span className="pbar-fill" style={{ width: r.health.progressNominal + "%", background: "var(--guardian)" }} /></span>
                            <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text)" }}>{r.health.progressNominal}%</span>
                          </div>
                        </td>
                        <td style={{ color: "var(--text3)", fontSize: 11 }}>{fmtDate(r.startDate)}</td>
                        <td style={{ color: "var(--text3)", fontSize: 11 }}>{fmtDate(r.endDate)}</td>
                        <td style={{ fontSize: 11, fontWeight: 600, color: r.health.delayDays > 0 ? "var(--red-text)" : "var(--green-text)" }}>{fmtDate(r.health.endForecast)}</td>
                        <td style={{ fontSize: 11, fontWeight: 700, color: r.health.delayDays > 0 ? "var(--red-text)" : "var(--text3)" }}>{r.health.delayDays > 0 ? `+${r.health.delayDays}d` : "—"}</td>
                        <td style={{ fontSize: 11, fontWeight: 700, color: r.scheduleScore >= 70 ? "var(--green-text)" : r.scheduleScore >= 50 ? "var(--amber-text)" : "var(--red-text)" }}>{r.scheduleScore}</td>
                        <td style={{ fontSize: 11 }}>{r.budgetTotal > 0 ? fmtCurrency(r.budgetTotal) : "—"}</td>
                        <td style={{ fontSize: 11, color: "var(--green-text)", fontWeight: 600 }}>{fmtCurrency(r.costActual)}</td>
                        <td style={{ fontSize: 11, fontWeight: r.budgetTotal > 0 && r.costForecast > r.budgetTotal ? 700 : 400, color: r.budgetTotal > 0 && r.costForecast > r.budgetTotal ? "var(--red-text)" : "var(--text)" }}>{fmtCurrency(r.costForecast)}</td>
                        <td style={{ fontSize: 11, color: "var(--blue-text)" }}>{r.revenueExpected > 0 ? fmtCurrency(r.revenueExpected) : "—"}</td>
                        <td style={{ fontSize: 11, fontWeight: 700, color: r.marginEur >= 0 ? "var(--green-text)" : "var(--red-text)" }}>{r.revenueExpected > 0 ? fmtCurrency(r.marginEur) : "—"}</td>
                        <td style={{ fontSize: 11, fontWeight: 700, color: r.marginPct >= 20 ? "var(--green-text)" : r.marginPct >= 0 ? "var(--amber-text)" : "var(--red-text)" }}>{r.revenueExpected > 0 ? fmtPct(r.marginPct) : "—"}</td>
                        <td style={{ fontSize: 11, color: "var(--text2)" }}>{r.burnRateActual > 0 ? fmtCurrency(r.burnRateActual) : "—"}</td>
                        <td style={{ fontSize: 11 }}>{r.teamSize}</td>
                        <td style={{ fontSize: 11, fontWeight: 700, color: r.utilization > 100 ? "var(--red-text)" : r.utilization > 80 ? "var(--amber-text)" : "var(--green-text)" }}>{r.utilization}%</td>
                        <td style={{ textAlign: "center" }}>{r.overloaded ? <span style={{ color: "var(--red-text)" }}>⚠</span> : <span style={{ color: "var(--text3)" }}>—</span>}</td>
                        <td><span className="pbadge" style={{ color: rlC, background: rlB }}>{rl}</span></td>
                        <td style={{ fontSize: 11, fontWeight: 700, color: r.riskScore > 15 ? "var(--red-text)" : r.riskScore > 8 ? "var(--amber-text)" : "var(--green-text)" }}>{r.riskScore}</td>
                        <td style={{ fontSize: 11, fontWeight: r.blockingIssues > 0 ? 700 : 400, color: r.blockingIssues > 0 ? "var(--red-text)" : "var(--text3)" }}>{r.blockingIssues > 0 ? r.blockingIssues : "—"}</td>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <span className="pbar"><span className="pbar-fill" style={{ width: r.health.onTrackProbability + "%", background: cc }} /></span>
                            <span style={{ fontSize: 11, fontWeight: 700, color: cc }}>{r.health.onTrackProbability}%</span>
                          </div>
                        </td>
                        <td style={{ fontSize: 11, fontWeight: 700, color: (100 - r.health.onTrackProbability) > 50 ? "var(--red-text)" : (100 - r.health.onTrackProbability) > 30 ? "var(--amber-text)" : "var(--green-text)" }}>{100 - r.health.onTrackProbability}%</td>
                        <td style={{ fontSize: 11, fontWeight: 600, color: r.marginTrend?.startsWith("↑") ? "var(--green-text)" : r.marginTrend?.startsWith("↓") ? "var(--red-text)" : "var(--amber-text)" }}>{r.revenueExpected > 0 ? r.marginTrend : "—"}</td>
                        <td style={{ fontSize: 11, fontWeight: r.health.delayDays > 0 ? 700 : 400, color: r.health.delayDays > 0 ? "var(--red-text)" : "var(--text3)" }}>{r.health.delayDays > 0 ? `${r.health.delayDays}d` : "—"}</td>
                        <td style={{ maxWidth: 180, fontSize: 11, color: "var(--text2)", overflow: "hidden", textOverflow: "ellipsis" }}>{r.action}</td>
                        <td><span className="pbadge" style={{ color: r.actionColor, background: r.actionColor + "18" }}>{r.actionPriority}</span></td>
                        <td style={{ fontSize: 10, color: "var(--text3)" }}>{fmtDate(r.updatedAt)}</td>
                        <td><Link href={`/projects/${r.id}`} style={{ fontSize: 11, color: "var(--guardian)", fontWeight: 600, textDecoration: "none" }}>Open →</Link></td>
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
