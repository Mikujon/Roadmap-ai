export const dynamic = "force-dynamic";
import { db } from "@/lib/prisma";
import { getAuthContext } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getProjectMetrics, fmtCurrency } from "@/lib/metrics";

function spiColor(v: number) {
  return v >= 0.95 ? "#16A34A" : v >= 0.8 ? "#D97706" : "#DC2626";
}

export default async function CostViewPage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/sign-in");

  const projects = await db.project.findMany({
    where: { organisationId: ctx.org.id, status: { notIn: ["CLOSED", "ARCHIVED"] } },
    include: {
      assignments: { include: { resource: true } },
      sprints: { include: { features: true } },
      risks: true,
      requestedBy: { select: { name: true, email: true } },
      departments: { include: { department: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  const rows = projects.map(p => getProjectMetrics(p as any));

  const totalBudget   = rows.reduce((s, r) => s + r.budgetTotal, 0);
  const totalForecast = rows.reduce((s, r) => s + r.health.eac, 0);
  const avgCpi        = rows.length ? Math.round(rows.reduce((s, r) => s + r.health.cpi, 0) / rows.length * 100) / 100 : 1;
  const avgSpi        = rows.length ? Math.round(rows.reduce((s, r) => s + r.health.spi, 0) / rows.length * 100) / 100 : 1;
  const eacPctOver    = totalBudget > 0 ? Math.round(((totalForecast - totalBudget) / totalBudget) * 100) : 0;
  const totalActual   = rows.reduce((s, r) => s + r.costActual, 0);
  const budgetExposure = totalForecast - totalBudget;
  const budgetSpentPct = totalBudget > 0 ? Math.round((totalActual / totalBudget) * 100) : 0;

  // AI financial insights from health alerts
  const criticalBudgetRows = rows.filter(r => r.health.budgetRisk === "critical" || r.health.budgetRisk === "high");
  const warningRows        = rows.filter(r => r.health.spi < 0.85 && r.health.budgetRisk !== "critical");
  const goodRows           = rows.filter(r => r.health.cpi >= 1.05);

  return (
    <>
      <style>{`
        .ctbl { width: 100%; border-collapse: collapse; font-size: 12px; }
        .ctbl th { background: #FAFAF8; border-bottom: 1px solid #E5E2D9; padding: 9px 12px; text-align: left; font-size: 10px; font-weight: 700; color: #9E9C93; text-transform: uppercase; letter-spacing: .07em; white-space: nowrap; }
        .ctbl th.r { text-align: right; }
        .ctbl td { padding: 10px 12px; border-bottom: 1px solid #F0EEE8; vertical-align: middle; }
        .ctbl td.r { text-align: right; }
        .ctbl tbody tr:hover td { background: #FAFAF8; cursor: pointer; }
        .ctbl tbody tr:last-child td { border-bottom: none; }
        .gbar { display: flex; align-items: center; gap: 10px; padding: 10px 14px; background: linear-gradient(to right, rgba(0,109,107,.05), transparent); border-top: 1px solid #BBF7D0; font-size: 12px; color: #18170F; }
        .g-dot { width: 7px; height: 7px; border-radius: 50%; background: #006D6B; flex-shrink: 0; animation: blink 2s infinite; }
        .dec-item { display: flex; gap: 10px; align-items: flex-start; padding: 10px 14px; border-bottom: 1px solid #E5E2D9; }
        .dec-item:last-child { border-bottom: none; }
        .dec-item.urgent { background: rgba(220,38,38,.04); border-left: 3px solid #DC2626; }
        .dec-item.watch  { background: rgba(217,119,6,.04);  border-left: 3px solid #D97706; }
        .dec-item.good   { background: rgba(22,163,74,.04);  border-left: 3px solid #16A34A; }
        .dec-lbl { font-size: 9px; font-weight: 800; padding: 2px 6px; border-radius: 4px; white-space: nowrap; flex-shrink: 0; margin-top: 2px; letter-spacing: .06em; }
        .dec-text { font-size: 12px; font-weight: 500; color: #18170F; line-height: 1.4; }
        .kpi { padding: 12px 14px; border-radius: 10px; border: 1px solid #E5E2D9; }
        .kpi-label { font-size: 9px; font-weight: 700; color: #9E9C93; text-transform: uppercase; letter-spacing: .07em; margin-bottom: 4px; }
        .kpi-value { font-size: 22px; font-weight: 700; letter-spacing: -.5px; margin-bottom: 2px; }
        .kpi-sub { font-size: 10px; color: #9E9C93; }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:.4} }
      `}</style>

      <div style={{ padding: "20px 24px" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 }}>
          <div>
            <h1 style={{ fontSize: 18, fontWeight: 700, color: "#18170F", letterSpacing: "-.3px", margin: 0, marginBottom: 3 }}>Financials</h1>
            <p style={{ fontSize: 12, color: "#5C5A52", margin: 0 }}>Portfolio-wide EVM · PMI/PMBOK · live data</p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button style={{ padding: "7px 13px", border: "1px solid #E5E2D9", borderRadius: 8, background: "#fff", fontSize: 12, fontWeight: 500, color: "#5C5A52", cursor: "pointer", fontFamily: "inherit" }}>
              Export XLSX
            </button>
            <button style={{ padding: "7px 13px", border: "none", borderRadius: 8, background: "#006D6B", fontSize: 12, fontWeight: 600, color: "#fff", cursor: "pointer", fontFamily: "inherit" }}>
              Update Budget
            </button>
          </div>
        </div>

        {/* 4-KPI strip */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 16 }}>
          <div className="kpi" style={{ background: "#F8F7F3" }}>
            <div className="kpi-label">Total Budget (BAC)</div>
            <div className="kpi-value" style={{ color: "#18170F" }}>{fmtCurrency(totalBudget)}</div>
            <div className="kpi-sub">{projects.length} active projects</div>
          </div>
          <div className="kpi" style={{ background: "#FEF2F2", borderColor: "#FECACA" }}>
            <div className="kpi-label">EAC Forecast</div>
            <div className="kpi-value" style={{ color: "#DC2626" }}>{fmtCurrency(totalForecast)}</div>
            <div className="kpi-sub">{eacPctOver > 0 ? `+${eacPctOver}% vs plan` : `${eacPctOver}% vs plan`}</div>
          </div>
          <div className="kpi" style={{ background: avgCpi < 0.95 ? "#FFFBEB" : "#F0FDF4", borderColor: avgCpi < 0.95 ? "#FDE68A" : "#BBF7D0" }}>
            <div className="kpi-label">Avg CPI</div>
            <div className="kpi-value" style={{ color: spiColor(avgCpi), fontFamily: "var(--mono, monospace)" }}>{avgCpi.toFixed(2)}</div>
            <div className="kpi-sub">{avgCpi < 1.0 ? "below target 1.0" : "above target"}</div>
          </div>
          <div className="kpi" style={{ background: "#EFF6FF", borderColor: "#BFDBFE" }}>
            <div className="kpi-label">Avg SPI</div>
            <div className="kpi-value" style={{ color: spiColor(avgSpi), fontFamily: "var(--mono, monospace)" }}>{avgSpi.toFixed(2)}</div>
            <div className="kpi-sub">{avgSpi < 1.0 ? `avg delay ~${Math.round((1 - avgSpi) * 30)}d` : "on schedule"}</div>
          </div>
        </div>

        {/* Two-column layout */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 12, alignItems: "start" }}>

          {/* EVM per-project table */}
          <div style={{ background: "#fff", border: "1px solid #E5E2D9", borderRadius: 10, overflow: "hidden" }}>
            <div style={{ padding: "11px 14px", borderBottom: "1px solid #E5E2D9", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: "#18170F" }}>EVM per project</span>
              <span style={{ fontSize: 11, color: "#9E9C93" }}>live data · auto calculation</span>
            </div>
            <table className="ctbl">
              <thead>
                <tr>
                  <th>Project</th>
                  <th className="r">BAC</th>
                  <th className="r">ACWP</th>
                  <th className="r">BCWP</th>
                  <th className="r">CPI</th>
                  <th className="r">SPI</th>
                  <th className="r">EAC</th>
                  <th className="r">VAC</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(r => {
                  const vac      = r.budgetTotal - r.health.eac;
                  const vacColor = vac >= 0 ? "#16A34A" : "#DC2626";
                  return (
                    <tr key={r.id}>
                      <td style={{ minWidth: 140 }}>
                        <Link href={`/projects/${r.id}`} style={{ fontSize: 12, fontWeight: 600, color: "#18170F", textDecoration: "none" }}>
                          {r.name}
                        </Link>
                      </td>
                      <td className="r" style={{ fontFamily: "var(--mono, monospace)", fontSize: 11, color: "#5C5A52" }}>
                        {r.budgetTotal > 0 ? fmtCurrency(r.budgetTotal) : "—"}
                      </td>
                      <td className="r" style={{ fontFamily: "var(--mono, monospace)", fontSize: 11 }}>
                        {fmtCurrency(r.costActual)}
                      </td>
                      <td className="r" style={{ fontFamily: "var(--mono, monospace)", fontSize: 11 }}>
                        {fmtCurrency(r.health.ev)}
                      </td>
                      <td className="r" style={{ fontFamily: "var(--mono, monospace)", fontWeight: 700, fontSize: 12, color: spiColor(r.health.cpi) }}>
                        {r.health.cpi.toFixed(2)}
                      </td>
                      <td className="r" style={{ fontFamily: "var(--mono, monospace)", fontWeight: 700, fontSize: 12, color: spiColor(r.health.spi) }}>
                        {r.health.spi.toFixed(2)}
                      </td>
                      <td className="r" style={{ fontFamily: "var(--mono, monospace)", fontSize: 11, color: r.health.eac > r.budgetTotal && r.budgetTotal > 0 ? "#DC2626" : "#18170F" }}>
                        {fmtCurrency(r.health.eac)}
                      </td>
                      <td className="r" style={{ fontFamily: "var(--mono, monospace)", fontSize: 11, fontWeight: 700, color: vacColor }}>
                        {r.budgetTotal > 0 ? `${vac >= 0 ? "+" : ""}${fmtCurrency(vac)}` : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {/* Guardian bar */}
            <div className="gbar">
              <div className="g-dot" />
              <div style={{ flex: 1, fontSize: 12 }}>
                <strong>Financial Analyst AI</strong>
                {criticalBudgetRows.length > 0
                  ? ` — ${criticalBudgetRows.map(r => r.name).join(", ")} require budget review`
                  : " — portfolio within budget parameters"
                }
                {` · Combined CPI ${avgCpi.toFixed(2)}`}
                {avgCpi < 0.95 && " → urgent action required"}
              </div>
            </div>
          </div>

          {/* Right column */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>

            {/* Budget exposure card */}
            <div style={{ background: "#fff", border: "1px solid #E5E2D9", borderRadius: 10, overflow: "hidden" }}>
              <div style={{ padding: "11px 14px", borderBottom: "1px solid #E5E2D9" }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: "#18170F" }}>Total Exposure</span>
              </div>
              <div style={{ padding: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                  <span style={{ fontSize: 12, color: "#5C5A52" }}>Approved budget</span>
                  <span style={{ fontSize: 14, fontWeight: 700, fontFamily: "var(--mono, monospace)" }}>{fmtCurrency(totalBudget)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                  <span style={{ fontSize: 12, color: "#5C5A52" }}>Current EAC</span>
                  <span style={{ fontSize: 14, fontWeight: 700, fontFamily: "var(--mono, monospace)", color: budgetExposure > 0 ? "#DC2626" : "#16A34A" }}>{fmtCurrency(totalForecast)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "#18170F" }}>Projected overrun</span>
                  <span style={{ fontSize: 16, fontWeight: 800, fontFamily: "var(--mono, monospace)", color: budgetExposure > 0 ? "#DC2626" : "#16A34A" }}>
                    {budgetExposure > 0 ? `+${fmtCurrency(budgetExposure)}` : fmtCurrency(budgetExposure)}
                  </span>
                </div>
                <div style={{ height: 8, background: "#E5E2D9", borderRadius: 4, overflow: "hidden", marginBottom: 6 }}>
                  <div style={{ height: "100%", width: `${Math.min(budgetSpentPct, 100)}%`, background: budgetSpentPct > 90 ? "#DC2626" : "#006D6B", borderRadius: 4 }} />
                </div>
                <div style={{ fontSize: 10, color: "#9E9C93" }}>Spent: {budgetSpentPct}% of approved budget</div>
              </div>
            </div>

            {/* AI Financial Insights */}
            <div style={{ background: "#fff", border: "1px solid #E5E2D9", borderRadius: 10, overflow: "hidden" }}>
              <div style={{ padding: "11px 14px", borderBottom: "1px solid #E5E2D9" }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: "#18170F" }}>AI Financial Insights</span>
              </div>

              {criticalBudgetRows.length === 0 && warningRows.length === 0 && goodRows.length === 0 ? (
                <div style={{ padding: "20px 14px", fontSize: 12, color: "#9E9C93", textAlign: "center" }}>
                  All projects within normal parameters
                </div>
              ) : (
                <>
                  {criticalBudgetRows.slice(0, 2).map(r => (
                    <div key={r.id} className="dec-item urgent">
                      <div className="dec-lbl" style={{ background: "#DC2626", color: "#fff" }}>CRITICAL</div>
                      <div className="dec-text">
                        {r.name} CPI {r.health.cpi.toFixed(2)} — every $1 spent produces ${r.health.cpi.toFixed(2)} of value. Immediate action required.
                      </div>
                    </div>
                  ))}
                  {warningRows.slice(0, 2).map(r => (
                    <div key={r.id} className="dec-item watch">
                      <div className="dec-lbl" style={{ background: "#D97706", color: "#fff" }}>WATCH</div>
                      <div className="dec-text">
                        {r.name} SPI {r.health.spi.toFixed(2)} — cumulative delay will increase fixed costs.
                      </div>
                    </div>
                  ))}
                  {goodRows.slice(0, 1).map(r => (
                    <div key={r.id} className="dec-item good">
                      <div className="dec-lbl" style={{ background: "#16A34A", color: "#fff" }}>GOOD</div>
                      <div className="dec-text">
                        {r.name} — CPI {r.health.cpi.toFixed(2)} creates a useful buffer. Consider re-allocating resources to underperforming projects.
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>

          </div>
        </div>
      </div>
    </>
  );
}
