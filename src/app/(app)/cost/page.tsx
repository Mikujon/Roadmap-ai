export const dynamic = "force-dynamic";
import { db } from "@/lib/prisma";
import { getAuthContext } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getProjectMetrics, fmtCurrency, fmtDate } from "@/lib/metrics";

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
  const totalActual   = rows.reduce((s, r) => s + r.costActual, 0);
  const totalForecast = rows.reduce((s, r) => s + r.costForecast, 0);
  const totalDelta    = totalForecast - totalBudget;
  const totalRevenue  = rows.reduce((s, r) => s + r.revenueExpected, 0);
  const totalMargin   = totalRevenue - totalForecast;
  const avgBurnRate   = rows.reduce((s, r) => s + r.burnRateActual, 0);
  const atRisk        = rows.filter(r => r.health.budgetRisk === "high" || r.health.budgetRisk === "critical").length;
  const criticalAlerts = rows.flatMap(r => r.health.alerts.filter((a: any) => a.level === "critical" && a.category === "budget"));

  return (
    <>
      <style>{`
        .ctbl { width:100%; border-collapse:collapse; font-size:12px; }
        .ctbl th { background:var(--surface2); border-bottom:1px solid var(--border); padding:8px 12px; text-align:left; font-size:10px; font-weight:700; color:var(--text3); text-transform:uppercase; letter-spacing:.07em; white-space:nowrap; }
        .ctbl td { padding:11px 12px; border-bottom:1px solid var(--border); vertical-align:middle; }
        .crow:hover td { background:var(--surface2); }
        .crow:last-child td { border-bottom:none; }
        .cbar { height:5px; background:var(--surface2); border-radius:99px; overflow:hidden; }
        .cbar-fill { height:100%; border-radius:99px; }
        .effbar { height:7px; background:var(--surface2); border-radius:4px; overflow:hidden; }
      `}</style>

      <div style={{ padding: "20px 22px" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 }}>
          <div>
            <h1 style={{ fontSize: 18, fontWeight: 700, color: "var(--text)", letterSpacing: "-.3px", marginBottom: 2 }}>Financials</h1>
            <p style={{ fontSize: 12, color: "var(--text2)" }}>{ctx.org.name} · {projects.length} projects · EVM overview</p>
          </div>
          <Link href="/projects/new" style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 14px", background: "var(--guardian)", color: "#fff", borderRadius: "var(--radius)", fontSize: 12, fontWeight: 600, textDecoration: "none" }}>
            + New Project
          </Link>
        </div>

        {/* KPI strip */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 8, marginBottom: 16 }}>
          {[
            { label: "Total Budget",   value: fmtCurrency(totalBudget),   sub: "allocated",    intent: "default" },
            { label: "Cost Actual",    value: fmtCurrency(totalActual),   sub: "spent so far", intent: "ok"      },
            { label: "Cost Forecast",  value: fmtCurrency(totalForecast), sub: "projected EAC",intent: totalDelta > 0 ? "danger" : "ok"      },
            { label: "Budget Delta",   value: (totalDelta > 0 ? "+" : "") + fmtCurrency(totalDelta), sub: totalDelta > 0 ? "over budget" : "under budget", intent: totalDelta > 0 ? "danger" : "ok" },
            { label: "Avg Burn/day",   value: fmtCurrency(avgBurnRate),   sub: "portfolio",    intent: "info"    },
            { label: "Budget At Risk", value: String(atRisk),             sub: `${criticalAlerts.length} critical`, intent: atRisk > 0 ? "warn" : "default" },
          ].map(k => {
            const bg     = k.intent === "danger" ? "var(--red-bg)"     : k.intent === "warn" ? "var(--amber-bg)"   : k.intent === "ok" ? "var(--green-bg)"   : k.intent === "info" ? "var(--blue-bg)"   : "var(--surface)";
            const border = k.intent === "danger" ? "var(--red-border)" : k.intent === "warn" ? "var(--amber-border)": k.intent === "ok" ? "var(--green-border)": k.intent === "info" ? "var(--blue-border)": "var(--border)";
            const color  = k.intent === "danger" ? "var(--red-text)"   : k.intent === "warn" ? "var(--amber-text)" : k.intent === "ok" ? "var(--green-text)"  : k.intent === "info" ? "var(--blue-text)"  : "var(--text)";
            return (
              <div key={k.label} style={{ background: bg, border: `1px solid ${border}`, borderRadius: "var(--radius-lg)", padding: "12px 14px" }}>
                <div style={{ fontSize: 9, fontWeight: 700, color: "var(--text3)", letterSpacing: ".07em", textTransform: "uppercase", marginBottom: 4 }}>{k.label}</div>
                <div style={{ fontSize: 20, fontWeight: 700, color, letterSpacing: "-.4px", marginBottom: 2 }}>{k.value}</div>
                <div style={{ fontSize: 10, color: "var(--text3)" }}>{k.sub}</div>
              </div>
            );
          })}
        </div>

        {/* Portfolio budget bar */}
        {totalBudget > 0 && (
          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "16px 18px", marginBottom: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", marginBottom: 2 }}>Portfolio Budget Overview</div>
                <div style={{ fontSize: 11, color: "var(--text2)" }}>
                  {Math.round((totalActual / totalBudget) * 100)}% consumed · Forecast {totalForecast > totalBudget ? "over" : "under"} budget by {fmtCurrency(Math.abs(totalDelta))}
                </div>
              </div>
              {totalRevenue > 0 && (
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 10, color: "var(--text3)", marginBottom: 2 }}>Portfolio Margin</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: totalMargin >= 0 ? "var(--green-text)" : "var(--red-text)" }}>{fmtCurrency(totalMargin)}</div>
                </div>
              )}
            </div>
            <div style={{ position: "relative", height: 10, background: "var(--surface2)", borderRadius: 99, overflow: "hidden", marginBottom: 10 }}>
              <div style={{ position: "absolute", left: 0, height: "100%", width: `${Math.min(100, (totalActual / totalBudget) * 100)}%`, background: "var(--guardian)", borderRadius: 99 }} />
              {totalForecast > totalActual && (
                <div style={{ position: "absolute", left: `${Math.min(100, (totalActual / totalBudget) * 100)}%`, height: "100%", width: `${Math.min(100 - (totalActual / totalBudget) * 100, ((totalForecast - totalActual) / totalBudget) * 100)}%`, background: totalForecast > totalBudget ? "var(--red)" : "var(--blue)", opacity: .3 }} />
              )}
            </div>
            <div style={{ display: "flex", gap: 18 }}>
              {[
                { label: "Actual",   value: fmtCurrency(totalActual),   color: "var(--guardian)"  },
                { label: "Forecast", value: fmtCurrency(totalForecast), color: totalForecast > totalBudget ? "var(--red)" : "var(--blue)" },
                { label: "Budget",   value: fmtCurrency(totalBudget),   color: "var(--text)"      },
                ...(totalRevenue > 0 ? [{ label: "Revenue", value: fmtCurrency(totalRevenue), color: "var(--blue)" }] : []),
              ].map(l => (
                <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <div style={{ width: 7, height: 7, borderRadius: 2, background: l.color }} />
                  <span style={{ fontSize: 11, color: "var(--text2)" }}>{l.label}: <strong style={{ color: "var(--text)" }}>{l.value}</strong></span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Critical alerts */}
        {criticalAlerts.length > 0 && (
          <div style={{ background: "var(--red-bg)", border: "1px solid var(--red-border)", borderRadius: "var(--radius-lg)", padding: "13px 16px", marginBottom: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--red-text)", marginBottom: 10 }}>Cost alerts requiring attention</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {rows.filter(r => r.health.alerts.some((a: any) => a.level === "critical" && a.category === "budget")).map(r =>
                r.health.alerts.filter((a: any) => a.level === "critical" && a.category === "budget").map((a: any, i: number) => (
                  <div key={`${r.id}-${i}`} style={{ display: "flex", alignItems: "flex-start", gap: 10, background: "var(--surface)", border: "1px solid var(--red-border)", borderRadius: "var(--radius)", padding: "9px 12px" }}>
                    <div style={{ flex: 1 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text)" }}>{r.name}: </span>
                      <span style={{ fontSize: 11, color: "var(--text2)" }}>{a.title}</span>
                      <div style={{ fontSize: 10, color: "var(--guardian)", fontWeight: 600, marginTop: 2 }}>→ {a.action}</div>
                    </div>
                    <Link href={`/projects/${r.id}`} style={{ fontSize: 11, color: "var(--guardian)", fontWeight: 600, textDecoration: "none", flexShrink: 0 }}>View →</Link>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* EVM table */}
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", overflow: "hidden", marginBottom: 14 }}>
          <div style={{ padding: "12px 15px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text)" }}>Project Cost Breakdown</span>
            <span style={{ fontSize: 10, color: "var(--text3)" }}>{rows.length} projects</span>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table className="ctbl">
              <thead>
                <tr>
                  <th>Project</th><th>Progress</th><th>Budget (BAC)</th><th>Actual (ACWP)</th>
                  <th>Forecast (EAC)</th><th>Delta (VAC)</th><th>Burn/day</th><th>€/1%</th>
                  <th>Efficiency</th><th>Revenue</th><th>Margin</th><th>Alerts</th><th></th>
                </tr>
              </thead>
              <tbody>
                {rows.map(r => {
                  const effC = r.costEfficiency <= 100 ? "var(--green-text)" : r.costEfficiency <= 130 ? "var(--amber-text)" : "var(--red-text)";
                  const topAlert = r.health.alerts.find((a: any) => a.level === "critical") ?? r.health.alerts.find((a: any) => a.level === "warning");
                  return (
                    <tr key={r.id} className="crow">
                      <td style={{ minWidth: 150 }}>
                        <Link href={`/projects/${r.id}`} style={{ fontSize: 12, fontWeight: 600, color: "var(--text)", textDecoration: "none" }}>{r.name}</Link>
                        {r.deptNames && <div style={{ fontSize: 10, color: "var(--text3)", marginTop: 1 }}>{r.deptNames}</div>}
                      </td>
                      <td style={{ minWidth: 100 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <div className="cbar" style={{ flex: 1 }}><div className="cbar-fill" style={{ width: r.health.progressNominal + "%", background: "var(--guardian)" }} /></div>
                          <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text)", minWidth: 28 }}>{r.health.progressNominal}%</span>
                        </div>
                      </td>
                      <td style={{ fontSize: 11 }}>{r.budgetTotal > 0 ? fmtCurrency(r.budgetTotal) : <span style={{ color: "var(--text3)" }}>—</span>}</td>
                      <td style={{ fontSize: 11, fontWeight: 600, color: "var(--green-text)" }}>{fmtCurrency(r.costActual)}</td>
                      <td style={{ fontSize: 11, fontWeight: 600, color: r.budgetTotal > 0 && r.costForecast > r.budgetTotal ? "var(--red-text)" : "var(--text)" }}>{fmtCurrency(r.costForecast)}</td>
                      <td>
                        {r.budgetTotal > 0 ? (
                          <span style={{ fontSize: 11, fontWeight: 700, color: r.health.budgetDelta > 0 ? "var(--red-text)" : "var(--green-text)" }}>
                            {r.health.budgetDelta > 0 ? "+" : ""}{fmtCurrency(r.health.budgetDelta)}
                          </span>
                        ) : <span style={{ color: "var(--text3)" }}>—</span>}
                      </td>
                      <td>
                        <div style={{ fontSize: 11, color: "var(--blue-text)", fontWeight: 600 }}>{r.burnRateActual > 0 ? fmtCurrency(r.burnRateActual) : "—"}</div>
                        {r.burnRatePlanned > 0 && <div style={{ fontSize: 10, color: "var(--text3)" }}>plan: {fmtCurrency(r.burnRatePlanned)}</div>}
                      </td>
                      <td style={{ fontSize: 11, color: "var(--text2)" }}>
                        {r.costPerPct > 0 ? fmtCurrency(r.costPerPct) : "—"}
                        {r.baselineCostPerPct > 0 && <div style={{ fontSize: 10, color: "var(--text3)" }}>base: {fmtCurrency(r.baselineCostPerPct)}</div>}
                      </td>
                      <td style={{ minWidth: 90 }}>
                        {r.health.progressNominal > 0 && r.budgetTotal > 0 ? (
                          <div>
                            <div style={{ fontSize: 10, color: effC, fontWeight: 700, marginBottom: 3 }}>{Math.round(r.costEfficiency)}%</div>
                            <div className="effbar"><div style={{ height: "100%", width: `${Math.min(r.costEfficiency, 200) / 2}%`, background: effC, borderRadius: 4 }} /></div>
                          </div>
                        ) : <span style={{ fontSize: 11, color: "var(--text3)" }}>—</span>}
                      </td>
                      <td style={{ fontSize: 11, color: "var(--blue-text)" }}>{r.revenueExpected > 0 ? fmtCurrency(r.revenueExpected) : <span style={{ color: "var(--text3)" }}>—</span>}</td>
                      <td>
                        {r.revenueExpected > 0 ? (
                          <div>
                            <span style={{ fontSize: 11, fontWeight: 700, color: r.marginEur >= 0 ? "var(--green-text)" : "var(--red-text)" }}>{fmtCurrency(r.marginEur)}</span>
                            <div style={{ fontSize: 10, color: r.marginPct >= 20 ? "var(--green-text)" : r.marginPct >= 0 ? "var(--amber-text)" : "var(--red-text)", fontWeight: 600 }}>{Math.round(r.marginPct)}%</div>
                          </div>
                        ) : <span style={{ color: "var(--text3)" }}>—</span>}
                      </td>
                      <td>
                        {topAlert ? (
                          <span style={{ fontSize: 10, color: (topAlert as any).level === "critical" ? "var(--red-text)" : "var(--amber-text)", fontWeight: 600 }}>
                            {(topAlert as any).title?.slice(0, 28)}…
                          </span>
                        ) : <span style={{ fontSize: 10, color: "var(--green-text)", fontWeight: 600 }}>✓ On track</span>}
                      </td>
                      <td><Link href={`/projects/${r.id}`} style={{ fontSize: 11, color: "var(--guardian)", fontWeight: 600, textDecoration: "none" }}>Open →</Link></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Resource cost breakdown */}
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", overflow: "hidden" }}>
          <div style={{ padding: "12px 15px", borderBottom: "1px solid var(--border)" }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text)", marginBottom: 2 }}>Resource Cost Breakdown</div>
            <div style={{ fontSize: 11, color: "var(--text2)" }}>Actual cost by resource across all projects</div>
          </div>
          {(() => {
            const resourceMap = new Map<string, { name: string; role: string; ratePerHour: number; totalHours: number; totalCost: number; projects: Set<string> }>();
            rows.forEach(r => {
              (projects.find(p => p.id === r.id) as any)?.assignments?.forEach((a: any) => {
                const key = a.resource.id;
                const existing = resourceMap.get(key) ?? { name: a.resource.name, role: a.resource.role, ratePerHour: a.resource.costPerHour, totalHours: 0, totalCost: 0, projects: new Set<string>() };
                existing.totalHours += a.actualHours;
                existing.totalCost  += a.actualHours * a.resource.costPerHour;
                existing.projects.add(r.name);
                resourceMap.set(key, existing);
              });
            });
            const resources = Array.from(resourceMap.values()).sort((a, b) => b.totalCost - a.totalCost);
            if (resources.length === 0) return (
              <div style={{ padding: "32px", textAlign: "center", fontSize: 12, color: "var(--text3)" }}>
                No resource assignments yet — assign resources in the Governance tab.
              </div>
            );
            return (
              <table className="ctbl">
                <thead>
                  <tr><th>Resource</th><th>Role</th><th>Rate/h</th><th>Hours</th><th>Total Cost</th><th>Projects</th><th>Share</th></tr>
                </thead>
                <tbody>
                  {resources.map((res, i) => {
                    const share = totalActual > 0 ? (res.totalCost / totalActual) * 100 : 0;
                    return (
                      <tr key={i} className="crow">
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                            <div style={{ width: 26, height: 26, borderRadius: "50%", background: "var(--blue-bg)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: "var(--blue-text)", flexShrink: 0 }}>{res.name[0]}</div>
                            <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text)" }}>{res.name}</span>
                          </div>
                        </td>
                        <td style={{ fontSize: 11, color: "var(--text2)" }}>{res.role}</td>
                        <td style={{ fontSize: 11, color: "var(--text)" }}>{fmtCurrency(res.ratePerHour)}/h</td>
                        <td style={{ fontSize: 11, color: "var(--blue-text)", fontWeight: 600 }}>{res.totalHours}h</td>
                        <td style={{ fontSize: 12, fontWeight: 700, color: "var(--text)" }}>{fmtCurrency(res.totalCost)}</td>
                        <td style={{ fontSize: 11, color: "var(--text2)", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{Array.from(res.projects).join(", ")}</td>
                        <td style={{ minWidth: 110 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                            <div className="cbar" style={{ flex: 1 }}><div className="cbar-fill" style={{ width: share + "%", background: "var(--guardian)" }} /></div>
                            <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text)", minWidth: 30 }}>{Math.round(share)}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            );
          })()}
        </div>
      </div>
    </>
  );
}
