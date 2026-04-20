"use client";
import Link from "next/link";

interface ProjectStat {
  id: string; name: string; status: string; health: string; healthScore: number;
  pct: number; daysLeft: number; budgetTotal: number; costActual: number;
  costEstimated: number; openRisks: number; sprintName: string | null;
}

interface Props {
  userName: string;
  orgName: string;
  projects: ProjectStat[];
}

const fmt = (n: number) => {
  if (n >= 1_000_000) return `€${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `€${(n / 1_000).toFixed(0)}k`;
  return `€${Math.round(n)}`;
};

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

export default function StakeholderDashboard({ userName, orgName, projects }: Props) {
  const firstName = userName.split(" ")[0] || "there";
  const dateStr = new Date().toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });

  const onTrack   = projects.filter(p => p.health === "ON_TRACK").length;
  const atRisk    = projects.filter(p => p.health === "AT_RISK" || p.health === "OFF_TRACK").length;
  const completed = projects.filter(p => p.health === "COMPLETED").length;
  const totalBudget = projects.reduce((s, p) => s + p.budgetTotal, 0);

  const kpis = [
    { label: "Your projects",   value: projects.length, sub: "assigned to you",        bg: "#F0FDFA", border: "#99F6E4", vc: "#134E4A" },
    { label: "On track",        value: onTrack,         sub: "within normal params",   bg: "#F0FDF4", border: "#BBF7D0", vc: "#14532D" },
    { label: "Needs attention", value: atRisk,          sub: "at risk or critical",     bg: atRisk > 0 ? "#FFFBEB" : "#F0FDF4", border: atRisk > 0 ? "#FDE68A" : "#BBF7D0", vc: atRisk > 0 ? "#92400E" : "#14532D" },
    { label: "Completed",       value: completed,       sub: "projects delivered",      bg: "#EFF6FF", border: "#BFDBFE", vc: "#1E3A8A" },
  ];

  return (
    <div style={{ padding: "24px 28px", fontFamily: "'DM Sans', system-ui, sans-serif" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#18170F", letterSpacing: "-.4px" }}>
            {getGreeting()}, {firstName}
          </div>
          <div style={{ fontSize: 11, color: "#5C5A52", marginTop: 4 }}>
            {dateStr} · {orgName} · <strong style={{ color: "#0D9488" }}>Stakeholder view</strong>
          </div>
        </div>
      </div>

      {/* KPI strip */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 20 }}>
        {kpis.map(k => (
          <div key={k.label} style={{
            borderRadius: 12, padding: "14px 16px",
            background: k.bg, border: `1px solid ${k.border}`,
            boxShadow: "0 1px 3px rgba(0,0,0,.07)",
          }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#5C5A52", textTransform: "uppercase", letterSpacing: ".07em", marginBottom: 6 }}>{k.label}</div>
            <div style={{ fontSize: 26, fontWeight: 700, lineHeight: 1, letterSpacing: "-.6px", color: k.vc }}>{k.value}</div>
            <div style={{ fontSize: 10, marginTop: 4, opacity: .75, color: k.vc }}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Projects list */}
      {projects.length === 0 ? (
        <div style={{ background: "#fff", border: "1px solid #E5E2D9", borderRadius: 12, padding: "40px 24px", textAlign: "center" }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>📋</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: "#18170F", marginBottom: 6 }}>No projects assigned to you</div>
          <div style={{ fontSize: 12, color: "#9E9C93" }}>Projects you requested or are assigned to will appear here</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {projects.map(p => {
            const budgetUsedPct = p.budgetTotal > 0 ? Math.min(100, Math.round((p.costActual / p.budgetTotal) * 100)) : 0;
            const daysLabel = p.daysLeft < 0
              ? `${Math.abs(p.daysLeft)} days overdue`
              : `${p.daysLeft} days remaining`;
            const daysColor = p.daysLeft < 0 ? "#DC2626" : p.daysLeft <= 14 ? "#D97706" : "#5C5A52";

            return (
              <Link key={p.id} href={`/projects/${p.id}`} style={{ textDecoration: "none" }}>
                <div style={{ background: "#fff", border: "1px solid #E5E2D9", borderRadius: 12, padding: "16px 18px", boxShadow: "0 1px 3px rgba(0,0,0,.07)", cursor: "pointer", transition: "box-shadow .15s" }}
                  onMouseEnter={e => (e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,.1)")}
                  onMouseLeave={e => (e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,.07)")}
                >
                  {/* Top row: name + health badge */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10, gap: 10 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#18170F", letterSpacing: "-.3px" }}>{p.name}</div>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 9px", borderRadius: 20, flexShrink: 0, ...healthTag(p.health) }}>
                      {healthLabel(p.health)}
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ fontSize: 10, fontWeight: 600, color: "#5C5A52" }}>Overall progress</span>
                      <span style={{ fontSize: 10, fontWeight: 700, color: "#18170F", fontFamily: "'DM Mono', monospace" }}>{p.pct}%</span>
                    </div>
                    <div style={{ height: 6, background: "#F0EEE8", borderRadius: 99, overflow: "hidden" }}>
                      <div style={{
                        height: "100%", borderRadius: 99,
                        width: `${p.pct}%`,
                        background: p.health === "ON_TRACK" ? "#059669" : p.health === "AT_RISK" ? "#D97706" : p.health === "OFF_TRACK" ? "#DC2626" : p.health === "COMPLETED" ? "#2563EB" : "#9E9C93",
                        transition: "width 0.4s ease",
                      }} />
                    </div>
                  </div>

                  {/* Bottom row: metrics */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                    <div>
                      <div style={{ fontSize: 9, fontWeight: 700, color: "#9E9C93", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 2 }}>Timeline</div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: daysColor }}>{daysLabel}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 9, fontWeight: 700, color: "#9E9C93", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 2 }}>Budget used</div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: "#18170F" }}>{fmt(p.costActual)} <span style={{ color: "#9E9C93", fontWeight: 400 }}>of {fmt(p.budgetTotal)}</span></div>
                    </div>
                    <div>
                      <div style={{ fontSize: 9, fontWeight: 700, color: "#9E9C93", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 2 }}>Active sprint</div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: "#18170F" }}>{p.sprintName ?? "—"}</div>
                    </div>
                  </div>

                  {/* Budget bar */}
                  {p.budgetTotal > 0 && (
                    <div style={{ marginTop: 10 }}>
                      <div style={{ height: 4, background: "#F0EEE8", borderRadius: 99, overflow: "hidden" }}>
                        <div style={{ height: "100%", borderRadius: 99, width: `${budgetUsedPct}%`, background: budgetUsedPct >= 90 ? "#DC2626" : budgetUsedPct >= 70 ? "#D97706" : "#059669" }} />
                      </div>
                      <div style={{ fontSize: 9, color: "#9E9C93", marginTop: 2 }}>{budgetUsedPct}% budget consumed</div>
                    </div>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
