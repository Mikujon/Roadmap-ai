"use client";
import Link from "next/link";
import { useState } from "react";

interface Decision {
  id: string;
  projectId: string;
  projectName: string;
  title: string;
  impact: string;
  priority: "urgent" | "watch";
}

interface CriticalAlert {
  id: string;
  title: string;
  detail?: string;
  projectId?: string;
  projectName?: string;
}

interface Props {
  portfolioHealth: number;
  budgetExposure: number;
  criticalCount: number;
  onTimePct: number;
  avgHealth: number;
  totalProjects: number;
  decisions: Decision[];
  criticalAlerts: CriticalAlert[];
  lastAnalyzed: string | null;
}

const fmt = (n: number) => {
  if (n >= 1_000_000) return `€${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `€${(n / 1_000).toFixed(0)}k`;
  return `€${Math.round(n)}`;
};

export default function CEOInsights({
  portfolioHealth, budgetExposure, criticalCount, onTimePct,
  avgHealth, totalProjects, decisions, criticalAlerts, lastAnalyzed,
}: Props) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [approved,  setApproved]  = useState<Set<string>>(new Set());

  const healthColor = portfolioHealth >= 75 ? "#059669" : portfolioHealth >= 55 ? "#D97706" : "#DC2626";
  const healthBg    = portfolioHealth >= 75 ? "#F0FDF4" : portfolioHealth >= 55 ? "#FFFBEB" : "#FEF2F2";
  const healthBorder= portfolioHealth >= 75 ? "#BBF7D0" : portfolioHealth >= 55 ? "#FDE68A" : "#FECACA";

  const kpis = [
    {
      label: "Portfolio health",
      value: `${portfolioHealth}/100`,
      sub: `${totalProjects} projects monitored`,
      bg: healthBg, border: healthBorder, vc: healthColor,
    },
    {
      label: "Budget exposure",
      value: fmt(budgetExposure),
      sub: budgetExposure > 0 ? "projected overrun" : "within budget",
      bg: budgetExposure > 0 ? "#FEF2F2" : "#F0FDF4",
      border: budgetExposure > 0 ? "#FECACA" : "#BBF7D0",
      vc: budgetExposure > 0 ? "#991B1B" : "#14532D",
    },
    {
      label: "Critical / at risk",
      value: String(criticalCount),
      sub: "projects needing attention",
      bg: criticalCount > 0 ? "#FEF2F2" : "#F0FDF4",
      border: criticalCount > 0 ? "#FECACA" : "#BBF7D0",
      vc: criticalCount > 0 ? "#991B1B" : "#14532D",
    },
    {
      label: "On-time probability",
      value: `${onTimePct}%`,
      sub: "SPI ≥ 0.9 across portfolio",
      bg: onTimePct >= 70 ? "#F0FDF4" : "#FFFBEB",
      border: onTimePct >= 70 ? "#BBF7D0" : "#FDE68A",
      vc: onTimePct >= 70 ? "#14532D" : "#92400E",
    },
  ];

  const visibleDecisions = decisions.filter(d => !dismissed.has(d.id)).slice(0, 3);
  const visibleAlerts    = criticalAlerts.slice(0, 3);

  return (
    <div style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>

      {/* KPI cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 14 }}>
        {kpis.map(k => (
          <div key={k.label} style={{
            borderRadius: 12, padding: "14px 16px",
            background: k.bg, border: `1px solid ${k.border}`,
            boxShadow: "0 1px 3px rgba(0,0,0,.07)",
          }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: "#5C5A52", textTransform: "uppercase", letterSpacing: ".07em", marginBottom: 6 }}>{k.label}</div>
            <div style={{ fontSize: 26, fontWeight: 700, lineHeight: 1, letterSpacing: "-.6px", color: k.vc }}>{k.value}</div>
            <div style={{ fontSize: 10, marginTop: 5, color: k.vc, opacity: .75 }}>{k.sub}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, alignItems: "start" }}>

        {/* Decisions needed */}
        <div style={{ background: "#fff", border: "1px solid #E5E2D9", borderRadius: 12, overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,.07)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", borderBottom: "1px solid #E5E2D9" }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#18170F" }}>Decisions needed</span>
            <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: "#F5F3FF", color: "#7C3AED", border: "1px solid #DDD6FE" }}>CEO sign-off</span>
          </div>

          {visibleDecisions.length === 0 ? (
            <div style={{ padding: "28px 14px", textAlign: "center" }}>
              <div style={{ fontSize: 18, marginBottom: 6 }}>✓</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#16A34A" }}>No decisions pending</div>
              <div style={{ fontSize: 11, color: "#9E9C93", marginTop: 3 }}>Portfolio within approved parameters</div>
            </div>
          ) : visibleDecisions.map((d, i) => {
            const borderC = d.priority === "urgent" ? "#DC2626" : "#D97706";
            const labelSt: React.CSSProperties = d.priority === "urgent"
              ? { background: "#DC2626", color: "#fff" }
              : { background: "#D97706", color: "#fff" };
            return (
              <div key={d.id} style={{
                display: "flex", alignItems: "flex-start", gap: 10, padding: "12px 14px",
                borderBottom: i < visibleDecisions.length - 1 ? "1px solid #E5E2D9" : "none",
                borderLeft: `3px solid ${borderC}`,
              }}>
                <div style={{ fontSize: 8, fontWeight: 800, padding: "2px 5px", borderRadius: 4, flexShrink: 0, marginTop: 2, letterSpacing: ".06em", ...labelSt }}>
                  {d.priority.toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "#18170F", lineHeight: 1.4 }}>{d.title}</div>
                  <div style={{ fontSize: 10, color: "#6B6860", marginTop: 2 }}>{d.impact}</div>
                </div>
                <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                  <Link href={`/projects/${d.projectId}`} style={{ fontSize: 10, fontWeight: 600, padding: "3px 8px", borderRadius: 6, textDecoration: "none", background: "#F8F7F3", border: "1px solid #E5E2D9", color: "#5C5A52" }}>
                    Details
                  </Link>
                  {!approved.has(d.id) && (
                    <button onClick={() => setApproved(s => new Set([...s, d.id]))} style={{ fontSize: 10, fontWeight: 600, padding: "3px 8px", borderRadius: 6, background: "#F0FDF4", border: "1px solid #BBF7D0", color: "#14532D", cursor: "pointer", fontFamily: "inherit" }}>
                      ✓
                    </button>
                  )}
                  <button onClick={() => setDismissed(s => new Set([...s, d.id]))} style={{ fontSize: 12, padding: "3px 6px", borderRadius: 6, border: "1px solid #E5E2D9", background: "#F4F2EC", color: "#9E9C93", cursor: "pointer", lineHeight: 1 }}>×</button>
                </div>
              </div>
            );
          })}

          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 14px", background: "linear-gradient(to right,rgba(124,58,237,.04),transparent)", borderTop: "1px solid #DDD6FE" }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#7C3AED" }} />
            <span style={{ fontSize: 10, color: "#5C5A52" }}>
              <strong style={{ color: "#7C3AED" }}>Portfolio AI</strong>
              {" — "}avg health {avgHealth}/100 · {visibleDecisions.length} pending
              {lastAnalyzed && ` · ${new Date(lastAnalyzed).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`}
            </span>
          </div>
        </div>

        {/* Critical alerts */}
        <div style={{ background: "#fff", border: "1px solid #E5E2D9", borderRadius: 12, overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,.07)" }}>
          <div style={{ padding: "10px 14px", borderBottom: "1px solid #E5E2D9" }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#18170F" }}>Critical alerts</span>
          </div>

          {visibleAlerts.length === 0 ? (
            <div style={{ padding: "28px 14px", textAlign: "center" }}>
              <div style={{ fontSize: 18, marginBottom: 6 }}>🟢</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#059669" }}>No critical alerts</div>
              <div style={{ fontSize: 11, color: "#9E9C93", marginTop: 3 }}>All systems within thresholds</div>
            </div>
          ) : visibleAlerts.map((a, i) => (
            <div key={a.id} style={{
              padding: "12px 14px",
              borderBottom: i < visibleAlerts.length - 1 ? "1px solid #E5E2D9" : "none",
              borderLeft: "3px solid #DC2626",
              background: "rgba(220,38,38,.02)",
            }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#991B1B", marginBottom: 2 }}>{a.title}</div>
              {a.detail && <div style={{ fontSize: 11, color: "#6B6860", lineHeight: 1.4 }}>{a.detail}</div>}
              {a.projectName && (
                <div style={{ fontSize: 10, color: "#9E9C93", marginTop: 4 }}>
                  Project: <strong style={{ color: "#18170F" }}>{a.projectName}</strong>
                  {a.projectId && (
                    <Link href={`/projects/${a.projectId}`} style={{ marginLeft: 8, color: "#DC2626", textDecoration: "none", fontWeight: 600 }}>View →</Link>
                  )}
                </div>
              )}
            </div>
          ))}

          {visibleAlerts.length > 0 && (
            <div style={{ padding: "8px 14px", borderTop: "1px solid #E5E2D9" }}>
              <Link href="/alerts" style={{ fontSize: 11, color: "#DC2626", textDecoration: "none", fontWeight: 600 }}>
                View all alerts →
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
