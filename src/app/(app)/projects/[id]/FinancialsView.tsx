"use client";
import { useState, useEffect } from "react";

interface HealthData {
  healthScore: number;
  scores: { schedule: number; cost: number; resource: number; risk: number };
  financial: { budgetTotal: number; costActual: number; revenueExpected: number; costForecast: number; margin: number; burnRate: number };
  progress: { planned: number; actual: number; done: number; total: number };
  recommendations: { type: string; priority: string; message: string }[];
}

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
    await fetch(`/api/projects/${projectId}/financial`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const res = await fetch(`/api/projects/${projectId}/health`);
    const d = await res.json();
    setHealth(d);
    setSaving(false);
    setEditing(false);
  };

  if (loading) return <div style={{ color: "#64748B", fontSize: 13, padding: 20 }}>Loading financial data…</div>;
  if (!health) return null;

  const { financial: f, scores, progress, recommendations } = health;
  const healthColor = health.healthScore >= 80 ? "#00C97A" : health.healthScore >= 60 ? "#EAB308" : "#EF4444";
  const PRIORITY_COLOR: Record<string, string> = { CRITICAL: "#EF4444", HIGH: "#F97316", MEDIUM: "#EAB308", LOW: "#22C55E" };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Health Score */}
      <div style={{ display: "grid", gridTemplateColumns: "200px 1fr", gap: 16 }}>
        <div style={{ background: "#0D1929", border: `2px solid ${healthColor}40`, borderRadius: 12, padding: "20px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8 }}>
          <div style={{ fontSize: 11, color: "#64748B", fontWeight: 700, letterSpacing: "0.05em" }}>HEALTH SCORE</div>
          <div style={{ fontSize: 52, fontWeight: 900, color: healthColor, fontFamily: "monospace", lineHeight: 1 }}>{health.healthScore}</div>
          <div style={{ fontSize: 10, color: healthColor }}>{health.healthScore >= 80 ? "🟢 ON TRACK" : health.healthScore >= 60 ? "🟡 AT RISK" : "🔴 OFF TRACK"}</div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {[
            { label: "Schedule", value: scores.schedule, weight: "30%" },
            { label: "Cost",     value: scores.cost,     weight: "30%" },
            { label: "Resource", value: scores.resource, weight: "20%" },
            { label: "Risk",     value: scores.risk,     weight: "20%" },
          ].map(s => {
            const c = s.value >= 80 ? "#00C97A" : s.value >= 60 ? "#EAB308" : "#EF4444";
            return (
              <div key={s.label} style={{ background: "#0D1929", border: "1px solid #1E3A5F", borderRadius: 10, padding: "14px 16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <span style={{ fontSize: 11, color: "#64748B" }}>{s.label} <span style={{ fontSize: 9, color: "#475569" }}>({s.weight})</span></span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: c, fontFamily: "monospace" }}>{s.value}</span>
                </div>
                <div style={{ height: 4, background: "#1E3A5F", borderRadius: 2, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: s.value + "%", background: c, borderRadius: 2 }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Schedule */}
      <div style={{ background: "#0D1929", border: "1px solid #1E3A5F", borderRadius: 12, padding: "18px 22px" }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#E2EBF6", marginBottom: 14, letterSpacing: "0.05em" }}>SCHEDULE TRACKING</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          {[{ label: "Planned Progress", value: progress.planned, color: "#3B82F6" }, { label: "Actual Progress", value: progress.actual, color: "#00C97A" }].map(p => (
            <div key={p.label}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontSize: 11, color: "#64748B" }}>{p.label}</span>
                <span style={{ fontSize: 12, fontFamily: "monospace", color: p.color }}>{p.value}%</span>
              </div>
              <div style={{ height: 6, background: "#1E3A5F", borderRadius: 3, overflow: "hidden" }}>
                <div style={{ height: "100%", width: p.value + "%", background: p.color, borderRadius: 3 }} />
              </div>
            </div>
          ))}
        </div>
        <div style={{ fontSize: 11, color: "#64748B", marginTop: 10 }}>{progress.done} / {progress.total} features completed</div>
      </div>

      {/* Financials */}
      <div style={{ background: "#0D1929", border: "1px solid #1E3A5F", borderRadius: 12, padding: "18px 22px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: "#E2EBF6", letterSpacing: "0.05em" }}>FINANCIAL TRACKING</span>
          {canEdit && !editing && (
            <button onClick={() => setEditing(true)} style={{ fontSize: 11, color: "#007A73", background: "rgba(0,122,115,0.1)", border: "1px solid rgba(0,122,115,0.3)", borderRadius: 6, padding: "4px 12px", cursor: "pointer" }}>Edit</button>
          )}
        </div>
        {editing ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {[{ key: "budgetTotal", label: "Budget Total (€)" }, { key: "costActual", label: "Cost Actual (€)" }, { key: "revenueExpected", label: "Revenue Expected (€)" }].map(field => (
              <div key={field.key} style={{ display: "grid", gridTemplateColumns: "160px 1fr", alignItems: "center", gap: 12 }}>
                <label style={{ fontSize: 12, color: "#94A3B8" }}>{field.label}</label>
                <input type="number" value={(form as any)[field.key]} onChange={e => setForm(p => ({ ...p, [field.key]: parseFloat(e.target.value) || 0 }))} style={{ background: "#0A1220", color: "#E2EBF6", border: "1px solid #1E3A5F", borderRadius: 6, padding: "7px 12px", fontSize: 13, outline: "none" }} />
              </div>
            ))}
            <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
              <button onClick={save} disabled={saving} style={{ padding: "8px 20px", background: "linear-gradient(135deg,#007A73,#0a9a90)", color: "#fff", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>{saving ? "Saving…" : "Save"}</button>
              <button onClick={() => setEditing(false)} style={{ padding: "8px 16px", background: "#1E3A5F", color: "#E2EBF6", border: "none", borderRadius: 8, fontSize: 12, cursor: "pointer" }}>Cancel</button>
            </div>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12 }}>
            {[
              { label: "Budget",    value: f.budgetTotal,     color: "#E2EBF6" },
              { label: "Actual",    value: f.costActual,      color: f.costActual > f.budgetTotal && f.budgetTotal > 0 ? "#EF4444" : "#E2EBF6" },
              { label: "Forecast",  value: f.costForecast,    color: f.costForecast > f.budgetTotal && f.budgetTotal > 0 ? "#F97316" : "#E2EBF6" },
              { label: "Revenue",   value: f.revenueExpected, color: "#00C97A" },
              { label: "Margin",    value: f.margin,          color: f.margin >= 0 ? "#00C97A" : "#EF4444" },
              { label: "Burn Rate", value: f.burnRate,        color: "#E2EBF6" },
            ].map(k => (
              <div key={k.label} style={{ background: "#0A1220", border: "1px solid #1A2E44", borderRadius: 8, padding: "12px 14px" }}>
                <div style={{ fontSize: 10, color: "#64748B", marginBottom: 6 }}>{k.label}</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: k.color, fontFamily: "monospace" }}>€{k.value.toLocaleString()}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <div style={{ background: "#0D1929", border: "1px solid #1E3A5F", borderRadius: 12, padding: "18px 22px" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#E2EBF6", marginBottom: 14, letterSpacing: "0.05em" }}>🤖 AI RECOMMENDATIONS</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {recommendations.map((r, i) => (
              <div key={i} style={{ background: "#0A1220", border: `1px solid ${PRIORITY_COLOR[r.priority]}30`, borderLeft: `3px solid ${PRIORITY_COLOR[r.priority]}`, borderRadius: 8, padding: "12px 16px", display: "flex", gap: 12, alignItems: "flex-start" }}>
                <span style={{ fontSize: 10, color: PRIORITY_COLOR[r.priority], background: PRIORITY_COLOR[r.priority] + "18", padding: "2px 8px", borderRadius: 4, fontWeight: 700, whiteSpace: "nowrap" }}>{r.priority}</span>
                <div>
                  <div style={{ fontSize: 10, color: "#475569", marginBottom: 4, fontWeight: 600 }}>{r.type}</div>
                  <div style={{ fontSize: 12, color: "#C8D8E8", lineHeight: 1.5 }}>{r.message}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}