"use client";
import { useRouter } from "next/navigation";

interface ProjectBar {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  health: string;
  healthScore: number;
  progress: number;
}

interface Props {
  projects: ProjectBar[];
  year?: number;
}

const QUARTER_COLORS = [
  { bg: "#EFF6FF", border: "#BFDBFE", text: "#1E3A8A", label: "Q1" },
  { bg: "#F0FDF4", border: "#BBF7D0", text: "#14532D", label: "Q2" },
  { bg: "#FFFBEB", border: "#FDE68A", text: "#92400E", label: "Q3" },
  { bg: "#F5F3FF", border: "#DDD6FE", text: "#4C1D95", label: "Q4" },
];

function healthColor(h: string) {
  if (h === "ON_TRACK")  return "#059669";
  if (h === "AT_RISK")   return "#D97706";
  if (h === "OFF_TRACK") return "#DC2626";
  if (h === "COMPLETED") return "#2563EB";
  return "#9CA3AF";
}

function healthLabel(h: string) {
  if (h === "ON_TRACK")  return "On track";
  if (h === "AT_RISK")   return "At risk";
  if (h === "OFF_TRACK") return "Off track";
  if (h === "COMPLETED") return "Completed";
  return "Unknown";
}

function toPct(date: Date, year: number): number {
  const start = new Date(year, 0, 1).getTime();
  const end   = new Date(year + 1, 0, 1).getTime();
  return Math.max(0, Math.min(100, ((date.getTime() - start) / (end - start)) * 100));
}

export default function PortfolioGantt({ projects, year = new Date().getFullYear() }: Props) {
  const router  = useRouter();
  const todayPct = toPct(new Date(), year);

  const onTrack  = projects.filter(p => p.health === "ON_TRACK").length;
  const atRisk   = projects.filter(p => p.health === "AT_RISK" || p.health === "OFF_TRACK").length;
  const done     = projects.filter(p => p.health === "COMPLETED").length;

  return (
    <div style={{ fontFamily: "'DM Sans', system-ui, sans-serif", background: "#fff", border: "1px solid #E5E2D9", borderRadius: 12, overflow: "hidden" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", padding: "10px 14px", borderBottom: "1px solid #E5E2D9", background: "#F8F7F3" }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: "#18170F", flex: 1 }}>Portfolio Gantt — {year}</span>
        <div style={{ display: "flex", gap: 14, fontSize: 10 }}>
          <span style={{ color: "#9E9C93" }}><strong style={{ color: "#059669" }}>{onTrack}</strong> on track</span>
          <span style={{ color: "#9E9C93" }}><strong style={{ color: "#D97706" }}>{atRisk}</strong> at risk</span>
          <span style={{ color: "#9E9C93" }}><strong style={{ color: "#2563EB" }}>{done}</strong> done</span>
        </div>
      </div>

      {/* Quarter header */}
      <div style={{ display: "grid", gridTemplateColumns: "200px 1fr", borderBottom: "1px solid #E5E2D9" }}>
        <div style={{ padding: "6px 10px", fontSize: 9, fontWeight: 700, color: "#9E9C93", textTransform: "uppercase", letterSpacing: ".06em", borderRight: "1px solid #E5E2D9" }}>
          Project
        </div>
        <div style={{ position: "relative", display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr" }}>
          {QUARTER_COLORS.map(q => (
            <div key={q.label} style={{
              padding: "6px 10px", fontSize: 10, fontWeight: 700, textAlign: "center",
              background: q.bg, color: q.text, borderRight: "1px solid #E5E2D9",
            }}>
              {q.label}
              <span style={{ fontWeight: 400, opacity: .65, fontSize: 9, marginLeft: 4 }}>
                {["Jan–Mar","Apr–Jun","Jul–Sep","Oct–Dec"][QUARTER_COLORS.indexOf(q)]}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Project rows */}
      {projects.length === 0 ? (
        <div style={{ padding: "32px 14px", textAlign: "center", fontSize: 12, color: "#9E9C93" }}>No projects</div>
      ) : (
        projects.map((p, rowIdx) => {
          const startPct = toPct(new Date(p.startDate), year);
          const endPct   = toPct(new Date(p.endDate),   year);
          const w        = endPct - startPct;
          const color    = healthColor(p.health);

          return (
            <div
              key={p.id}
              style={{
                display: "grid", gridTemplateColumns: "200px 1fr",
                borderBottom: rowIdx < projects.length - 1 ? "1px solid #E5E2D9" : "none",
                cursor: "pointer",
              }}
              onClick={() => router.push(`/projects/${p.id}`)}
              title={`Go to ${p.name}`}
            >
              {/* Name + health */}
              <div style={{ display: "flex", alignItems: "center", gap: 7, padding: "8px 10px", borderRight: "1px solid #E5E2D9", overflow: "hidden" }}>
                <div style={{ width: 7, height: 7, borderRadius: "50%", background: color, flexShrink: 0 }} />
                <div style={{ overflow: "hidden" }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "#18170F", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {p.name}
                  </div>
                  <div style={{ fontSize: 9, color, marginTop: 1 }}>{healthLabel(p.health)} · {p.healthScore}</div>
                </div>
              </div>

              {/* Timeline bar */}
              <div style={{ position: "relative", height: 52 }}>
                {/* Quarter dividers */}
                {[25, 50, 75].map(x => (
                  <div key={x} style={{ position: "absolute", top: 0, bottom: 0, left: `${x}%`, width: 1, background: "#E5E2D9", pointerEvents: "none" }} />
                ))}
                {/* Quarter tint bands */}
                {[0,1,2,3].map(qi => (
                  <div key={qi} style={{ position: "absolute", top: 0, bottom: 0, left: `${qi * 25}%`, width: "25%", background: QUARTER_COLORS[qi].bg, opacity: 0.35, pointerEvents: "none" }} />
                ))}
                {/* Today line */}
                {todayPct > 0 && todayPct < 100 && (
                  <div style={{ position: "absolute", top: 0, bottom: 0, left: `${todayPct}%`, width: 1, background: "#DC2626", opacity: 0.7, zIndex: 3, pointerEvents: "none" }} />
                )}
                {/* Planned bar */}
                {w > 0 && (
                  <div style={{
                    position: "absolute", top: 12, height: 12,
                    left: `${Math.max(0, startPct)}%`,
                    width: `${Math.min(100 - Math.max(0, startPct), w)}%`,
                    border: `2px dashed ${color}`, borderRadius: 4,
                    background: "transparent", opacity: 0.4, zIndex: 1,
                  }} />
                )}
                {/* Realized bar */}
                {w > 0 && p.progress > 0 && (
                  <div style={{
                    position: "absolute", top: 12, height: 12,
                    left: `${Math.max(0, startPct)}%`,
                    width: `${Math.min(100 - Math.max(0, startPct), w * p.progress / 100)}%`,
                    background: color, borderRadius: 4, opacity: 0.85, zIndex: 2,
                  }} />
                )}
                {/* Progress label */}
                {w > 0 && (
                  <div style={{
                    position: "absolute", top: 28,
                    left: `${Math.max(0, startPct)}%`,
                    fontSize: 9, fontWeight: 700, color, fontFamily: "'DM Mono', monospace",
                    whiteSpace: "nowrap",
                  }}>
                    {p.progress}%
                    <span style={{ fontWeight: 400, color: "#9E9C93", marginLeft: 4 }}>
                      {new Date(p.startDate).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                      {" – "}
                      {new Date(p.endDate).toLocaleDateString("en-GB",   { day: "numeric", month: "short" })}
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })
      )}

      {/* Footer */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "8px 14px", borderTop: "1px solid #E5E2D9", background: "#F8F7F3" }}>
        {[
          ["#059669","On track"],["#D97706","At risk"],["#DC2626","Off track"],["#2563EB","Completed"],["#9CA3AF","Unknown"],
        ].map(([c,l]) => (
          <span key={l} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: "#5C5A52" }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: c as string }} />{l}
          </span>
        ))}
        <span style={{ marginLeft: "auto", fontSize: 9, color: "#9E9C93" }}>Click project to open · Red line = today</span>
      </div>
    </div>
  );
}
