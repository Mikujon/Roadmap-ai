"use client";
import { useState } from "react";

interface PhaseRow {
  id: string;
  name: string;
  startDate: string | null;
  endDate: string | null;
  status: string;
  pct: number;
}
interface SprintRow {
  id: string;
  name: string;
  startDate: string | null;
  endDate: string | null;
  status: string;
  phaseId?: string | null;
  features: { id: string; title: string; status: string }[];
}
interface Dependency {
  fromId: string;
  toId: string;
}
interface Props {
  phases: PhaseRow[];
  sprints: SprintRow[];
  features?: { id: string; title: string; status: string; sprintId: string }[];
  dependencies?: Dependency[];
  projectStart: Date;
  projectEnd: Date;
}

type Zoom = "week" | "month" | "quarter";
const DAY_W: Record<Zoom, number> = { week: 36, month: 12, quarter: 4 };
const DAY_MS = 86400000;
const ROW_H = 34;
const LABEL_W = 210;

function barColor(status: string) {
  if (status === "DONE")     return "#059669";
  if (status === "ACTIVE")   return "#2563EB";
  if (status === "BLOCKED")  return "#DC2626";
  return "#9CA3AF";
}

function genHeaders(zoom: Zoom, projectStart: Date, projectEnd: Date, dayW: number) {
  const headers: { label: string; offset: number; width: number }[] = [];
  if (zoom === "week") {
    const ms0 = projectStart.getTime();
    let cur = new Date(projectStart);
    cur.setDate(cur.getDate() - ((cur.getDay() + 6) % 7)); // Monday
    while (cur.getTime() < projectEnd.getTime()) {
      const off = Math.max(0, (cur.getTime() - ms0) / DAY_MS * dayW);
      const wn  = Math.ceil((cur.getTime() - new Date(cur.getFullYear(), 0, 1).getTime()) / (7 * DAY_MS)) + 1;
      headers.push({ label: `W${wn} ${cur.toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}`, offset: off, width: 7 * dayW });
      cur.setDate(cur.getDate() + 7);
    }
  } else if (zoom === "month") {
    let cur = new Date(projectStart.getFullYear(), projectStart.getMonth(), 1);
    while (cur.getTime() < projectEnd.getTime()) {
      const off = Math.max(0, (cur.getTime() - projectStart.getTime()) / DAY_MS * dayW);
      const days = new Date(cur.getFullYear(), cur.getMonth() + 1, 0).getDate();
      headers.push({ label: cur.toLocaleDateString("en-GB", { month: "short", year: "2-digit" }), offset: off, width: days * dayW });
      cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
    }
  } else {
    const startQ = Math.floor(projectStart.getMonth() / 3);
    let y = projectStart.getFullYear(), q = startQ;
    for (let i = 0; i < 12; i++) {
      const qStart = new Date(y, q * 3, 1);
      if (qStart.getTime() > projectEnd.getTime()) break;
      const qEnd = new Date(y, q * 3 + 3, 0);
      const off  = Math.max(0, (qStart.getTime() - projectStart.getTime()) / DAY_MS * dayW);
      const days = (qEnd.getTime() - qStart.getTime()) / DAY_MS + 1;
      headers.push({ label: `Q${q + 1} ${y}`, offset: off, width: days * dayW });
      q++; if (q > 3) { q = 0; y++; }
    }
  }
  return headers;
}

export default function GanttView({ phases, sprints, dependencies = [], projectStart, projectEnd }: Props) {
  const [zoom, setZoom]           = useState<Zoom>("month");
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const dayW    = DAY_W[zoom];
  const totalMs = projectEnd.getTime() - projectStart.getTime();
  const totalD  = Math.max(1, totalMs / DAY_MS);
  const totalW  = totalD * dayW;
  const todayOff = Math.min(totalW, Math.max(0, (Date.now() - projectStart.getTime()) / DAY_MS * dayW));
  const headers  = genHeaders(zoom, projectStart, projectEnd, dayW);

  // Build ordered rows
  type Row = { type: "phase"; phase: PhaseRow } | { type: "sprint"; sprint: SprintRow };
  const rows: Row[] = [];
  for (const ph of phases) {
    rows.push({ type: "phase", phase: ph });
    if (!collapsed.has(ph.id)) {
      sprints.filter(s => s.phaseId === ph.id).forEach(s => rows.push({ type: "sprint", sprint: s }));
    }
  }
  sprints.filter(s => !s.phaseId).forEach(s => rows.push({ type: "sprint", sprint: s }));

  const totalH = (rows.length + 1) * ROW_H; // +1 for header

  function barProps(startIso: string | null, endIso: string | null) {
    if (!startIso || !endIso) return null;
    const s = new Date(startIso).getTime();
    const e = new Date(endIso).getTime();
    const left  = Math.max(0, (s - projectStart.getTime()) / DAY_MS * dayW);
    const width = Math.max(6, (e - s) / DAY_MS * dayW);
    return { left, width };
  }

  function togglePhase(id: string) {
    setCollapsed(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  return (
    <div style={{ fontFamily: "'DM Sans', system-ui, sans-serif", background: "#fff", border: "1px solid #E5E2D9", borderRadius: 12, overflow: "hidden" }}>
      {/* Toolbar */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderBottom: "1px solid #E5E2D9" }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: "#18170F", flex: 1 }}>Gantt chart</span>
        <div style={{ display: "flex", gap: 2, background: "#F4F2EC", border: "1px solid #E5E2D9", borderRadius: 8, padding: 3 }}>
          {(["week", "month", "quarter"] as Zoom[]).map(z => (
            <button key={z} onClick={() => setZoom(z)} style={{
              fontSize: 10, fontWeight: 600, padding: "3px 9px", borderRadius: 5, border: "none",
              cursor: "pointer", fontFamily: "inherit",
              background: zoom === z ? "#18170F" : "transparent",
              color: zoom === z ? "#fff" : "#5C5A52",
            }}>
              {z.charAt(0).toUpperCase() + z.slice(1)}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 10, color: "#9E9C93" }}>
          {[["#059669","Done"],["#2563EB","Active"],["#9CA3AF","Upcoming"],["#DC2626","Blocked"]].map(([c,l]) => (
            <span key={l} style={{ display: "flex", alignItems: "center", gap: 3 }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: c as string, flexShrink: 0 }} />{l}
            </span>
          ))}
        </div>
      </div>

      {/* Body */}
      <div style={{ display: "flex" }}>
        {/* Left labels */}
        <div style={{ width: LABEL_W, flexShrink: 0, borderRight: "1px solid #E5E2D9" }}>
          <div style={{ height: ROW_H, borderBottom: "1px solid #E5E2D9", background: "#F8F7F3" }} />
          {rows.map((row, i) => {
            if (row.type === "phase") {
              const isOpen = !collapsed.has(row.phase.id);
              return (
                <div key={row.phase.id} onClick={() => togglePhase(row.phase.id)} style={{
                  height: ROW_H, display: "flex", alignItems: "center", gap: 6,
                  padding: "0 10px", background: "#F8F7F3", borderBottom: "1px solid #E5E2D9",
                  cursor: "pointer", userSelect: "none",
                }}>
                  <span style={{ fontSize: 9, color: "#9E9C93", width: 10, flexShrink: 0 }}>{isOpen ? "▼" : "▶"}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#18170F", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.phase.name}</span>
                  <span style={{ marginLeft: "auto", fontSize: 9, fontWeight: 700, color: "#9E9C93" }}>{row.phase.pct}%</span>
                </div>
              );
            }
            return (
              <div key={row.sprint.id} style={{
                height: ROW_H, display: "flex", alignItems: "center",
                padding: "0 10px 0 26px", borderBottom: "1px solid #F0EEE8",
                background: i % 2 === 0 ? "#fff" : "#FAFAF9",
              }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: barColor(row.sprint.status), flexShrink: 0, marginRight: 7 }} />
                <span style={{ fontSize: 11, color: "#5C5A52", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.sprint.name}</span>
              </div>
            );
          })}
        </div>

        {/* Right: scrollable timeline */}
        <div style={{ flex: 1, overflowX: "auto" }}>
          <div style={{ position: "relative", minWidth: totalW }}>
            {/* Date header */}
            <div style={{ height: ROW_H, position: "relative", background: "#F8F7F3", borderBottom: "1px solid #E5E2D9" }}>
              {headers.map((h, i) => (
                <div key={i} style={{ position: "absolute", left: h.offset, width: h.width, top: 0, bottom: 0, display: "flex", alignItems: "center", paddingLeft: 5, borderRight: "1px solid #E5E2D9", overflow: "hidden" }}>
                  <span style={{ fontSize: 9, fontWeight: 700, color: "#9E9C93", textTransform: "uppercase", letterSpacing: ".04em", whiteSpace: "nowrap" }}>{h.label}</span>
                </div>
              ))}
            </div>

            {/* Row bars */}
            {rows.map((row, i) => {
              const isPhase = row.type === "phase";
              const bg = isPhase ? "#F8F7F3" : (i % 2 === 0 ? "#fff" : "#FAFAF9");
              const bp = isPhase
                ? barProps(row.phase.startDate, row.phase.endDate)
                : barProps(row.sprint.startDate, row.sprint.endDate);
              const color = isPhase ? "#006D6B" : barColor(row.type === "sprint" ? row.sprint.status : "");
              const label = row.type === "sprint"
                ? `${row.sprint.features.filter(f => f.status === "DONE").length}/${row.sprint.features.length}`
                : "";

              return (
                <div key={i} style={{ height: ROW_H, position: "relative", background: bg, borderBottom: isPhase ? "1px solid #E5E2D9" : "1px solid #F0EEE8" }}>
                  {/* Grid lines */}
                  {headers.map((h, hi) => (
                    <div key={hi} style={{ position: "absolute", left: h.offset + h.width - 1, top: 0, bottom: 0, width: 1, background: "#F0EEE8", pointerEvents: "none" }} />
                  ))}
                  {/* Bar */}
                  {bp && (
                    <div style={{
                      position: "absolute", top: 7, height: ROW_H - 14,
                      left: bp.left, width: bp.width,
                      background: color, borderRadius: 4, opacity: isPhase ? 0.35 : 1,
                      display: "flex", alignItems: "center", paddingLeft: 5, overflow: "hidden",
                    }}>
                      {bp.width > 32 && (
                        <span style={{ fontSize: 9, fontWeight: 700, color: "#fff", whiteSpace: "nowrap" }}>{label}</span>
                      )}
                    </div>
                  )}
                  {/* Progress overlay for phases */}
                  {isPhase && bp && row.phase.pct > 0 && (
                    <div style={{
                      position: "absolute", top: 7, height: ROW_H - 14,
                      left: bp.left, width: (bp.width * row.phase.pct) / 100,
                      background: "#006D6B", borderRadius: 4, opacity: 0.6,
                    }} />
                  )}
                </div>
              );
            })}

            {/* Today line */}
            {todayOff > 0 && todayOff < totalW && (
              <div style={{ position: "absolute", top: 0, left: todayOff, width: 2, height: totalH, background: "#DC2626", opacity: 0.7, pointerEvents: "none", zIndex: 5 }}>
                <div style={{ position: "absolute", top: 2, left: -14, fontSize: 8, fontWeight: 800, color: "#fff", background: "#DC2626", borderRadius: 3, padding: "1px 4px", whiteSpace: "nowrap" }}>
                  TODAY
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
