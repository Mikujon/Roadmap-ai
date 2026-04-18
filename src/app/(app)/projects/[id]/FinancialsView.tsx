"use client";
import { useState, useEffect } from "react";

interface HealthData {
  healthScore: number;
  scores: { schedule: number; cost: number; resource: number; risk: number };
  financial: { budgetTotal: number; costActual: number; revenueExpected: number; costForecast: number; margin: number; burnRate: number };
  progress: { planned: number; actual: number; done: number; total: number };
  recommendations: { type: string; priority: string; message: string }[];
}

const fmt = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);

export default function FinancialsView({ projectId, canEdit }: { projectId: string; canEdit: boolean }) {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ budgetTotal: 0, costActual: 0, revenueExpected: 0 });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`/api/projects/${projectId}/health`)
      .then(r => r.json())
      .then(d => {
        setHealth(d);
        setForm({ budgetTotal: d.financial.budgetTotal, costActual: d.financial.costActual, revenueExpected: d.financial.revenueExpected });
        setLoading(false);
      });
  }, [projectId]);

  const save = async () => {
    setSaving(true);
    await fetch(`/api/projects/${projectId}/financial`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const res = await fetch(`/api/projects/${projectId}/health`);
    const d = await res.json();
    setHealth(d);
    setSaving(false);
    setEditing(false);
  };

  if (loading) return <div style={{ color: "#9E9C93", fontSize: 13, padding: 20 }}>Loading financial data…</div>;
  if (!health) return null;

  const { financial: f, scores, progress, recommendations } = health;
  const healthColor = health.healthScore >= 80 ? "#059669" : health.healthScore >= 60 ? "#D97706" : "#DC2626";
  const healthBg    = health.healthScore >= 80 ? "#ECFDF5" : health.healthScore >= 60 ? "#FFFBEB" : "#FEF2F2";
  const healthLabel = health.healthScore >= 80 ? "On Track" : health.healthScore >= 60 ? "At Risk" : "Off Track";

  const PRIORITY_COLOR: Record<string, string> = { CRITICAL: "#DC2626", HIGH: "#EA580C", MEDIUM: "#D97706", LOW: "#059669" };
  const PRIORITY_BG:    Record<string, string> = { CRITICAL: "#FEF2F2", HIGH: "#FFF7ED", MEDIUM: "#FFFBEB", LOW: "#ECFDF5" };
  const PRIORITY_BORDER: Record<string, string> = { CRITICAL: "#FECACA", HIGH: "#FED7AA", MEDIUM: "#FDE68A", LOW: "#A7F3D0" };

  return (
    <>
      <style>{`
        .fin-card { background: #fff; border: 1px solid #E5E2D9; border-radius: 14px; padding: 20px 24px; }
        .score-bar { height: 6px; background: #F4F2EC; border-radius: 3px; overflow: hidden; }
        .score-fill { height: 100%; border-radius: 3px; transition: width 0.4s; }
        .fin-field { background: #F8FAFC; border: 1.5px solid #E5E2D9; border-radius: 8px; padding: 9px 12px; color: #18170F; font-size: 13px; outline: none; font-family: inherit; width: 100%; }
        .fin-field:focus { border-color: #006D6B; background: #fff; }
        .btn-primary { padding: 9px 20px; background: #006D6B; color: #fff; border: none; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; font-family: inherit; }
        .btn-primary:hover { background: #005a58; }
        .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
        .btn-ghost { padding: 9px 16px; background: #F8FAFC; color: #5C5A52; border: 1px solid #E5E2D9; border-radius: 8px; font-size: 13px; cursor: pointer; font-family: inherit; }
        .btn-edit { font-size: 11px; color: #006D6B; background: rgba(0,109,107,0.08); border: 1px solid rgba(0,109,107,0.2); border-radius: 6px; padding: 4px 12px; cursor: pointer; font-weight: 600; font-family: inherit; }
        .threshold-bar { position: relative; }
        .threshold-bar .threshold-mark { position: absolute; top: -4px; bottom: -4px; width: 2px; border-radius: 1px; pointer-events: none; }
        .threshold-bar .threshold-label { position: absolute; top: -18px; font-size: 9px; font-weight: 700; transform: translateX(-50%); white-space: nowrap; }
      `}</style>

      <div style={{ display: "flex", flexDirection: "column", gap: 20, fontFamily: "'DM Sans', sans-serif" }}>

        {/* Health Score */}
        <div style={{ display: "grid", gridTemplateColumns: "180px 1fr", gap: 16 }}>
          <div style={{ background: healthBg, border: `1px solid ${healthColor}30`, borderRadius: 14, padding: "24px 20px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#9E9C93", letterSpacing: "0.08em", textTransform: "uppercase" }}>Health Score</div>
            <div style={{ fontSize: 56, fontWeight: 900, color: healthColor, lineHeight: 1, letterSpacing: "-2px" }}>{health.healthScore}</div>
            <span style={{ fontSize: 11, fontWeight: 700, color: healthColor, background: "#fff", border: `1px solid ${healthColor}30`, padding: "3px 12px", borderRadius: 20 }}>{healthLabel}</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {[
              { label: "Schedule", value: scores.schedule, weight: "30%" },
              { label: "Cost",     value: scores.cost,     weight: "30%" },
              { label: "Resource", value: scores.resource, weight: "20%" },
              { label: "Risk",     value: scores.risk,     weight: "20%" },
            ].map(s => {
              const c = s.value >= 80 ? "#059669" : s.value >= 60 ? "#D97706" : "#DC2626";
              const bg = s.value >= 80 ? "#ECFDF5" : s.value >= 60 ? "#FFFBEB" : "#FEF2F2";
              return (
                <div key={s.label} style={{ background: "#fff", border: "1px solid #E5E2D9", borderRadius: 12, padding: "14px 16px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                    <span style={{ fontSize: 12, color: "#5C5A52", fontWeight: 500 }}>{s.label} <span style={{ fontSize: 10, color: "#CCC9BF" }}>({s.weight})</span></span>
                    <span style={{ fontSize: 14, fontWeight: 800, color: c, background: bg, padding: "2px 8px", borderRadius: 6 }}>{s.value}</span>
                  </div>
                  <div className="score-bar">
                    <div className="score-fill" style={{ width: s.value + "%", background: c }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Schedule */}
        <div className="fin-card">
          <div style={{ fontSize: 13, fontWeight: 700, color: "#18170F", marginBottom: 16 }}>Schedule Tracking</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            {[
              { label: "Planned Progress", value: progress.planned, color: "#2563EB", bg: "#EFF6FF" },
              { label: "Actual Progress",  value: progress.actual,  color: "#059669", bg: "#ECFDF5" },
            ].map(p => (
              <div key={p.label}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <span style={{ fontSize: 12, color: "#5C5A52", fontWeight: 500 }}>{p.label}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: p.color, background: p.bg, padding: "1px 8px", borderRadius: 6 }}>{p.value}%</span>
                </div>
                {/* Bar with 80% and 100% threshold markers */}
                <div className="score-bar threshold-bar" style={{ height: 8, marginTop: 22 }}>
                  <div className="score-fill" style={{ width: p.value + "%", background: p.color }} />
                  {/* 80% threshold */}
                  <div className="threshold-mark" style={{ left: "80%", background: "#D97706" }}>
                    <span className="threshold-label" style={{ color: "#D97706", left: "50%" }}>80%</span>
                  </div>
                  {/* 100% threshold */}
                  <div className="threshold-mark" style={{ left: "100%", background: "#059669", transform: "translateX(-100%)" }}>
                    <span className="threshold-label" style={{ color: "#059669", right: 0, left: "auto", transform: "none" }}>100%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 12, color: "#9E9C93", marginTop: 18, fontWeight: 500 }}>{progress.done} / {progress.total} features completed</div>
        </div>

        {/* Financials */}
        <div className="fin-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#18170F" }}>Financial Tracking</div>
            {canEdit && !editing && <button className="btn-edit" onClick={() => setEditing(true)}>Edit</button>}
          </div>
          {editing ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {[
                { key: "budgetTotal",      label: "Budget Total" },
                { key: "costActual",       label: "Cost Actual" },
                { key: "revenueExpected",  label: "Revenue Expected" },
              ].map(field => (
                <div key={field.key}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: "#5C5A52", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 6 }}>{field.label}</label>
                  <input type="number" className="fin-field" value={(form as any)[field.key]} onChange={e => setForm(p => ({ ...p, [field.key]: parseFloat(e.target.value) || 0 }))} />
                </div>
              ))}
              <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                <button className="btn-primary" onClick={save} disabled={saving}>{saving ? "Saving…" : "Save"}</button>
                <button className="btn-ghost" onClick={() => setEditing(false)}>Cancel</button>
              </div>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12 }}>
              {[
                { label: "Budget",    value: f.budgetTotal,     color: "#18170F" },
                { label: "Actual",    value: f.costActual,      color: f.costActual > f.budgetTotal && f.budgetTotal > 0 ? "#DC2626" : "#059669" },
                { label: "Forecast",  value: f.costForecast,    color: f.costForecast > f.budgetTotal && f.budgetTotal > 0 ? "#EA580C" : "#18170F" },
                { label: "Revenue",   value: f.revenueExpected, color: "#059669" },
                { label: "Margin",    value: f.margin,          color: f.margin >= 0 ? "#059669" : "#DC2626" },
                { label: "Burn Rate", value: f.burnRate,        color: "#18170F" },
              ].map(k => (
                <div key={k.label} style={{ background: "#F8FAFC", border: "1px solid #F4F2EC", borderRadius: 10, padding: "14px 16px" }}>
                  <div style={{ fontSize: 10, color: "#9E9C93", marginBottom: 8, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>{k.label}</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: k.color, letterSpacing: "-0.5px" }}>{fmt(k.value)}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Budget Burn Bar */}
        {f.budgetTotal > 0 && (
          <div className="fin-card">
            <div style={{ fontSize: 13, fontWeight: 700, color: "#18170F", marginBottom: 16 }}>Budget Burn Analysis</div>
            <div style={{ marginTop: 28 }}>
              {[
                { label: "Actual Spend",   value: f.costActual,   max: f.budgetTotal, color: f.costActual > f.budgetTotal ? "#DC2626" : "#006D6B" },
                { label: "Forecast (EAC)", value: f.costForecast, max: f.budgetTotal, color: f.costForecast > f.budgetTotal ? "#EA580C" : "#2563EB" },
              ].map(bar => {
                const pct  = Math.min(120, f.budgetTotal > 0 ? (bar.value / f.budgetTotal) * 100 : 0);
                const over = pct > 100;
                return (
                  <div key={bar.label} style={{ marginBottom: 28 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                      <span style={{ fontSize: 12, color: "#5C5A52", fontWeight: 500 }}>{bar.label}</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: bar.color }}>{fmt(bar.value)}</span>
                    </div>
                    <div className="score-bar threshold-bar" style={{ height: 10 }}>
                      <div className="score-fill" style={{ width: Math.min(100, pct) + "%", background: bar.color }} />
                      {/* 80% mark */}
                      <div className="threshold-mark" style={{ left: "80%", background: "#D97706" }}>
                        <span className="threshold-label" style={{ color: "#D97706", left: "50%" }}>80% — {fmt(f.budgetTotal * 0.8)}</span>
                      </div>
                      {/* 100% budget line */}
                      <div className="threshold-mark" style={{ left: "calc(100% - 2px)", background: "#DC2626" }}>
                        <span className="threshold-label" style={{ color: "#DC2626", left: "50%" }}>Budget — {fmt(f.budgetTotal)}</span>
                      </div>
                    </div>
                    {over && (
                      <div style={{ marginTop: 6, fontSize: 11, color: "#DC2626", fontWeight: 600 }}>
                        ⚠ {over ? `+${fmt(bar.value - f.budgetTotal)} over budget (${(pct - 100).toFixed(1)}%)` : ""}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Recommendations */}
        {recommendations.length > 0 && (
          <div className="fin-card">
            <div style={{ fontSize: 13, fontWeight: 700, color: "#18170F", marginBottom: 16 }}>🤖 AI Recommendations</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {recommendations.map((r, i) => (
                <div key={i} style={{ background: PRIORITY_BG[r.priority] ?? "#F8FAFC", border: `1px solid ${PRIORITY_BORDER[r.priority] ?? "#E5E2D9"}`, borderLeft: `3px solid ${PRIORITY_COLOR[r.priority] ?? "#5C5A52"}`, borderRadius: 10, padding: "14px 16px", display: "flex", gap: 12, alignItems: "flex-start" }}>
                  <span style={{ fontSize: 10, color: PRIORITY_COLOR[r.priority], fontWeight: 700, whiteSpace: "nowrap", marginTop: 1 }}>{r.priority}</span>
                  <div>
                    <div style={{ fontSize: 10, color: "#9E9C93", marginBottom: 4, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>{r.type}</div>
                    <div style={{ fontSize: 13, color: "#5C5A52", lineHeight: 1.6 }}>{r.message}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}