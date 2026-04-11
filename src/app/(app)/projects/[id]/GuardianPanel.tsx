"use client";
import { useState, useEffect, useCallback } from "react";
 
type AlertLevel = "critical" | "warning" | "info" | "success";
type RiskLevel = "low" | "medium" | "high" | "critical";
 
interface GuardianAlert {
  id: string;
  level: AlertLevel;
  category: string;
  title: string;
  detail: string;
  action?: string;
  projectId?: string;
  projectName?: string;
}
 
interface GuardianReport {
  healthScore?: number;
  progressReal?: number;
  progressNominal?: number;
  onTrackProbability?: number;
  riskLevel?: RiskLevel;
  budgetRisk?: string;
  estimatedDelay?: number;
  alerts: GuardianAlert[];
  recommendations: string[];
  // Portfolio fields
  totalProjects?: number;
  criticalAlerts?: GuardianAlert[];
  warningAlerts?: GuardianAlert[];
  topRisks?: string[];
  portfolioRecommendations?: string[];
  projectReports?: any[];
  generatedAt: string;
}
 
const LEVEL_META: Record<AlertLevel, { color: string; bg: string; border: string; icon: string }> = {
  critical: { color: "#DC2626", bg: "#FEF2F2", border: "#FECACA", icon: "🔴" },
  warning:  { color: "#D97706", bg: "#FFFBEB", border: "#FDE68A", icon: "🟡" },
  info:     { color: "#2563EB", bg: "#EFF6FF", border: "#BFDBFE", icon: "🔵" },
  success:  { color: "#059669", bg: "#ECFDF5", border: "#A7F3D0", icon: "🟢" },
};
 
const RISK_COLOR: Record<RiskLevel, string> = {
  low: "#059669", medium: "#D97706", high: "#EA580C", critical: "#DC2626",
};
 
// ── Sidebar Badge (minimal) ──────────────────────────────────────────────────
export function GuardianSidebarBadge({ orgId }: { orgId: string }) {
  const [criticalCount, setCriticalCount] = useState<number | null>(null);
 
  useEffect(() => {
    fetch("/api/guardian")
      .then(r => r.json())
      .then(data => setCriticalCount(data.criticalAlerts?.length ?? 0))
      .catch(() => setCriticalCount(0));
  }, []);
 
  if (criticalCount === null) return null;
  if (criticalCount === 0) return (
    <span style={{ fontSize: 9, color: "#059669", background: "#ECFDF5", border: "1px solid #A7F3D0", padding: "1px 6px", borderRadius: 10, fontWeight: 700 }}>✓</span>
  );
 
  return (
    <span style={{ fontSize: 9, color: "#DC2626", background: "#FEF2F2", border: "1px solid #FECACA", padding: "1px 6px", borderRadius: 10, fontWeight: 700 }}>
      {criticalCount} ⚠
    </span>
  );
}
 
// ── Inline Guardian Panel (for any page) ────────────────────────────────────
export function GuardianPanel({
  projectId,
  context = "project",
  compact = false,
}: {
  projectId?: string;
  context?: "project" | "portfolio" | "board" | "backlog" | "costs";
  compact?: boolean;
}) {
  const [report, setReport]   = useState<GuardianReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen]       = useState(!compact);
  const [lastRefresh, setLastRefresh] = useState<string>("");
 
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const url = projectId ? `/api/guardian/${projectId}` : "/api/guardian";
      const r = await fetch(url);
      const data = await r.json();
      setReport(data);
      setLastRefresh(new Date().toLocaleTimeString());
    } catch {
      // silent fail
    } finally {
      setLoading(false);
    }
  }, [projectId]);
 
  useEffect(() => { load(); }, [load]);
 
  const alerts = report
    ? (report.criticalAlerts
        ? [...(report.criticalAlerts ?? []), ...(report.warningAlerts ?? [])]
        : report.alerts)
    : [];
 
  const criticalCount = alerts.filter(a => a.level === "critical").length;
  const warningCount  = alerts.filter(a => a.level === "warning").length;
  const healthScore   = report?.healthScore ?? null;
  const hsColor       = healthScore !== null ? (healthScore >= 80 ? "#059669" : healthScore >= 60 ? "#D97706" : "#DC2626") : "#94A3B8";
 
  const contextLabel: Record<string, string> = {
    project:   "Project Guardian",
    portfolio: "Portfolio Guardian",
    board:     "Sprint Guardian",
    backlog:   "Backlog Guardian",
    costs:     "Cost Guardian",
  };
 
  return (
    <div style={{ background: "#fff", border: `1px solid ${criticalCount > 0 ? "#FECACA" : "#E2E8F0"}`, borderRadius: 12, overflow: "hidden", marginBottom: 20 }}>
      {/* Header */}
      <div
        style={{ padding: "12px 16px", display: "flex", alignItems: "center", gap: 10, cursor: "pointer", background: criticalCount > 0 ? "#FEF2F2" : "#FAFBFC", borderBottom: open ? "1px solid #F1F5F9" : "none" }}
        onClick={() => setOpen(o => !o)}
      >
        <div style={{ fontSize: 16 }}>🛡️</div>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#0F172A" }}>{contextLabel[context]}</span>
            {loading && <span style={{ fontSize: 10, color: "#94A3B8" }}>analyzing…</span>}
            {!loading && lastRefresh && <span style={{ fontSize: 10, color: "#CBD5E1" }}>updated {lastRefresh}</span>}
          </div>
          {!loading && report && (
            <div style={{ display: "flex", gap: 12, marginTop: 3 }}>
              {criticalCount > 0 && <span style={{ fontSize: 11, color: "#DC2626", fontWeight: 600 }}>🔴 {criticalCount} critical</span>}
              {warningCount > 0  && <span style={{ fontSize: 11, color: "#D97706", fontWeight: 600 }}>🟡 {warningCount} warnings</span>}
              {criticalCount === 0 && warningCount === 0 && <span style={{ fontSize: 11, color: "#059669", fontWeight: 600 }}>✓ All good</span>}
            </div>
          )}
        </div>
        {healthScore !== null && (
          <div style={{ textAlign: "center", minWidth: 48 }}>
            <div style={{ fontSize: 20, fontWeight: 900, color: hsColor, letterSpacing: "-1px" }}>{healthScore}</div>
            <div style={{ fontSize: 9, color: "#94A3B8", fontWeight: 600 }}>HEALTH</div>
          </div>
        )}
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <button onClick={e => { e.stopPropagation(); load(); }} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, color: "#94A3B8", padding: "2px 6px" }} title="Refresh">↻</button>
         <button 
           onClick={async () => {
         await fetch(`/api/guardian/alert`, { 
          method: "POST", 
        headers: { "Content-Type": "application/json" }, 
         body: JSON.stringify({ projectId }) 
    });
    alert("Alert email sent to project manager");
  }} 
  style={{ background: "none", border: "none", cursor: "pointer", fontSize: 11, color: "#DC2626", padding: "2px 8px", fontFamily: "inherit", fontWeight: 600 }} 
  title="Send alert email"
>
  📧 Alert PM
</button> 
          <span style={{ fontSize: 11, color: "#94A3B8" }}>{open ? "▲" : "▼"}</span>
        </div>
      </div>
 
      {/* Body */}
      {open && (
        <div style={{ padding: "14px 16px" }}>
          {loading ? (
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 0" }}>
              <div style={{ width: 16, height: 16, borderRadius: "50%", border: "2px solid #006D6B", borderTopColor: "transparent", animation: "spin 0.8s linear infinite" }} />
              <span style={{ fontSize: 12, color: "#94A3B8" }}>AI Guardian is analyzing your project…</span>
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          ) : report ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
 
              {/* Score strip */}
              {report.progressReal !== undefined && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
                  {[
                    { label: "Real Progress", value: `${Math.round(report.progressReal!)}%`, color: "#006D6B" },
                    { label: "On-Time Prob.", value: `${report.onTrackProbability}%`, color: report.onTrackProbability! >= 70 ? "#059669" : report.onTrackProbability! >= 50 ? "#D97706" : "#DC2626" },
                    { label: "Est. Delay",    value: report.estimatedDelay! > 0 ? `+${report.estimatedDelay}d` : "None", color: report.estimatedDelay! > 0 ? "#DC2626" : "#059669" },
                    { label: "Risk Level",    value: (report.riskLevel ?? "low").toUpperCase(), color: RISK_COLOR[report.riskLevel ?? "low"] },
                  ].map(s => (
                    <div key={s.label} style={{ background: "#F8FAFC", borderRadius: 8, padding: "10px 12px", textAlign: "center", border: "1px solid #F1F5F9" }}>
                      <div style={{ fontSize: 9, color: "#94A3B8", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>{s.label}</div>
                      <div style={{ fontSize: 16, fontWeight: 800, color: s.color }}>{s.value}</div>
                    </div>
                  ))}
                </div>
              )}
 
              {/* Alerts */}
              {alerts.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {alerts.map(a => {
                    const lm = LEVEL_META[a.level];
                    return (
                      <div key={a.id} style={{ background: lm.bg, border: `1px solid ${lm.border}`, borderRadius: 8, padding: "10px 12px" }}>
                        <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                          <span style={{ fontSize: 12, flexShrink: 0, marginTop: 1 }}>{lm.icon}</span>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 12, fontWeight: 700, color: "#0F172A" }}>
                              {a.projectName && context === "portfolio" && <span style={{ color: "#64748B", fontWeight: 500 }}>{a.projectName}: </span>}
                              {a.title}
                            </div>
                            <div style={{ fontSize: 11, color: "#475569", marginTop: 2 }}>{a.detail}</div>
                            {a.action && (
                              <div style={{ fontSize: 11, color: lm.color, fontWeight: 600, marginTop: 4 }}>→ {a.action}</div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
 
              {/* Recommendations */}
              {report.recommendations && report.recommendations.length > 0 && (
                <div style={{ background: "#F8FAFC", borderRadius: 8, padding: "12px 14px", border: "1px solid #F1F5F9" }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#0F172A", marginBottom: 8 }}>💡 AI Recommendations</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                    {report.recommendations.map((r, i) => (
                      <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                        <span style={{ fontSize: 10, color: "#006D6B", fontWeight: 700, marginTop: 1, flexShrink: 0 }}>{i + 1}.</span>
                        <span style={{ fontSize: 12, color: "#475569" }}>{r}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
 
              {/* Portfolio top risks */}
              {report.topRisks && report.topRisks.length > 0 && (
                <div style={{ background: "#FEF2F2", borderRadius: 8, padding: "10px 14px", border: "1px solid #FECACA" }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#DC2626", marginBottom: 6 }}>🚨 Top Portfolio Risks</div>
                  {report.topRisks.map((r, i) => (
                    <div key={i} style={{ fontSize: 12, color: "#475569", marginBottom: 3 }}>• {r}</div>
                  ))}
                </div>
              )}
 
            </div>
          ) : (
            <div style={{ fontSize: 12, color: "#94A3B8", padding: "8px 0" }}>Unable to load Guardian analysis.</div>
          )}
        </div>
      )}
    </div>
  );
}
 
// ── Floating Guardian Button (for any page) ──────────────────────────────────
export function GuardianFloatingButton({ projectId, context }: { projectId?: string; context?: string }) {
  const [open, setOpen]       = useState(false);
  const [report, setReport]   = useState<GuardianReport | null>(null);
  const [loading, setLoading] = useState(false);
 
  const load = async () => {
    if (report) { setOpen(true); return; }
    setLoading(true);
    setOpen(true);
    try {
      const url = projectId ? `/api/guardian/${projectId}` : "/api/guardian";
      const r = await fetch(url);
      setReport(await r.json());
    } finally {
      setLoading(false);
    }
  };
 
  const alerts = report ? (report.criticalAlerts ? [...(report.criticalAlerts ?? []), ...(report.warningAlerts ?? [])] : report.alerts) : [];
  const criticalCount = alerts.filter(a => a.level === "critical").length;
 
  return (
    <>
      {/* Floating button */}
      <button
        onClick={load}
        style={{
          position: "fixed", bottom: 24, right: 24, zIndex: 100,
          width: 52, height: 52, borderRadius: "50%",
          background: criticalCount > 0 ? "#DC2626" : "#006D6B",
          border: "none", cursor: "pointer", fontSize: 20,
          boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
          display: "flex", alignItems: "center", justifyContent: "center",
          transition: "all 0.2s",
        }}
        title="AI Guardian"
      >
        🛡️
        {criticalCount > 0 && (
          <span style={{ position: "absolute", top: 0, right: 0, width: 18, height: 18, borderRadius: "50%", background: "#fff", color: "#DC2626", fontSize: 10, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", border: "2px solid #DC2626" }}>
            {criticalCount}
          </span>
        )}
      </button>
 
      {/* Drawer */}
      {open && (
        <div style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", justifyContent: "flex-end" }} onClick={() => setOpen(false)}>
          <div style={{ width: 420, height: "100vh", background: "#fff", boxShadow: "-4px 0 32px rgba(0,0,0,0.12)", overflow: "auto", display: "flex", flexDirection: "column" }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: "20px 20px 0", position: "sticky", top: 0, background: "#fff", zIndex: 1, borderBottom: "1px solid #F1F5F9", paddingBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 18 }}>🛡️</span>
                  <span style={{ fontSize: 15, fontWeight: 800, color: "#0F172A" }}>AI Guardian</span>
                </div>
                <button onClick={() => setOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: "#94A3B8" }}>✕</button>
              </div>
            </div>
            <div style={{ padding: "16px 20px", flex: 1 }}>
              {loading ? (
                <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "20px 0" }}>
                  <div style={{ width: 16, height: 16, borderRadius: "50%", border: "2px solid #006D6B", borderTopColor: "transparent", animation: "spin 0.8s linear infinite" }} />
                  <span style={{ fontSize: 13, color: "#94A3B8" }}>Analyzing with AI…</span>
                  <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                </div>
              ) : report ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {/* Health score */}
                  {report.healthScore !== undefined && (
                    <div style={{ textAlign: "center", padding: "16px 0", borderBottom: "1px solid #F1F5F9" }}>
                      <div style={{ fontSize: 48, fontWeight: 900, color: report.healthScore >= 80 ? "#059669" : report.healthScore >= 60 ? "#D97706" : "#DC2626", letterSpacing: "-2px" }}>
                        {report.healthScore}
                      </div>
                      <div style={{ fontSize: 12, color: "#94A3B8", fontWeight: 600 }}>HEALTH SCORE</div>
                    </div>
                  )}
 
                  {/* Score strip */}
                  {report.progressReal !== undefined && (
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                      {[
                        { label: "Real Progress", value: `${Math.round(report.progressReal!)}%`, color: "#006D6B" },
                        { label: "On-Time Probability", value: `${report.onTrackProbability}%`, color: report.onTrackProbability! >= 70 ? "#059669" : "#DC2626" },
                        { label: "Estimated Delay", value: report.estimatedDelay! > 0 ? `+${report.estimatedDelay} days` : "None", color: report.estimatedDelay! > 0 ? "#DC2626" : "#059669" },
                        { label: "Risk Level", value: (report.riskLevel ?? "low").toUpperCase(), color: RISK_COLOR[report.riskLevel ?? "low"] },
                      ].map(s => (
                        <div key={s.label} style={{ background: "#F8FAFC", borderRadius: 10, padding: "12px 14px", border: "1px solid #F1F5F9" }}>
                          <div style={{ fontSize: 9, color: "#94A3B8", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>{s.label}</div>
                          <div style={{ fontSize: 18, fontWeight: 800, color: s.color }}>{s.value}</div>
                        </div>
                      ))}
                    </div>
                  )}
 
                  {/* Alerts */}
                  {alerts.length > 0 && (
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: "#0F172A", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.06em" }}>Alerts</div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        {alerts.map(a => {
                          const lm = LEVEL_META[a.level];
                          return (
                            <div key={a.id} style={{ background: lm.bg, border: `1px solid ${lm.border}`, borderRadius: 8, padding: "10px 12px" }}>
                              <div style={{ fontSize: 12, fontWeight: 700, color: "#0F172A", marginBottom: 2 }}>{lm.icon} {a.title}</div>
                              <div style={{ fontSize: 11, color: "#475569" }}>{a.detail}</div>
                              {a.action && <div style={{ fontSize: 11, color: lm.color, fontWeight: 600, marginTop: 4 }}>→ {a.action}</div>}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
 
                  {/* Recommendations */}
                  {report.recommendations && (
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: "#0F172A", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.06em" }}>💡 Recommendations</div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        {report.recommendations.map((r, i) => (
                          <div key={i} style={{ display: "flex", gap: 8, padding: "8px 10px", background: "#F8FAFC", borderRadius: 8, border: "1px solid #F1F5F9" }}>
                            <span style={{ fontSize: 11, color: "#006D6B", fontWeight: 700, flexShrink: 0 }}>{i + 1}.</span>
                            <span style={{ fontSize: 12, color: "#475569" }}>{r}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </>
  );
}