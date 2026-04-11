"use client";
import { useState } from "react";
import { calculateHealth } from "@/lib/health";

const fmt = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);

export default function OverviewView({ project, allF, allMembers, allDepartments, allResources, canEdit, setProject }: any) {
  const [showSettings, setShowSettings] = useState(false);

  // ── Metrics ──────────────────────────────────────────────────────────────
  const totalDone     = allF.filter((f: any) => f.status === "DONE").length;
  const totalBlocked  = allF.filter((f: any) => f.status === "BLOCKED").length;
  const totalInProg   = allF.filter((f: any) => f.status === "IN_PROGRESS").length;
  const pct           = allF.length ? Math.round((totalDone / allF.length) * 100) : 0;

  const costActual    = project.assignments.reduce((s: number, a: any) => s + a.actualHours    * a.resource.costPerHour, 0);
  const costEstimated = project.assignments.reduce((s: number, a: any) => s + a.estimatedHours * a.resource.costPerHour, 0);
  const budgetTotal   = project.budgetTotal || costEstimated;
  const costForecast  = pct > 5 ? (costActual / pct) * 100 : costEstimated;
  const delta         = costForecast - budgetTotal;

  const startDate     = new Date(project.startDate);
  const endDate       = new Date(project.endDate);
  const now           = new Date();
  const totalDays     = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / 86400000));
  const elapsedDays   = Math.max(0, Math.ceil((now.getTime() - startDate.getTime()) / 86400000));
  const daysLeft      = Math.ceil((endDate.getTime() - now.getTime()) / 86400000);
  const plannedPct    = Math.min(100, Math.round((elapsedDays / totalDays) * 100));
  const scheduleGap   = pct - plannedPct;
  const burnRateActual = elapsedDays > 0 ? costActual / elapsedDays : 0;

  const openRisks     = project.risks.filter((r: any) => r.status === "OPEN").length;
  const highRisks     = project.risks.filter((r: any) => r.status === "OPEN" && r.probability * r.impact >= 9).length;

  // ── Central health calculation ──
  const h = calculateHealth({
    startDate: project.startDate, endDate: project.endDate,
    totalFeatures: allF.length, doneFeatures: totalDone,
    blockedFeatures: totalBlocked, inProgressFeatures: totalInProg,
    totalSprints: project.sprints.length,
    doneSprints: project.sprints.filter((s: any) => s.status === "DONE").length,
    activeSprints: project.sprints.filter((s: any) => s.status === "ACTIVE").length,
    budgetTotal: project.budgetTotal, costActual, costEstimated,
    totalCapacityHours: project.assignments.reduce((s: number, a: any) => s + a.resource.capacityHours, 0),
    totalActualHours: project.assignments.reduce((s: number, a: any) => s + a.actualHours, 0),
    openRisks, highRisks,
    maxRiskScore: project.risks.filter((r: any) => r.status === "OPEN").reduce((m: number, r: any) => Math.max(m, r.probability * r.impact), 0),
  });

  const healthScore = h.healthScore;
  const healthColor = healthScore >= 80 ? "#059669" : healthScore >= 60 ? "#D97706" : "#DC2626";
  const healthBg    = healthScore >= 80 ? "#ECFDF5" : healthScore >= 60 ? "#FFFBEB" : "#FEF2F2";
  const healthLabel = h.status === "COMPLETED" ? "Completed" : h.status === "OFF_TRACK" ? "Off Track" : h.status === "AT_RISK" ? "At Risk" : h.status === "ON_TRACK" ? "On Track" : "Not Started";

  // ── Alerts ──
  const alerts: { level: "red" | "yellow" | "green"; title: string; detail: string }[] = [];
  if (daysLeft < 0 && pct < 100)
    alerts.push({ level: "red", title: "Project is overdue", detail: `${Math.abs(daysLeft)} days past deadline with ${100 - pct}% remaining` });
  else if (daysLeft <= 7 && pct < 80)
    alerts.push({ level: "yellow", title: `Deadline in ${daysLeft} days`, detail: `Only ${pct}% complete — high risk of delay` });
  if (scheduleGap < -20)
    alerts.push({ level: "red", title: "Significantly behind schedule", detail: `Progress ${pct}% vs planned ${plannedPct}% — ${Math.abs(scheduleGap)}pp gap` });
  if (budgetTotal > 0 && costForecast > budgetTotal * 1.1)
    alerts.push({ level: "red", title: "Budget overrun risk", detail: `Forecast ${fmt(costForecast)} exceeds budget ${fmt(budgetTotal)} by ${fmt(delta)}` });
  if (totalBlocked > 0)
    alerts.push({ level: "yellow", title: `${totalBlocked} feature${totalBlocked > 1 ? "s" : ""} blocked`, detail: "Unblock to keep sprints on track" });
  if (pct > 0 && budgetTotal > 0 && (costActual / budgetTotal) > (pct / 100) * 1.3)
    alerts.push({ level: "red", title: "Cost-progress incoherence", detail: `Spending ${Math.round(costActual/budgetTotal*100)}% of budget for only ${pct}% of work` });
  if (alerts.length === 0)
    alerts.push({ level: "green", title: "Project is healthy", detail: "No critical issues detected" });

  return (
    <>
      <style>{`
        .ov-card { background: #fff; border: 1px solid #E2E8F0; border-radius: 14px; padding: 20px 24px; }
        .progress-bar { height: 8px; background: #F1F5F9; border-radius: 4px; overflow: hidden; }
        .progress-fill { height: 100%; border-radius: 4px; transition: width 0.5s; }
        .alert-item { display: flex; align-items: flex-start; gap: 10px; padding: 11px 14px; border-radius: 10px; }
        .settings-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.4); z-index: 200; display: flex; justify-content: flex-end; }
        .settings-drawer { width: 520px; height: 100vh; background: #fff; overflow-y: auto; box-shadow: -4px 0 32px rgba(0,0,0,0.12); display: flex; flex-direction: column; }
        .settings-section { padding: 20px 24px; border-bottom: 1px solid #F1F5F9; }
        .settings-label { font-size: 10px; font-weight: 700; color: #94A3B8; letter-spacing: 0.07em; text-transform: uppercase; display: block; margin-bottom: 8px; }
        .settings-input { width: 100%; background: #F8FAFC; border: 1.5px solid #E2E8F0; border-radius: 8px; padding: 9px 12px; color: #0F172A; font-size: 13px; font-family: 'Plus Jakarta Sans', sans-serif; outline: none; }
        .settings-input:focus { border-color: #006D6B; background: #fff; }
        .settings-select { width: 100%; background: #F8FAFC; border: 1.5px solid #E2E8F0; border-radius: 8px; padding: 9px 12px; color: #0F172A; font-size: 13px; font-family: 'Plus Jakarta Sans', sans-serif; outline: none; cursor: pointer; }
        .settings-select:focus { border-color: #006D6B; }
      `}</style>

      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

        {/* Top bar */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ background: healthBg, border: `1px solid ${healthColor}30`, borderRadius: 12, padding: "10px 18px", display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ fontSize: 28, fontWeight: 900, color: healthColor, letterSpacing: "-1px", lineHeight: 1 }}>{healthScore}</div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: healthColor }}>{healthLabel}</div>
                <div style={{ fontSize: 10, color: "#94A3B8" }}>Health Score</div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 20 }}>
              {[
                { label: "Progress",   value: pct + "%",          color: "#0F172A" },
                { label: "Days left",  value: daysLeft >= 0 ? `${daysLeft}d` : `${Math.abs(daysLeft)}d late`, color: daysLeft < 0 ? "#DC2626" : daysLeft <= 7 ? "#D97706" : "#059669" },
                { label: "Blocked",    value: totalBlocked,       color: totalBlocked > 0 ? "#DC2626" : "#059669" },
                { label: "Open risks", value: openRisks,          color: openRisks > 0 ? "#D97706" : "#059669" },
              ].map(s => (
                <div key={s.label}>
                  <div style={{ fontSize: 10, color: "#94A3B8", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 3 }}>{s.label}</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: s.color, letterSpacing: "-0.5px" }}>{s.value}</div>
                </div>
              ))}
            </div>
          </div>
          {canEdit && (
            <button onClick={() => setShowSettings(true)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 16px", background: "#F8FAFC", border: "1.5px solid #E2E8F0", borderRadius: 10, fontSize: 12, fontWeight: 600, color: "#475569", cursor: "pointer", fontFamily: "inherit" }}>
              ⚙ Settings
            </button>
          )}
        </div>

        {/* Alerts */}
        <div className="ov-card" style={{ padding: "16px 20px" }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#0F172A", marginBottom: 12 }}>🔔 Alerts & Insights</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {alerts.map((a, i) => {
              const colors: any = {
                red:    { bg: "#FEF2F2", border: "#FECACA", dot: "#DC2626" },
                yellow: { bg: "#FFFBEB", border: "#FDE68A", dot: "#D97706" },
                green:  { bg: "#ECFDF5", border: "#A7F3D0", dot: "#059669" },
              };
              const c = colors[a.level];
              return (
                <div key={i} className="alert-item" style={{ background: c.bg, border: `1px solid ${c.border}` }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: c.dot, flexShrink: 0, marginTop: 4 }} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#0F172A" }}>{a.title}</div>
                    <div style={{ fontSize: 11, color: "#64748B", marginTop: 2 }}>{a.detail}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Progress vs Time */}
        <div className="ov-card">
          <div style={{ fontSize: 13, fontWeight: 700, color: "#0F172A", marginBottom: 4 }}>Progress vs Time</div>
          <div style={{ fontSize: 11, color: "#94A3B8", marginBottom: 16 }}>Actual progress compared to planned timeline</div>
          <div style={{ position: "relative", height: 120 }}>
            <svg width="100%" height="120" viewBox="0 0 400 120" preserveAspectRatio="none">
              {[0, 25, 50, 75, 100].map(y => (
                <line key={y} x1="0" y1={120 - y * 1.2} x2="400" y2={120 - y * 1.2} stroke="#F1F5F9" strokeWidth="1" />
              ))}
              <polyline points={`0,120 ${plannedPct * 4},${120 - plannedPct * 1.2} 400,0`} fill="none" stroke="#CBD5E1" strokeWidth="2" strokeDasharray="4,3" />
              <polygon points={`0,120 ${Math.min(elapsedDays / totalDays * 400, 400)},${120 - pct * 1.2} ${Math.min(elapsedDays / totalDays * 400, 400)},120`} fill="#006D6B15" />
              <polyline points={`0,120 ${Math.min(elapsedDays / totalDays * 400, 400)},${120 - pct * 1.2}`} fill="none" stroke="#006D6B" strokeWidth="2.5" />
              {elapsedDays <= totalDays && (
                <line x1={elapsedDays / totalDays * 400} y1="0" x2={elapsedDays / totalDays * 400} y2="120" stroke="#DC262640" strokeWidth="1.5" strokeDasharray="3,2" />
              )}
              <circle cx={Math.min(elapsedDays / totalDays * 400, 400)} cy={120 - pct * 1.2} r="4" fill="#006D6B" />
            </svg>
            <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, display: "flex", flexDirection: "column", justifyContent: "space-between", pointerEvents: "none" }}>
              {[100, 75, 50, 25, 0].map(v => (
                <div key={v} style={{ fontSize: 9, color: "#CBD5E1", lineHeight: 1 }}>{v}%</div>
              ))}
            </div>
          </div>
          <div style={{ display: "flex", gap: 16, marginTop: 10 }}>
            {[
              { color: "#006D6B", label: `Actual: ${pct}%`, dashed: false },
              { color: "#CBD5E1", label: `Planned: ${plannedPct}%`, dashed: false },
              { color: "#DC2626", label: "Today", dashed: true },
            ].map(l => (
              <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <div style={{ width: 16, height: 2, background: l.dashed ? "transparent" : l.color, borderRadius: 1, borderTop: l.dashed ? "2px dashed #DC262660" : undefined }} />
                <span style={{ fontSize: 11, color: "#64748B" }}>{l.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Cost + Efficiency */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          <div className="ov-card">
            <div style={{ fontSize: 13, fontWeight: 700, color: "#0F172A", marginBottom: 16 }}>Cost Overview</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {[
                { label: "Budget",   value: budgetTotal > 0 ? fmt(budgetTotal) : "—", color: "#0F172A", width: 100 },
                { label: "Actual",   value: fmt(costActual),  color: "#059669", width: budgetTotal > 0 ? Math.min(100, (costActual / budgetTotal) * 100) : 50 },
                { label: "Forecast", value: fmt(costForecast), color: delta > 0 ? "#DC2626" : "#2563EB", width: budgetTotal > 0 ? Math.min(110, (costForecast / budgetTotal) * 100) : 60 },
              ].map(row => (
                <div key={row.label}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                    <span style={{ fontSize: 12, color: "#64748B", fontWeight: 500 }}>{row.label}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: row.color }}>{row.value}</span>
                  </div>
                  <div className="progress-bar" style={{ height: 6 }}>
                    <div className="progress-fill" style={{ width: row.width + "%", background: row.color + (row.label === "Budget" ? "30" : "") }} />
                  </div>
                </div>
              ))}
              {delta !== 0 && budgetTotal > 0 && (
                <div style={{ marginTop: 4, padding: "8px 12px", background: delta > 0 ? "#FEF2F2" : "#ECFDF5", borderRadius: 8, fontSize: 12, fontWeight: 600, color: delta > 0 ? "#DC2626" : "#059669" }}>
                  {delta > 0 ? "⚠ Overrun" : "✓ Savings"}: {fmt(Math.abs(delta))} ({Math.round(Math.abs(delta / budgetTotal) * 100)}%)
                </div>
              )}
            </div>
          </div>

          <div className="ov-card">
            <div style={{ fontSize: 13, fontWeight: 700, color: "#0F172A", marginBottom: 16 }}>Cost Efficiency</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                {[
                  { label: "Burn Rate/day", value: burnRateActual > 0 ? fmt(burnRateActual) : "—", color: "#2563EB", sub: "actual" },
                  { label: "Cost per 1%",   value: pct > 0 ? fmt(costActual / pct) : "—", color: "#EA580C", sub: "of progress" },
                ].map(s => (
                  <div key={s.label} style={{ background: "#F8FAFC", border: "1px solid #F1F5F9", borderRadius: 10, padding: "12px 14px" }}>
                    <div style={{ fontSize: 10, color: "#94A3B8", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>{s.label}</div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: s.color, letterSpacing: "-0.5px" }}>{s.value}</div>
                    <div style={{ fontSize: 10, color: "#94A3B8", marginTop: 2 }}>{s.sub}</div>
                  </div>
                ))}
              </div>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ fontSize: 11, color: "#64748B" }}>Budget consumed</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#0F172A" }}>{budgetTotal > 0 ? Math.round((costActual / budgetTotal) * 100) : 0}%</span>
                </div>
                <div className="progress-bar" style={{ height: 10, marginBottom: 6 }}>
                  <div className="progress-fill" style={{ width: (budgetTotal > 0 ? Math.min(100, (costActual / budgetTotal) * 100) : 0) + "%", background: "#2563EB" }} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ fontSize: 11, color: "#64748B" }}>Work completed</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#0F172A" }}>{pct}%</span>
                </div>
                <div className="progress-bar" style={{ height: 10 }}>
                  <div className="progress-fill" style={{ width: pct + "%", background: "#006D6B" }} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Schedule breakdown */}
        <div className="ov-card">
          <div style={{ fontSize: 13, fontWeight: 700, color: "#0F172A", marginBottom: 16 }}>Schedule Breakdown</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
            {[
              { label: "Start",        value: new Date(project.startDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit" }), color: "#64748B" },
              { label: "End Planned",  value: new Date(project.endDate).toLocaleDateString("en-GB",   { day: "2-digit", month: "short", year: "2-digit" }), color: "#64748B" },
              { label: "Days Elapsed", value: `${Math.min(elapsedDays, totalDays)}/${totalDays}d`, color: "#2563EB" },
              { label: "Schedule Gap", value: scheduleGap >= 0 ? `+${scheduleGap}pp` : `${scheduleGap}pp`, color: scheduleGap >= 0 ? "#059669" : "#DC2626" },
            ].map(s => (
              <div key={s.label} style={{ background: "#F8FAFC", border: "1px solid #F1F5F9", borderRadius: 10, padding: "12px 14px", textAlign: "center" }}>
                <div style={{ fontSize: 10, color: "#94A3B8", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>{s.label}</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: s.color }}>{s.value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Settings Drawer */}
      {showSettings && (
        <div className="settings-overlay" onClick={() => setShowSettings(false)}>
          <div className="settings-drawer" onClick={e => e.stopPropagation()}>
            <div style={{ padding: "20px 24px", borderBottom: "1px solid #F1F5F9", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, background: "#fff", zIndex: 1 }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 800, color: "#0F172A" }}>Project Settings</div>
                <div style={{ fontSize: 12, color: "#94A3B8" }}>{project.name}</div>
              </div>
              <button onClick={() => setShowSettings(false)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: "#94A3B8" }}>✕</button>
            </div>
            <div className="settings-section">
              <div style={{ fontSize: 12, fontWeight: 700, color: "#0F172A", marginBottom: 14 }}>General</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div><label className="settings-label">Project Name</label><input className="settings-input" defaultValue={project.name} readOnly={!canEdit} /></div>
                <div><label className="settings-label">Description</label><textarea className="settings-input" defaultValue={project.description ?? ""} rows={3} style={{ resize: "vertical" }} readOnly={!canEdit} /></div>
              </div>
            </div>
            <div className="settings-section">
              <div style={{ fontSize: 12, fontWeight: 700, color: "#0F172A", marginBottom: 14 }}>Execution</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div><label className="settings-label">Start Date</label><input type="date" className="settings-input" defaultValue={project.startDate?.slice(0, 10)} readOnly={!canEdit} /></div>
                <div><label className="settings-label">End Date</label><input type="date" className="settings-input" defaultValue={project.endDate?.slice(0, 10)} readOnly={!canEdit} /></div>
              </div>
            </div>
            <div className="settings-section">
              <div style={{ fontSize: 12, fontWeight: 700, color: "#0F172A", marginBottom: 14 }}>Organization</div>
              <div style={{ marginBottom: 14 }}>
                <label className="settings-label">Requested By</label>
                {project.requestedBy && (
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8, padding: "8px 10px", background: "#F8FAFC", borderRadius: 8, border: "1px solid #F1F5F9" }}>
                    <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#EFF6FF", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "#2563EB" }}>{project.requestedBy.name?.[0]?.toUpperCase() ?? "?"}</div>
                    <div><div style={{ fontSize: 12, fontWeight: 600, color: "#0F172A" }}>{project.requestedBy.name ?? project.requestedBy.email}</div><div style={{ fontSize: 10, color: "#94A3B8" }}>{project.requestedBy.email}</div></div>
                  </div>
                )}
                {canEdit && (
                  <select className="settings-select" value={project.requestedBy?.id ?? ""} onChange={async e => {
                    const userId = e.target.value;
                    await fetch(`/api/projects/${project.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ requestedById: userId || null }) });
                    const m = allMembers.find((m: any) => m.id === userId);
                    setProject((p: any) => ({ ...p, requestedBy: m ?? null }));
                  }}>
                    <option value="">— None —</option>
                    {allMembers.map((m: any) => <option key={m.id} value={m.id}>{m.name ?? m.email}</option>)}
                  </select>
                )}
              </div>
              <div>
                <label className="settings-label">Departments</label>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 8 }}>
                  {project.departments.map((d: any) => (
                    <div key={d.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", background: "#F8FAFC", borderRadius: 8, border: "1px solid #F1F5F9" }}>
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: d.color }} />
                      <span style={{ fontSize: 12, fontWeight: 600, flex: 1, color: "#0F172A" }}>{d.name}</span>
                      {canEdit && <button onClick={async () => {
                        await fetch(`/api/projects/${project.id}/departments`, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ departmentId: d.id }) });
                        setProject((p: any) => ({ ...p, departments: p.departments.filter((dep: any) => dep.id !== d.id) }));
                      }} style={{ background: "none", border: "none", cursor: "pointer", color: "#DC2626", fontSize: 12 }}>✕</button>}
                    </div>
                  ))}
                  {project.departments.length === 0 && <div style={{ fontSize: 12, color: "#CBD5E1", fontStyle: "italic" }}>No departments assigned</div>}
                </div>
                {canEdit && (
                  <select className="settings-select" onChange={async e => {
                    const departmentId = e.target.value;
                    if (!departmentId) return;
                    await fetch(`/api/projects/${project.id}/departments`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ departmentId }) });
                    const d = allDepartments.find((d: any) => d.id === departmentId);
                    if (d) setProject((p: any) => ({ ...p, departments: [...p.departments, d] }));
                    e.target.value = "";
                  }}>
                    <option value="">+ Assign department…</option>
                    {allDepartments.filter((d: any) => !project.departments.some((pd: any) => pd.id === d.id)).map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                )}
              </div>
            </div>
            <div className="settings-section">
              <div style={{ fontSize: 12, fontWeight: 700, color: "#0F172A", marginBottom: 14 }}>Financial</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div>
                  <label className="settings-label">Budget Total</label>
                  <input type="number" className="settings-input" defaultValue={project.budgetTotal || ""} placeholder="e.g. 50000" readOnly={!canEdit}
                    onBlur={async e => { if (!canEdit) return; await fetch(`/api/projects/${project.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ budgetTotal: parseFloat(e.target.value) || 0 }) }); setProject((p: any) => ({ ...p, budgetTotal: parseFloat(e.target.value) || 0 })); }} />
                </div>
                <div>
                  <label className="settings-label">Revenue Expected</label>
                  <input type="number" className="settings-input" defaultValue={project.revenueExpected || ""} placeholder="e.g. 80000" readOnly={!canEdit}
                    onBlur={async e => { if (!canEdit) return; await fetch(`/api/projects/${project.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ revenueExpected: parseFloat(e.target.value) || 0 }) }); setProject((p: any) => ({ ...p, revenueExpected: parseFloat(e.target.value) || 0 })); }} />
                </div>
              </div>
            </div>
            <div className="settings-section">
              <div style={{ fontSize: 12, fontWeight: 700, color: "#0F172A", marginBottom: 14 }}>Resources Assigned</div>
              {project.assignments.length === 0 ? (
                <div style={{ fontSize: 12, color: "#CBD5E1", fontStyle: "italic" }}>No resources assigned.</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {project.assignments.map((a: any) => (
                    <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", background: "#F8FAFC", borderRadius: 8, border: "1px solid #F1F5F9" }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: "#0F172A" }}>{a.resource.name}</div>
                        <div style={{ fontSize: 10, color: "#94A3B8" }}>{a.resource.role} · {fmt(a.resource.costPerHour)}/h</div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: "#2563EB" }}>{a.estimatedHours}h est.</div>
                        <div style={{ fontSize: 10, color: "#059669" }}>{a.actualHours}h logged</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div style={{ padding: "16px 24px", borderTop: "1px solid #F1F5F9", background: "#FAFBFC", position: "sticky", bottom: 0 }}>
              <button onClick={() => setShowSettings(false)} style={{ width: "100%", padding: "11px", background: "#006D6B", color: "#fff", border: "none", borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Done</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}