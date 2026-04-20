"use client";
import Link from "next/link";

interface MyProject {
  id: string;
  name: string;
  status: string;
  pct: number;
  nextMilestone: string | null;
  budgetUsedPct: number;
  daysLeft: number;
  health: string;
}

interface Props {
  userName: string;
  orgName: string;
  myProjects: MyProject[];
}

function healthColor(h: string) {
  if (h === "ON_TRACK")  return { color: "#14532D", bg: "#F0FDF4", border: "#BBF7D0" };
  if (h === "AT_RISK")   return { color: "#92400E", bg: "#FFFBEB", border: "#FDE68A" };
  if (h === "OFF_TRACK") return { color: "#991B1B", bg: "#FEF2F2", border: "#FECACA" };
  if (h === "COMPLETED") return { color: "#1E3A8A", bg: "#EFF6FF", border: "#BFDBFE" };
  return { color: "#5C5A52", bg: "#F8F7F3", border: "#E5E2D9" };
}

function healthLabel(h: string) {
  if (h === "ON_TRACK")  return "On track";
  if (h === "AT_RISK")   return "At risk";
  if (h === "OFF_TRACK") return "Off track";
  if (h === "COMPLETED") return "Completed";
  return "Planned";
}

function statusLabel(s: string) {
  if (s === "ACTIVE")      return "Active";
  if (s === "NOT_STARTED") return "Planning";
  if (s === "PAUSED")      return "On hold";
  if (s === "COMPLETED")   return "Completed";
  return s;
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export default function StakeholderInsights({ userName, orgName, myProjects }: Props) {
  const firstName = userName.split(" ")[0] || "there";
  const dateStr = new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });

  const upcoming = myProjects
    .filter(p => p.nextMilestone)
    .sort((a, b) => (a.nextMilestone! < b.nextMilestone! ? -1 : 1))
    .slice(0, 3);

  const completed = myProjects.filter(p => p.health === "COMPLETED" || p.status === "COMPLETED").length;
  const atRisk    = myProjects.filter(p => p.health === "AT_RISK" || p.health === "OFF_TRACK").length;

  return (
    <div style={{ padding: "24px 28px", fontFamily: "'DM Sans', system-ui, sans-serif" }}>

      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: "#18170F", letterSpacing: "-.4px" }}>
          {getGreeting()}, {firstName}
        </div>
        <div style={{ fontSize: 11, color: "#5C5A52", marginTop: 4 }}>
          {dateStr} · {orgName} · <strong style={{ color: "#0D9488" }}>Stakeholder view</strong>
        </div>
      </div>

      {/* Summary KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 16 }}>
        {[
          { label: "My projects", value: myProjects.length, sub: "total requests", bg: "#F8F7F3", border: "#E5E2D9", vc: "#18170F" },
          { label: "Completed",   value: completed, sub: "delivered",        bg: "#F0FDF4", border: "#BBF7D0", vc: "#059669" },
          { label: "Needs attention", value: atRisk, sub: "at risk / off track", bg: atRisk > 0 ? "#FEF2F2" : "#F0FDF4", border: atRisk > 0 ? "#FECACA" : "#BBF7D0", vc: atRisk > 0 ? "#991B1B" : "#059669" },
        ].map(k => (
          <div key={k.label} style={{ borderRadius: 12, padding: "14px 16px", background: k.bg, border: `1px solid ${k.border}`, boxShadow: "0 1px 3px rgba(0,0,0,.07)" }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: "#5C5A52", textTransform: "uppercase", letterSpacing: ".07em", marginBottom: 6 }}>{k.label}</div>
            <div style={{ fontSize: 26, fontWeight: 700, lineHeight: 1, letterSpacing: "-.6px", color: k.vc }}>{k.value}</div>
            <div style={{ fontSize: 10, marginTop: 5, color: k.vc, opacity: .75 }}>{k.sub}</div>
          </div>
        ))}
      </div>

      {myProjects.length === 0 ? (
        <div style={{ background: "#fff", border: "1px solid #E5E2D9", borderRadius: 12, padding: "40px 24px", textAlign: "center" }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>📋</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: "#18170F", marginBottom: 6 }}>No projects requested yet</div>
          <div style={{ fontSize: 12, color: "#9E9C93" }}>Projects you request will appear here</div>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, alignItems: "start" }}>

          {/* My projects */}
          <div style={{ background: "#fff", border: "1px solid #E5E2D9", borderRadius: 12, overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,.07)" }}>
            <div style={{ padding: "10px 14px", borderBottom: "1px solid #E5E2D9" }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: "#18170F" }}>My projects ({myProjects.length})</span>
            </div>

            {myProjects.map((p, i) => {
              const hc = healthColor(p.health);
              const budgetBarColor = p.budgetUsedPct > 100 ? "#DC2626" : p.budgetUsedPct > 80 ? "#D97706" : "#059669";
              return (
                <div key={p.id} style={{
                  padding: "12px 14px",
                  borderBottom: i < myProjects.length - 1 ? "1px solid #E5E2D9" : "none",
                }}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 8 }}>
                    <div>
                      <Link href={`/projects/${p.id}`} style={{ fontSize: 13, fontWeight: 600, color: "#18170F", textDecoration: "none" }}>
                        {p.name}
                      </Link>
                      <div style={{ fontSize: 10, color: "#9E9C93", marginTop: 2 }}>{statusLabel(p.status)}</div>
                    </div>
                    <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 20, ...hc }}>
                      {healthLabel(p.health)}
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div style={{ marginBottom: 6 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                      <span style={{ fontSize: 9, color: "#9E9C93" }}>Progress</span>
                      <span style={{ fontSize: 9, fontWeight: 700, color: "#18170F", fontFamily: "'DM Mono', monospace" }}>{p.pct}%</span>
                    </div>
                    <div style={{ height: 5, background: "#F0EEE8", borderRadius: 99, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${p.pct}%`, background: p.pct >= 70 ? "#059669" : "#2563EB", borderRadius: 99 }} />
                    </div>
                  </div>

                  {/* Budget bar */}
                  {p.budgetUsedPct > 0 && (
                    <div style={{ marginBottom: 6 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                        <span style={{ fontSize: 9, color: "#9E9C93" }}>Budget used</span>
                        <span style={{ fontSize: 9, fontWeight: 700, color: budgetBarColor, fontFamily: "'DM Mono', monospace" }}>{Math.min(999, p.budgetUsedPct)}%</span>
                      </div>
                      <div style={{ height: 5, background: "#F0EEE8", borderRadius: 99, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${Math.min(100, p.budgetUsedPct)}%`, background: budgetBarColor, borderRadius: 99 }} />
                      </div>
                    </div>
                  )}

                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ fontSize: 10, color: p.daysLeft < 0 ? "#DC2626" : p.daysLeft <= 7 ? "#D97706" : "#9E9C93" }}>
                      {p.daysLeft < 0 ? `${Math.abs(p.daysLeft)}d overdue` : p.daysLeft === 0 ? "Due today" : `${p.daysLeft}d remaining`}
                    </span>
                    <Link href={`/projects/${p.id}`} style={{ fontSize: 10, fontWeight: 600, padding: "3px 8px", borderRadius: 6, background: "#F8F7F3", border: "1px solid #E5E2D9", color: "#5C5A52", textDecoration: "none" }}>
                      View →
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Upcoming deliveries */}
          <div>
            <div style={{ background: "#fff", border: "1px solid #E5E2D9", borderRadius: 12, overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,.07)", marginBottom: 12 }}>
              <div style={{ padding: "10px 14px", borderBottom: "1px solid #E5E2D9" }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: "#18170F" }}>Upcoming deliveries</span>
              </div>
              {upcoming.length === 0 ? (
                <div style={{ padding: "20px 14px", textAlign: "center", fontSize: 12, color: "#9E9C93" }}>No upcoming milestones</div>
              ) : upcoming.map((p, i) => {
                const dStr = new Date(p.nextMilestone!).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "2-digit" });
                const daysUntil = Math.ceil((new Date(p.nextMilestone!).getTime() - Date.now()) / 86400000);
                return (
                  <div key={p.id} style={{
                    display: "flex", alignItems: "center", gap: 10, padding: "10px 14px",
                    borderBottom: i < upcoming.length - 1 ? "1px solid #E5E2D9" : "none",
                  }}>
                    <div style={{ width: 36, height: 36, borderRadius: 8, background: "#EFF6FF", border: "1px solid #BFDBFE", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <span style={{ fontSize: 8, fontWeight: 700, color: "#1E3A8A", lineHeight: 1 }}>{new Date(p.nextMilestone!).toLocaleDateString("en-GB", { month: "short" }).toUpperCase()}</span>
                      <span style={{ fontSize: 14, fontWeight: 700, color: "#1E3A8A", lineHeight: 1.2 }}>{new Date(p.nextMilestone!).getDate()}</span>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: "#18170F", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</div>
                      <div style={{ fontSize: 10, color: daysUntil <= 7 ? "#D97706" : "#9E9C93" }}>
                        {daysUntil <= 0 ? "Today" : `In ${daysUntil}d`} · {dStr}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
