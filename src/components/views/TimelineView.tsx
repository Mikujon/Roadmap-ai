"use client";
import { useState } from "react";

interface PhaseItem {
  id: string;
  name: string;
  startDate: string | null;
  endDate: string | null;
  status: string;
  pct: number;
}
interface SprintItem {
  id: string;
  name: string;
  startDate: string | null;
  endDate: string | null;
  status: string;
  phaseId?: string | null;
}
interface Props {
  phases: PhaseItem[];
  sprints: SprintItem[];
  projectStart: Date;
  projectEnd: Date;
}

type ViewMode = "phase" | "sprint";

function phaseColor(status: string, pct: number) {
  if (status === "DONE" || pct === 100) return "#059669";
  if (pct > 0) return "#2563EB";
  return "#9CA3AF";
}

function statusLabel(status: string, pct: number) {
  if (pct === 100 || status === "DONE") return "Complete";
  if (pct > 0 || status === "ACTIVE") return "In progress";
  return "Upcoming";
}

function Diamond({ x, y, color }: { x: number; y: number; color: string }) {
  const s = 7;
  return (
    <polygon
      points={`${x},${y - s} ${x + s},${y} ${x},${y + s} ${x - s},${y}`}
      fill={color}
      stroke="#fff"
      strokeWidth="1.5"
    />
  );
}

export default function TimelineView({ phases, sprints, projectStart, projectEnd }: Props) {
  const [mode, setMode] = useState<ViewMode>("phase");

  const totalMs = projectEnd.getTime() - projectStart.getTime();
  const toPct = (iso: string | null): number => {
    if (!iso) return 0;
    return Math.max(0, Math.min(100, ((new Date(iso).getTime() - projectStart.getTime()) / totalMs) * 100));
  };
  const todayPct = toPct(new Date().toISOString());

  const items = mode === "phase" ? phases : sprints;

  // Month labels for axis
  const months: { label: string; pct: number }[] = [];
  let cur = new Date(projectStart.getFullYear(), projectStart.getMonth(), 1);
  while (cur.getTime() <= projectEnd.getTime()) {
    const pct = toPct(cur.toISOString());
    if (pct >= 0 && pct <= 100) {
      months.push({ label: cur.toLocaleDateString("en-GB", { month: "short" }), pct });
    }
    cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
  }

  return (
    <div style={{ fontFamily: "'DM Sans', system-ui, sans-serif", background: "#fff", border: "1px solid #E5E2D9", borderRadius: 12, overflow: "hidden" }}>
      {/* Toolbar */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderBottom: "1px solid #E5E2D9", background: "#F8F7F3" }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: "#18170F", flex: 1 }}>Project timeline</span>
        <div style={{ display: "flex", gap: 2, background: "#F0EEE8", border: "1px solid #E5E2D9", borderRadius: 8, padding: 3 }}>
          {([["phase","Phases"],["sprint","Sprints"]] as [ViewMode, string][]).map(([v, l]) => (
            <button key={v} onClick={() => setMode(v)} style={{
              fontSize: 10, fontWeight: 600, padding: "3px 10px", borderRadius: 5,
              border: "none", cursor: "pointer", fontFamily: "inherit",
              background: mode === v ? "#18170F" : "transparent",
              color: mode === v ? "#fff" : "#5C5A52",
            }}>
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* Timeline axis */}
      <div style={{ padding: "0 24px", position: "relative", marginTop: 8 }}>
        <div style={{ height: 28, position: "relative", marginBottom: 2 }}>
          {months.map((m, i) => (
            <div key={i} style={{ position: "absolute", left: `${m.pct}%`, transform: "translateX(-50%)" }}>
              <div style={{ width: 1, height: 6, background: "#E5E2D9", margin: "0 auto" }} />
              <div style={{ fontSize: 9, fontWeight: 600, color: "#9E9C93", whiteSpace: "nowrap", textAlign: "center" }}>{m.label}</div>
            </div>
          ))}
          {/* Axis line */}
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 1, background: "#E5E2D9" }} />
          {/* Today marker */}
          {todayPct > 0 && todayPct < 100 && (
            <div style={{ position: "absolute", bottom: -2, left: `${todayPct}%`, transform: "translateX(-50%)" }}>
              <div style={{ width: 2, height: 10, background: "#DC2626", margin: "0 auto" }} />
              <div style={{ fontSize: 8, fontWeight: 800, color: "#DC2626", whiteSpace: "nowrap", textAlign: "center" }}>Today</div>
            </div>
          )}
        </div>
      </div>

      {/* Bars */}
      <div style={{ padding: "8px 24px 16px" }}>
        {items.length === 0 ? (
          <div style={{ padding: "24px 0", textAlign: "center", fontSize: 12, color: "#9E9C93" }}>No {mode}s available</div>
        ) : (
          items.map((item, i) => {
            const startPct = toPct(item.startDate);
            const endPct   = toPct(item.endDate);
            const width    = Math.max(1, endPct - startPct);
            const pct      = "pct" in item ? (item as PhaseItem).pct : (item.status === "DONE" ? 100 : item.status === "ACTIVE" ? 50 : 0);
            const color    = phaseColor(item.status, pct);
            const label    = statusLabel(item.status, pct);

            return (
              <div key={item.id} style={{ marginBottom: 16 }}>
                {/* Label row */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: color }} />
                    <span style={{ fontSize: 12, fontWeight: 600, color: "#18170F" }}>{item.name}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 10, color: "#9E9C93" }}>{label}</span>
                    <span style={{ fontSize: 10, fontWeight: 700, color, fontFamily: "'DM Mono', monospace" }}>{pct}%</span>
                    {item.startDate && item.endDate && (
                      <span style={{ fontSize: 10, color: "#9E9C93" }}>
                        {new Date(item.startDate).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                        {" – "}
                        {new Date(item.endDate).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                      </span>
                    )}
                  </div>
                </div>

                {/* Bar track */}
                <div style={{ position: "relative", height: 20 }}>
                  {/* Track */}
                  <div style={{ position: "absolute", top: 4, left: 0, right: 0, height: 12, background: "#F4F2EC", borderRadius: 6 }} />
                  {/* Planned bar */}
                  {width > 0 && (
                    <div style={{
                      position: "absolute", top: 4, height: 12, left: `${startPct}%`, width: `${width}%`,
                      border: `2px dashed ${color}`, borderRadius: 6, background: "transparent", opacity: 0.45,
                    }} />
                  )}
                  {/* Realized bar */}
                  {width > 0 && pct > 0 && (
                    <div style={{
                      position: "absolute", top: 4, height: 12,
                      left: `${startPct}%`, width: `${(width * pct) / 100}%`,
                      background: color, borderRadius: 6, opacity: 0.85,
                    }} />
                  )}
                  {/* Milestone diamond at end */}
                  <svg style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", overflow: "visible", pointerEvents: "none" }}>
                    <Diamond
                      x={(endPct / 100) * 100 * (window.innerWidth > 0 ? 1 : 1)}
                      y={10}
                      color={color}
                    />
                  </svg>
                  {/* Today line */}
                  {todayPct > 0 && todayPct < 100 && (
                    <div style={{ position: "absolute", top: 0, left: `${todayPct}%`, width: 1, height: "100%", background: "#DC2626", opacity: 0.5 }} />
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "8px 24px", borderTop: "1px solid #E5E2D9", background: "#F8F7F3" }}>
        {[["#059669","Complete"],["#2563EB","In progress"],["#9CA3AF","Upcoming"]].map(([c, l]) => (
          <span key={l} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10, color: "#5C5A52" }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: c as string }} />{l}
          </span>
        ))}
        <span style={{ fontSize: 10, color: "#9E9C93", marginLeft: "auto" }}>
          {new Date(projectStart).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
          {" — "}
          {new Date(projectEnd).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
        </span>
      </div>
    </div>
  );
}
