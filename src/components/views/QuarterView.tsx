"use client";

interface ProjectItem {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  healthScore: number;
  health: string;
  progress: number;
}

interface Props {
  projects: ProjectItem[];
  year?: number;
}

const QUARTERS = [
  { label: "Q1", months: [0, 1, 2], color: "#EFF6FF", border: "#BFDBFE", text: "#1E3A8A" },
  { label: "Q2", months: [3, 4, 5], color: "#F0FDF4", border: "#BBF7D0", text: "#14532D" },
  { label: "Q3", months: [6, 7, 8], color: "#FFFBEB", border: "#FDE68A", text: "#92400E" },
  { label: "Q4", months: [9,10,11], color: "#F5F3FF", border: "#DDD6FE", text: "#4C1D95" },
];

function healthColor(h: string) {
  if (h === "ON_TRACK")   return "#059669";
  if (h === "AT_RISK")    return "#D97706";
  if (h === "OFF_TRACK")  return "#DC2626";
  if (h === "COMPLETED")  return "#2563EB";
  return "#9CA3AF";
}

function getQPercent(date: Date, year: number): number {
  const start = new Date(year, 0, 1).getTime();
  const end   = new Date(year + 1, 0, 1).getTime();
  return Math.max(0, Math.min(100, ((date.getTime() - start) / (end - start)) * 100));
}

export default function QuarterView({ projects, year = new Date().getFullYear() }: Props) {
  const todayPct = getQPercent(new Date(), year);

  const totalBudgetAtRisk  = projects.filter(p => p.health === "AT_RISK" || p.health === "OFF_TRACK").length;
  const completed = projects.filter(p => p.health === "COMPLETED").length;
  const avgHealth = projects.length > 0
    ? Math.round(projects.reduce((s, p) => s + p.healthScore, 0) / projects.length) : 0;

  return (
    <div style={{ fontFamily: "'DM Sans', system-ui, sans-serif", background: "#fff", border: "1px solid #E5E2D9", borderRadius: 12, overflow: "hidden" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", padding: "10px 14px", borderBottom: "1px solid #E5E2D9", background: "#F8F7F3" }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: "#18170F", flex: 1 }}>Quarter view — {year}</span>
        <div style={{ display: "flex", gap: 14, fontSize: 10 }}>
          <span style={{ color: "#9E9C93" }}><strong style={{ color: "#18170F" }}>{projects.length}</strong> active</span>
          <span style={{ color: "#9E9C93" }}><strong style={{ color: "#D97706" }}>{totalBudgetAtRisk}</strong> at risk</span>
          <span style={{ color: "#9E9C93" }}><strong style={{ color: "#2563EB" }}>{completed}</strong> completed</span>
          <span style={{ color: "#9E9C93" }}>avg health <strong style={{ color: avgHealth >= 70 ? "#059669" : "#D97706" }}>{avgHealth}</strong></span>
        </div>
      </div>

      {/* Quarter columns header */}
      <div style={{ display: "grid", gridTemplateColumns: "200px 1fr 1fr 1fr 1fr", borderBottom: "1px solid #E5E2D9" }}>
        <div style={{ padding: "6px 10px", fontSize: 9, fontWeight: 700, color: "#9E9C93", textTransform: "uppercase", letterSpacing: ".06em", borderRight: "1px solid #E5E2D9" }}>
          Project
        </div>
        {QUARTERS.map(q => (
          <div key={q.label} style={{
            padding: "6px 10px", fontSize: 10, fontWeight: 700, textAlign: "center",
            background: q.color, color: q.text, borderRight: "1px solid #E5E2D9",
          }}>
            {q.label} <span style={{ fontWeight: 400, opacity: .7 }}>{["Jan–Mar","Apr–Jun","Jul–Sep","Oct–Dec"][QUARTERS.indexOf(q)]}</span>
          </div>
        ))}
      </div>

      {/* Project rows */}
      {projects.length === 0 ? (
        <div style={{ padding: "32px 14px", textAlign: "center", fontSize: 12, color: "#9E9C93" }}>No projects</div>
      ) : (
        projects.map((p, rowIdx) => {
          const startPct = getQPercent(new Date(p.startDate), year);
          const endPct   = getQPercent(new Date(p.endDate), year);
          const w = endPct - startPct;
          const color = healthColor(p.health);

          return (
            <div key={p.id} style={{
              display: "grid", gridTemplateColumns: "200px 1fr 1fr 1fr 1fr",
              borderBottom: rowIdx < projects.length - 1 ? "1px solid #E5E2D9" : "none",
            }}>
              {/* Name */}
              <div style={{ display: "flex", alignItems: "center", gap: 7, padding: "8px 10px", borderRight: "1px solid #E5E2D9", overflow: "hidden" }}>
                <div style={{ width: 7, height: 7, borderRadius: "50%", background: color, flexShrink: 0 }} />
                <span style={{ fontSize: 11, fontWeight: 600, color: "#18170F", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</span>
              </div>

              {/* Timeline spans 4 quarter columns */}
              <div style={{ gridColumn: "2 / 6", position: "relative", height: 48 }}>
                {/* Quarter dividers */}
                {[25, 50, 75].map(x => (
                  <div key={x} style={{ position: "absolute", top: 0, bottom: 0, left: `${x}%`, width: 1, background: "#E5E2D9" }} />
                ))}
                {/* Today line */}
                {todayPct > 0 && todayPct < 100 && (
                  <div style={{ position: "absolute", top: 0, bottom: 0, left: `${todayPct}%`, width: 1, background: "#DC2626", opacity: 0.6, zIndex: 2 }} />
                )}
                {/* Planned bar (full duration, dashed border) */}
                {w > 0 && (
                  <div style={{
                    position: "absolute", top: 10, height: 12,
                    left: `${Math.max(0, startPct)}%`,
                    width: `${Math.min(100 - Math.max(0, startPct), w)}%`,
                    borderRadius: 3,
                    border: `2px dashed ${color}`,
                    background: "transparent", opacity: 0.4,
                  }} />
                )}
                {/* Realized bar (progress %) */}
                {w > 0 && p.progress > 0 && (
                  <div style={{
                    position: "absolute", top: 10, height: 12,
                    left: `${Math.max(0, startPct)}%`,
                    width: `${Math.min(100 - Math.max(0, startPct), w * p.progress / 100)}%`,
                    background: color, borderRadius: 3, opacity: 0.85,
                  }} />
                )}
                {/* Health score badge */}
                <div style={{
                  position: "absolute", top: 27,
                  left: `${Math.max(0, startPct)}%`,
                  display: "flex", alignItems: "center", gap: 4,
                }}>
                  <span style={{ fontSize: 9, fontWeight: 700, color, fontFamily: "'DM Mono', monospace" }}>
                    {p.progress}% · {p.healthScore}
                  </span>
                </div>
              </div>
            </div>
          );
        })
      )}

      {/* Footer summary */}
      <div style={{ display: "grid", gridTemplateColumns: "200px 1fr 1fr 1fr 1fr", borderTop: "1px solid #E5E2D9", background: "#F8F7F3" }}>
        <div style={{ padding: "7px 10px", fontSize: 10, fontWeight: 700, color: "#5C5A52", borderRight: "1px solid #E5E2D9" }}>Summary</div>
        {QUARTERS.map((q, qi) => {
          const active = projects.filter(p => {
            const s = new Date(p.startDate).getMonth();
            const e = new Date(p.endDate).getMonth();
            return q.months.some(m => m >= s && m <= e);
          }).length;
          return (
            <div key={q.label} style={{ padding: "7px 10px", fontSize: 10, color: "#5C5A52", background: q.color, borderRight: qi < 3 ? "1px solid #E5E2D9" : "none", textAlign: "center" }}>
              <strong style={{ color: q.text }}>{active}</strong> project{active !== 1 ? "s" : ""} active
            </div>
          );
        })}
      </div>
    </div>
  );
}
