"use client";
import Link from "next/link";
import { useState } from "react";

interface ProjectStat {
  id: string; name: string; status: string; health: string; healthScore: number;
  pct: number; budgetTotal: number; costForecast: number; budgetVariance: number;
  daysLeft: number; spi: number; cpi: number; openRisks: number; highRisks: number;
}

interface DecisionItem {
  id: string; title: string; meta: string; priority: "urgent" | "watch" | "good";
  href: string; action: string;
}

interface Props {
  userName: string;
  orgName: string;
  projects: ProjectStat[];
  lastAnalyzed: string | null;
}

const fmt = (n: number) => {
  if (n >= 1_000_000) return `€${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `€${(n / 1_000).toFixed(0)}k`;
  return `€${Math.round(n)}`;
};

const fmtPct = (n: number) => `${Math.round(n)}%`;

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function healthTag(h: string): React.CSSProperties {
  if (h === "ON_TRACK")  return { background: "#F0FDF4", color: "#14532D", border: "1px solid #BBF7D0" };
  if (h === "AT_RISK")   return { background: "#FFFBEB", color: "#92400E", border: "1px solid #FDE68A" };
  if (h === "OFF_TRACK") return { background: "#FEF2F2", color: "#991B1B", border: "1px solid #FECACA" };
  if (h === "COMPLETED") return { background: "#EFF6FF", color: "#1E3A8A", border: "1px solid #BFDBFE" };
  return { background: "#F4F2EC", color: "#5C5A52", border: "1px solid #E5E2D9" };
}

function healthLabel(h: string) {
  if (h === "ON_TRACK")   return "On Track";
  if (h === "AT_RISK")    return "At Risk";
  if (h === "OFF_TRACK")  return "Critical";
  if (h === "COMPLETED")  return "Completed";
  return "Not Started";
}

const CARD: React.CSSProperties = {
  background: "#FFFFFF", border: "1px solid #E5E2D9", borderRadius: 12,
  marginBottom: 10, overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,.07)",
};
const CARD_H: React.CSSProperties = {
  display: "flex", alignItems: "center", justifyContent: "space-between",
  padding: "10px 14px", borderBottom: "1px solid #E5E2D9",
};

export default function CEODashboard({ userName, orgName, projects, lastAnalyzed }: Props) {
  const [approved, setApproved] = useState<Set<string>>(new Set());
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const firstName = userName.split(" ")[0] || "there";

  // Portfolio metrics
  const totalPortfolioValue  = projects.reduce((s, p) => s + p.budgetTotal, 0);
  const budgetAtRisk         = projects.filter(p => p.cpi < 0.9).reduce((s, p) => s + p.budgetVariance, 0);
  const offTrackCount        = projects.filter(p => p.health === "OFF_TRACK" || p.health === "AT_RISK").length;
  const avgHealth            = projects.length > 0 ? Math.round(projects.reduce((s, p) => s + p.healthScore, 0) / projects.length) : 0;
  const avgOnTimePct         = projects.length > 0
    ? Math.round(projects.filter(p => p.spi >= 0.9).length / projects.length * 100) : 100;
  const totalForecastOverrun = projects.reduce((s, p) => s + Math.max(0, p.budgetVariance), 0);

  // CEO decisions: budget overruns, off-track projects, high risks
  const decisions: DecisionItem[] = [];
  for (const p of projects) {
    if (p.health === "OFF_TRACK") {
      decisions.push({ id: `ot-${p.id}`, priority: "urgent", title: `${p.name} is off track`, meta: `Health ${p.healthScore}/100 · SPI ${p.spi.toFixed(2)} · CPI ${p.cpi.toFixed(2)}`, action: "Review", href: `/projects/${p.id}` });
    }
    if (p.budgetVariance > 20000 || (p.budgetTotal > 0 && p.budgetVariance / p.budgetTotal > 0.15)) {
      decisions.push({ id: `bv-${p.id}`, priority: "urgent", title: `${p.name} — budget approval needed`, meta: `Forecast overrun: ${fmt(p.budgetVariance)} · CPI ${p.cpi.toFixed(2)}`, action: "Approve", href: `/projects/${p.id}/financials` });
    }
    if (p.highRisks >= 2) {
      decisions.push({ id: `hr-${p.id}`, priority: "watch", title: `${p.name} — ${p.highRisks} critical risks`, meta: `${p.openRisks} open risks · Health ${p.healthScore}/100`, action: "Review Risks", href: `/projects/${p.id}/risks` });
    }
  }

  const visibleDecisions = decisions.filter(d => !dismissed.has(d.id)).slice(0, 5);

  const DEC_BORDER: Record<string, string> = {
    urgent: "#DC2626", watch: "#D97706", good: "#16A34A",
  };
  const DEC_LABEL_BG: Record<string, React.CSSProperties> = {
    urgent: { background: "#DC2626", color: "#fff" },
    watch:  { background: "#D97706", color: "#fff" },
    good:   { background: "#16A34A", color: "#fff" },
  };
  const DEC_ACTION: Record<string, React.CSSProperties> = {
    urgent: { background: "#FEF2F2", border: "1px solid #FECACA", color: "#991B1B" },
    watch:  { background: "#FFFBEB", border: "1px solid #FDE68A", color: "#92400E" },
    good:   { background: "#F0FDF4", border: "1px solid #BBF7D0", color: "#14532D" },
  };

  const kpis = [
    { label: "Portfolio value",     value: fmt(totalPortfolioValue), sub: "total budget at completion",  icon: "💼", bg: "#F0FDFA", border: "#99F6E4", vc: "#134E4A" },
    { label: "Budget at risk",      value: fmt(totalForecastOverrun), sub: "projected overrun",          icon: "⚠️", bg: offTrackCount > 0 ? "#FEF2F2" : "#F0FDF4", border: offTrackCount > 0 ? "#FECACA" : "#BBF7D0", vc: offTrackCount > 0 ? "#991B1B" : "#14532D" },
    { label: "Critical / at risk",  value: offTrackCount,            sub: "projects needing attention",  icon: "🔴", bg: offTrackCount > 0 ? "#FEF2F2" : "#F0FDF4", border: offTrackCount > 0 ? "#FECACA" : "#BBF7D0", vc: offTrackCount > 0 ? "#991B1B" : "#14532D" },
    { label: "On-time delivery",    value: `${avgOnTimePct}%`,       sub: "portfolio delivery probability", icon: "✅", bg: avgOnTimePct >= 70 ? "#F0FDF4" : "#FFFBEB", border: avgOnTimePct >= 70 ? "#BBF7D0" : "#FDE68A", vc: avgOnTimePct >= 70 ? "#14532D" : "#92400E" },
  ];

  const dateStr = new Date().toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });

  return (
    <div style={{ padding: "24px 28px", fontFamily: "'DM Sans', system-ui, sans-serif" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20, gap: 14 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#18170F", letterSpacing: "-.4px" }}>
            {getGreeting()}, {firstName}
          </div>
          <div style={{ fontSize: 11, color: "#5C5A52", marginTop: 4 }}>
            {dateStr} · {orgName} · <strong style={{ color: "#7C3AED" }}>CEO view</strong> · {projects.length} projects monitored
          </div>
        </div>
        <Link href="/portfolio" style={{
          fontSize: 11, fontWeight: 600, padding: "6px 14px", borderRadius: 7,
          background: "#7C3AED", color: "#fff", textDecoration: "none",
          display: "inline-flex", alignItems: "center", gap: 5,
        }}>
          Full portfolio →
        </Link>
      </div>

      {/* KPI strip */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 16 }}>
        {kpis.map(k => (
          <div key={k.label} style={{
            borderRadius: 12, padding: "14px 16px", position: "relative", overflow: "hidden",
            background: k.bg, border: `1px solid ${k.border}`,
            boxShadow: "0 1px 3px rgba(0,0,0,.07)",
          }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#5C5A52", textTransform: "uppercase", letterSpacing: ".07em", marginBottom: 6 }}>{k.label}</div>
            <div style={{ fontSize: 26, fontWeight: 700, lineHeight: 1, letterSpacing: "-.6px", color: k.vc }}>{k.value}</div>
            <div style={{ fontSize: 10, marginTop: 4, opacity: .75, color: k.vc }}>{k.sub}</div>
            <div style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", fontSize: 32, opacity: 0.1, pointerEvents: "none" }}>{k.icon}</div>
          </div>
        ))}
      </div>

      {/* 2-col grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, alignItems: "start" }}>

        {/* LEFT: Decisions */}
        <div>
          <div style={CARD}>
            <div style={CARD_H}>
              <span style={{ fontSize: 12, fontWeight: 700, color: "#18170F" }}>Decisions required</span>
              <span style={{ fontSize: 10, fontWeight: 700, background: "#F5F3FF", color: "#7C3AED", border: "1px solid #DDD6FE", padding: "2px 8px", borderRadius: 20 }}>
                CEO sign-off
              </span>
            </div>

            {visibleDecisions.length === 0 ? (
              <div style={{ padding: "28px 14px", textAlign: "center" }}>
                <div style={{ fontSize: 20, marginBottom: 6 }}>✓</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#16A34A", marginBottom: 4 }}>No decisions pending</div>
                <div style={{ fontSize: 11, color: "#9E9C93" }}>Portfolio is within approved parameters</div>
              </div>
            ) : (
              visibleDecisions.map((d, i) => (
                <div key={d.id} style={{
                  display: "flex", alignItems: "flex-start", gap: 10, padding: "12px 14px",
                  borderBottom: i < visibleDecisions.length - 1 ? "1px solid #E5E2D9" : "none",
                  borderLeft: `3px solid ${DEC_BORDER[d.priority] ?? "#9E9C93"}`,
                }}>
                  <div style={{ fontSize: 9, fontWeight: 800, padding: "2px 6px", borderRadius: 4, whiteSpace: "nowrap", flexShrink: 0, marginTop: 2, letterSpacing: ".06em", ...DEC_LABEL_BG[d.priority] }}>
                    {d.priority.toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 500, color: "#18170F", lineHeight: 1.4 }}>{d.title}</div>
                    <div style={{ fontSize: 10, color: "#6B6860", marginTop: 2 }}>{d.meta}</div>
                  </div>
                  <div style={{ display: "flex", gap: 5, flexShrink: 0 }}>
                    <Link href={d.href} style={{ fontSize: 10, fontWeight: 600, padding: "3px 8px", borderRadius: 6, textDecoration: "none", whiteSpace: "nowrap", ...DEC_ACTION[d.priority] }}>
                      {d.action}
                    </Link>
                    {d.id.startsWith("bv-") && !approved.has(d.id) && (
                      <button onClick={() => setApproved(s => new Set([...s, d.id]))} style={{ fontSize: 10, fontWeight: 600, padding: "3px 8px", borderRadius: 6, background: "#F0FDF4", border: "1px solid #BBF7D0", color: "#14532D", cursor: "pointer", fontFamily: "inherit" }}>
                        ✓ Approve
                      </button>
                    )}
                    <button onClick={() => setDismissed(s => new Set([...s, d.id]))} style={{ fontSize: 13, padding: "3px 7px", borderRadius: 6, border: "1px solid #E5E2D9", background: "#F4F2EC", color: "#9E9C93", cursor: "pointer", lineHeight: 1 }}>
                      ×
                    </button>
                  </div>
                </div>
              ))
            )}

            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 14px", background: "linear-gradient(to right,rgba(124,58,237,.04),transparent)", borderTop: "1px solid #DDD6FE" }}>
              <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#7C3AED" }} />
              <div style={{ fontSize: 11, color: "#5C5A52" }}>
                <strong style={{ color: "#7C3AED" }}>Portfolio AI</strong>
                {" "}— avg health {avgHealth}/100 · {offTrackCount} critical · {visibleDecisions.length} decisions pending
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT: Portfolio table */}
        <div>
          <div style={CARD}>
            <div style={CARD_H}>
              <span style={{ fontSize: 12, fontWeight: 700, color: "#18170F" }}>Portfolio overview</span>
              <BtnLink href="/portfolio">Details →</BtnLink>
            </div>

            {/* Table header */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 80px 80px 70px 60px", gap: 8, padding: "6px 14px", background: "#F8F7F3", borderBottom: "1px solid #E5E2D9" }}>
              {["Project", "Health", "Budget", "Forecast", "Delay"].map(h => (
                <div key={h} style={{ fontSize: 9, fontWeight: 700, color: "#9E9C93", textTransform: "uppercase", letterSpacing: ".06em" }}>{h}</div>
              ))}
            </div>

            {projects.length === 0 ? (
              <div style={{ padding: "20px 14px", textAlign: "center", fontSize: 11, color: "#9E9C93" }}>No projects</div>
            ) : (
              projects.map((p, i) => {
                const overrunPct = p.budgetTotal > 0 ? Math.round((p.budgetVariance / p.budgetTotal) * 100) : 0;
                const delayLabel = p.daysLeft < 0 ? `${Math.abs(p.daysLeft)}d late` : p.daysLeft <= 7 ? `${p.daysLeft}d` : "—";
                const delayColor = p.daysLeft < 0 ? "#DC2626" : p.daysLeft <= 7 ? "#D97706" : "#9E9C93";
                return (
                  <div key={p.id} style={{
                    display: "grid", gridTemplateColumns: "1fr 80px 80px 70px 60px", gap: 8,
                    padding: "9px 14px", alignItems: "center",
                    borderBottom: i < projects.length - 1 ? "1px solid #E5E2D9" : "none",
                  }}>
                    <Link href={`/projects/${p.id}`} style={{ fontSize: 12, fontWeight: 500, color: "#18170F", textDecoration: "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {p.name}
                    </Link>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 5, whiteSpace: "nowrap", ...healthTag(p.health) }}>
                      {healthLabel(p.health)}
                    </span>
                    <div style={{ fontSize: 11, color: "#18170F", fontFamily: "'DM Mono', monospace" }}>{fmt(p.budgetTotal)}</div>
                    <div style={{ fontSize: 11, color: p.budgetVariance > 0 ? "#DC2626" : "#059669", fontFamily: "'DM Mono', monospace", fontWeight: 600 }}>
                      {p.budgetVariance > 0 ? `+${overrunPct}%` : "On budget"}
                    </div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: delayColor }}>{delayLabel}</div>
                  </div>
                );
              })
            )}
          </div>

          {/* Guardian summary */}
          <div style={{ ...CARD, padding: "14px", background: "linear-gradient(135deg, #F5F3FF, #EFF6FF)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <div className="g-dot-pulse" style={{ width: 8, height: 8, borderRadius: "50%", background: "#7C3AED" }} />
              <span style={{ fontSize: 12, fontWeight: 700, color: "#4C1D95" }}>Guardian AI — Executive Summary</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
              {[
                { label: "Projects monitored", value: String(projects.length)    },
                { label: "Avg portfolio health", value: `${avgHealth}/100`       },
                { label: "Last analysis",        value: lastAnalyzed ? new Date(lastAnalyzed).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : "—" },
              ].map(item => (
                <div key={item.label} style={{ background: "rgba(255,255,255,.6)", borderRadius: 8, padding: "8px 10px" }}>
                  <div style={{ fontSize: 9, fontWeight: 700, color: "#7C3AED", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 3 }}>{item.label}</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "#18170F" }}>{item.value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function BtnLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} style={{
      fontSize: 10, fontWeight: 600, padding: "4px 9px", borderRadius: 7,
      background: "#FFFFFF", border: "1px solid #D4D0C6", color: "#5C5A52",
      textDecoration: "none", display: "inline-flex", alignItems: "center",
    }}>
      {children}
    </Link>
  );
}
