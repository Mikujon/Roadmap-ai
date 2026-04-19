export const dynamic = 'force-dynamic';import { db } from "@/lib/prisma";
import { getAuthContext } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getProjectMetrics, fmtCurrency, fmtDate } from "@/lib/metrics";
import { unstable_cache } from "next/cache";

export default async function CostViewPage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/sign-in");

const getProjects = () => db.project.findMany({
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

  const projects = await getProjects();
  const rows = projects.map(p => getProjectMetrics(p as any));

  // Portfolio totals
  const totalBudget   = rows.reduce((s, r) => s + r.budgetTotal, 0);
  const totalActual   = rows.reduce((s, r) => s + r.costActual, 0);
  const totalForecast = rows.reduce((s, r) => s + r.costForecast, 0);
  const totalDelta    = totalForecast - totalBudget;
  const totalRevenue  = rows.reduce((s, r) => s + r.revenueExpected, 0);
  const totalMargin   = totalRevenue - totalForecast;
  const avgBurnRate   = rows.reduce((s, r) => s + r.burnRateActual, 0);
  const atRisk        = rows.filter(r => r.health.budgetRisk === "high" || r.health.budgetRisk === "critical").length;
  const criticalAlerts = rows.flatMap(r => r.health.alerts.filter(a => a.level === "critical" && a.category === "budget"));

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; }
        .card { background: #fff; border: 1px solid #E2E8F0; border-radius: 14px; }
        .kpi { background: #fff; border: 1px solid #E2E8F0; border-radius: 14px; padding: 18px 20px; }
        .progress-bar { height: 6px; background: #F1F5F9; border-radius: 3px; overflow: hidden; }
        .progress-fill { height: 100%; border-radius: 3px; }
        .alert-row { display: flex; align-items: flex-start; gap: 10px; padding: 10px 14px; border-radius: 10px; }
        .cost-table { width: 100%; border-collapse: collapse; font-size: 12px; }
        .cost-table th { background: #FAFBFC; border-bottom: 1px solid #E2E8F0; padding: 9px 14px; text-align: left; font-size: 10px; font-weight: 700; color: #94A3B8; text-transform: uppercase; letter-spacing: 0.07em; white-space: nowrap; }
        .cost-table td { padding: 13px 14px; border-bottom: 1px solid #F1F5F9; vertical-align: middle; }
        .cost-row:hover td { background: #FAFBFC; }
        .cost-row:last-child td { border-bottom: none; }
        .badge { display: inline-flex; align-items: center; padding: 2px 8px; border-radius: 20px; font-size: 10px; font-weight: 700; }
        .efficiency-bar { height: 8px; background: #F1F5F9; border-radius: 4px; overflow: hidden; position: relative; }
      `}</style>

      <div style={{ padding: "28px 32px", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: "#0F172A", letterSpacing: "-0.5px", marginBottom: 4 }}>Cost View</h1>
            <p style={{ fontSize: 13, color: "#94A3B8", fontWeight: 500 }}>
              {ctx.org.name} · {projects.length} projects · Financial overview
            </p>
          </div>
          <Link href="/projects/new" style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "10px 18px", background: "#006D6B", color: "#fff", borderRadius: 10, fontSize: 13, fontWeight: 600, textDecoration: "none", boxShadow: "0 2px 8px rgba(0,109,107,0.2)" }}>
            + New Project
          </Link>
        </div>

        {/* KPI Overview */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 12, marginBottom: 24 }}>
          {[
            { label: "Total Budget",  value: fmtCurrency(totalBudget),   color: "#0F172A", sub: "allocated" },
            { label: "Cost Actual",   value: fmtCurrency(totalActual),   color: "#059669", sub: "spent so far" },
            { label: "Cost Forecast", value: fmtCurrency(totalForecast), color: totalDelta > 0 ? "#DC2626" : "#059669", sub: "projected total" },
            { label: "Delta",         value: (totalDelta > 0 ? "+" : "") + fmtCurrency(totalDelta), color: totalDelta > 0 ? "#DC2626" : "#059669", sub: totalDelta > 0 ? "over budget" : "under budget" },
            { label: "Avg Burn/day",  value: fmtCurrency(avgBurnRate),   color: "#2563EB", sub: "across portfolio" },
            { label: "Budget At Risk",value: atRisk,                      color: atRisk > 0 ? "#D97706" : "#059669", sub: `${criticalAlerts.length} critical` },
          ].map(k => (
            <div key={k.label} className="kpi">
              <div style={{ fontSize: 10, fontWeight: 700, color: "#94A3B8", letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: 8 }}>{k.label}</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: k.color, letterSpacing: "-1px", marginBottom: 4 }}>{k.value}</div>
              <div style={{ fontSize: 11, color: "#94A3B8", fontWeight: 500 }}>{k.sub}</div>
            </div>
          ))}
        </div>

        {/* Budget vs Forecast bar */}
        {totalBudget > 0 && (
          <div className="card" style={{ padding: "20px 24px", marginBottom: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#0F172A", marginBottom: 2 }}>Portfolio Budget Overview</div>
                <div style={{ fontSize: 12, color: "#94A3B8" }}>
                  {Math.round((totalActual / totalBudget) * 100)}% consumed · Forecast {totalForecast > totalBudget ? "over" : "under"} budget by {fmtCurrency(Math.abs(totalDelta))}
                </div>
              </div>
              {totalRevenue > 0 && (
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 12, color: "#94A3B8", marginBottom: 2 }}>Portfolio Margin</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: totalMargin >= 0 ? "#059669" : "#DC2626" }}>{fmtCurrency(totalMargin)}</div>
                </div>
              )}
            </div>
            <div style={{ position: "relative", height: 12, background: "#F1F5F9", borderRadius: 6, overflow: "hidden", marginBottom: 12 }}>
              <div style={{ position: "absolute", left: 0, height: "100%", width: `${Math.min(100, (totalActual / totalBudget) * 100)}%`, background: "#059669", borderRadius: 6 }} />
              {totalForecast > totalActual && (
                <div style={{ position: "absolute", left: `${Math.min(100, (totalActual / totalBudget) * 100)}%`, height: "100%", width: `${Math.min(100 - (totalActual / totalBudget) * 100, ((totalForecast - totalActual) / totalBudget) * 100)}%`, background: totalForecast > totalBudget ? "#DC262640" : "#2563EB40" }} />
              )}
            </div>
            <div style={{ display: "flex", gap: 20 }}>
              {[
                { label: "Actual",   value: fmtCurrency(totalActual),   color: "#059669" },
                { label: "Forecast", value: fmtCurrency(totalForecast), color: totalForecast > totalBudget ? "#DC2626" : "#2563EB" },
                { label: "Budget",   value: fmtCurrency(totalBudget),   color: "#0F172A" },
                { label: "Revenue",  value: totalRevenue > 0 ? fmtCurrency(totalRevenue) : "—", color: "#2563EB" },
              ].map(l => (
                <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{ width: 8, height: 8, borderRadius: 2, background: l.color }} />
                  <span style={{ fontSize: 11, color: "#64748B" }}>{l.label}: <strong style={{ color: "#0F172A" }}>{l.value}</strong></span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Critical Alerts */}
        {criticalAlerts.length > 0 && (
          <div className="card" style={{ padding: "18px 24px", marginBottom: 24, border: "1px solid #FECACA", background: "#FEF2F2" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#DC2626", marginBottom: 12 }}>🚨 Cost Alerts</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {rows.filter(r => r.health.alerts.some(a => a.level === "critical" && a.category === "budget")).map(r =>
                r.health.alerts.filter(a => a.level === "critical" && a.category === "budget").map((a, i) => (
                  <div key={`${r.id}-${i}`} className="alert-row" style={{ background: "#fff", border: "1px solid #FECACA" }}>
                    <span style={{ fontSize: 12, flexShrink: 0 }}>🔴</span>
                    <div style={{ flex: 1 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: "#0F172A" }}>{r.name}: </span>
                      <span style={{ fontSize: 12, color: "#475569" }}>{a.title}</span>
                      <div style={{ fontSize: 11, color: "#006D6B", fontWeight: 600, marginTop: 2 }}>→ {a.action}</div>
                    </div>
                    <Link href={`/projects/${r.id}`} style={{ fontSize: 11, color: "#006D6B", fontWeight: 600, textDecoration: "none", flexShrink: 0 }}>View →</Link>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Projects Cost Table */}
        <div className="card" style={{ overflow: "hidden", marginBottom: 24 }}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid #F1F5F9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#0F172A" }}>Project Cost Breakdown</div>
            <span style={{ fontSize: 11, color: "#94A3B8" }}>{rows.length} projects</span>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table className="cost-table">
              <thead>
                <tr>
                  <th>Project</th><th>Progress</th><th>Budget</th><th>Actual</th>
                  <th>Forecast</th><th>Delta</th><th>Burn/day</th><th>€/1% done</th>
                  <th>Efficiency</th><th>Revenue</th><th>Margin</th><th>Alerts</th><th></th>
                </tr>
              </thead>
              <tbody>
                {rows.map(r => {
                  const effColor = r.costEfficiency <= 100 ? "#059669" : r.costEfficiency <= 130 ? "#D97706" : "#DC2626";
                  const topAlert = r.health.alerts.find(a => a.level === "critical") ?? r.health.alerts.find(a => a.level === "warning");
                  return (
                    <tr key={r.id} className="cost-row">
                      <td style={{ minWidth: 160 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "#0F172A" }}>{r.name}</div>
                        <div style={{ fontSize: 10, color: "#94A3B8", marginTop: 2 }}>{r.deptNames}</div>
                      </td>
                      <td style={{ minWidth: 100 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <div className="progress-bar" style={{ flex: 1 }}>
                            <div className="progress-fill" style={{ width: r.health.progressNominal + "%", background: "#006D6B" }} />
                          </div>
                          <span style={{ fontSize: 11, fontWeight: 700, color: "#0F172A", minWidth: 28 }}>{r.health.progressNominal}%</span>
                        </div>
                      </td>
                      <td style={{ fontSize: 12, color: "#0F172A" }}>{r.budgetTotal > 0 ? fmtCurrency(r.budgetTotal) : <span style={{ color: "#CBD5E1" }}>—</span>}</td>
                      <td style={{ fontSize: 12, color: "#059669", fontWeight: 600 }}>{fmtCurrency(r.costActual)}</td>
                      <td style={{ fontSize: 12, fontWeight: 600, color: r.budgetTotal > 0 && r.costForecast > r.budgetTotal ? "#DC2626" : "#0F172A" }}>{fmtCurrency(r.costForecast)}</td>
                      <td>
                        {r.budgetTotal > 0 ? (
                          <span style={{ fontSize: 12, fontWeight: 700, color: r.health.budgetDelta > 0 ? "#DC2626" : "#059669" }}>
                            {r.health.budgetDelta > 0 ? "+" : ""}{fmtCurrency(r.health.budgetDelta)}
                          </span>
                        ) : <span style={{ color: "#CBD5E1" }}>—</span>}
                      </td>
                      <td>
                        <div style={{ fontSize: 12, color: "#2563EB", fontWeight: 600 }}>{r.burnRateActual > 0 ? fmtCurrency(r.burnRateActual) : "—"}</div>
                        {r.burnRatePlanned > 0 && <div style={{ fontSize: 10, color: "#94A3B8" }}>plan: {fmtCurrency(r.burnRatePlanned)}</div>}
                      </td>
                      <td style={{ fontSize: 12, color: "#64748B" }}>
                        {r.costPerPct > 0 ? fmtCurrency(r.costPerPct) : "—"}
                        {r.baselineCostPerPct > 0 && <div style={{ fontSize: 10, color: "#CBD5E1" }}>base: {fmtCurrency(r.baselineCostPerPct)}</div>}
                      </td>
                      <td style={{ minWidth: 100 }}>
                        {r.health.progressNominal > 0 && r.budgetTotal > 0 ? (
                          <div>
                            <div style={{ fontSize: 10, color: effColor, fontWeight: 700, marginBottom: 3 }}>{Math.round(r.costEfficiency)}%</div>
                            <div className="efficiency-bar">
                              <div style={{ height: "100%", width: `${Math.min(r.costEfficiency, 200) / 2}%`, background: effColor, borderRadius: 4 }} />
                            </div>
                          </div>
                        ) : <span style={{ color: "#CBD5E1", fontSize: 11 }}>—</span>}
                      </td>
                      <td style={{ fontSize: 12, color: "#2563EB" }}>{r.revenueExpected > 0 ? fmtCurrency(r.revenueExpected) : <span style={{ color: "#CBD5E1" }}>—</span>}</td>
                      <td>
                        {r.revenueExpected > 0 ? (
                          <div>
                            <span style={{ fontSize: 12, fontWeight: 700, color: r.marginEur >= 0 ? "#059669" : "#DC2626" }}>{fmtCurrency(r.marginEur)}</span>
                            <div style={{ fontSize: 10, color: r.marginPct >= 20 ? "#059669" : r.marginPct >= 0 ? "#D97706" : "#DC2626", fontWeight: 600 }}>{Math.round(r.marginPct)}%</div>
                          </div>
                        ) : <span style={{ color: "#CBD5E1" }}>—</span>}
                      </td>
                      <td>
                        {topAlert ? (
                          <span style={{ fontSize: 10, color: topAlert.level === "critical" ? "#DC2626" : "#D97706", fontWeight: 600 }}>
                            {topAlert.level === "critical" ? "🔴" : "🟡"} {topAlert.title.slice(0, 28)}…
                          </span>
                        ) : <span style={{ fontSize: 11, color: "#059669" }}>✓ On track</span>}
                      </td>
                      <td><Link href={`/projects/${r.id}`} style={{ fontSize: 11, color: "#006D6B", fontWeight: 600, textDecoration: "none" }}>Open →</Link></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Resource Cost Breakdown */}
        <div className="card" style={{ overflow: "hidden" }}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid #F1F5F9" }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#0F172A", marginBottom: 2 }}>Resource Cost Breakdown</div>
            <div style={{ fontSize: 12, color: "#94A3B8" }}>Cost by resource across all projects</div>
          </div>
          {(() => {
            const resourceMap = new Map<string, { name: string; role: string; ratePerHour: number; totalHours: number; totalCost: number; projects: Set<string> }>();
            rows.forEach(r => {
              (projects.find(p => p.id === r.id) as any)?.assignments?.forEach((a: any) => {
                const key = a.resource.id;
                const existing = resourceMap.get(key) ?? { name: a.resource.name, role: a.resource.role, ratePerHour: a.resource.costPerHour, totalHours: 0, totalCost: 0, projects: new Set() };
                existing.totalHours += a.actualHours;
                existing.totalCost  += a.actualHours * a.resource.costPerHour;
                existing.projects.add(r.name);
                resourceMap.set(key, existing);
              });
            });
            const resources = Array.from(resourceMap.values()).sort((a, b) => b.totalCost - a.totalCost);
            if (resources.length === 0) return (
              <div style={{ padding: "32px", textAlign: "center", fontSize: 13, color: "#CBD5E1", fontStyle: "italic" }}>
                No resource assignments yet. Assign resources to projects in the Governance tab.
              </div>
            );
            return (
              <table className="cost-table">
                <thead>
                  <tr><th>Resource</th><th>Role</th><th>Rate/h</th><th>Hours Logged</th><th>Total Cost</th><th>Projects</th><th>Cost Share</th></tr>
                </thead>
                <tbody>
                  {resources.map((res, i) => {
                    const share = totalActual > 0 ? (res.totalCost / totalActual) * 100 : 0;
                    return (
                      <tr key={i} className="cost-row">
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#EFF6FF", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "#2563EB", flexShrink: 0 }}>{res.name[0]}</div>
                            <span style={{ fontSize: 13, fontWeight: 600, color: "#0F172A" }}>{res.name}</span>
                          </div>
                        </td>
                        <td style={{ fontSize: 12, color: "#64748B" }}>{res.role}</td>
                        <td style={{ fontSize: 12, color: "#0F172A", fontWeight: 500 }}>{fmtCurrency(res.ratePerHour)}/h</td>
                        <td style={{ fontSize: 12, color: "#2563EB", fontWeight: 600 }}>{res.totalHours}h</td>
                        <td style={{ fontSize: 13, fontWeight: 700, color: "#0F172A" }}>{fmtCurrency(res.totalCost)}</td>
                        <td style={{ fontSize: 11, color: "#64748B" }}>{Array.from(res.projects).join(", ")}</td>
                        <td style={{ minWidth: 120 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <div className="progress-bar" style={{ flex: 1 }}>
                              <div className="progress-fill" style={{ width: share + "%", background: "#006D6B" }} />
                            </div>
                            <span style={{ fontSize: 11, fontWeight: 600, color: "#0F172A", minWidth: 32 }}>{Math.round(share)}%</span>
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
