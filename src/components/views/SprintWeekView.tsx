"use client";
import { useState } from "react";

interface Feature {
  id: string;
  title: string;
  status: string;
  priority: string;
  estimatedHours: number | null;
}

interface Sprint {
  id: string;
  name: string;
  startDate: string | null;
  endDate: string | null;
  status: string;
  features: Feature[];
}

interface Props {
  sprints: Sprint[];
}

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"];

function statusColor(s: string) {
  if (s === "DONE")        return "#059669";
  if (s === "IN_PROGRESS") return "#2563EB";
  if (s === "BLOCKED")     return "#DC2626";
  return "#9CA3AF";
}

function priorityBadge(p: string): React.CSSProperties {
  if (p === "CRITICAL") return { background: "#FEF2F2", color: "#991B1B", border: "1px solid #FECACA" };
  if (p === "HIGH")     return { background: "#FFFBEB", color: "#92400E", border: "1px solid #FDE68A" };
  if (p === "MEDIUM")   return { background: "#EFF6FF", color: "#1E3A8A", border: "1px solid #BFDBFE" };
  return { background: "#F8F7F3", color: "#5C5A52", border: "1px solid #E5E2D9" };
}

function getWeekDates(monday: Date): Date[] {
  return DAYS.map((_, i) => {
    const d = new Date(monday);
    d.setDate(d.getDate() + i);
    return d;
  });
}

function getMondayOf(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = (day + 6) % 7; // Mon=0
  d.setDate(d.getDate() - diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function assignFeaturesToDays(sprint: Sprint): Map<number, Feature[]> {
  const map = new Map<number, Feature[]>([
    [0, []], [1, []], [2, []], [3, []], [4, []],
  ]);
  if (!sprint.startDate || !sprint.endDate) {
    // distribute evenly if no dates
    sprint.features.forEach((f, i) => {
      const day = i % 5;
      map.get(day)!.push(f);
    });
    return map;
  }
  const totalMs = new Date(sprint.endDate).getTime() - new Date(sprint.startDate).getTime();
  const perFeature = totalMs / Math.max(1, sprint.features.length);
  sprint.features.forEach((f, i) => {
    const offset = i * perFeature;
    const date = new Date(new Date(sprint.startDate!).getTime() + offset);
    const dow = (date.getDay() + 6) % 7; // Mon=0
    const day = Math.min(4, Math.max(0, dow));
    map.get(day)!.push(f);
  });
  return map;
}

export default function SprintWeekView({ sprints }: Props) {
  const activeSprint = sprints.find(s => s.status === "ACTIVE") ?? sprints[0];
  const [selectedId, setSelectedId] = useState<string>(activeSprint?.id ?? "");

  const sprint = sprints.find(s => s.id === selectedId) ?? sprints[0];
  if (!sprint) {
    return (
      <div style={{ fontFamily: "'DM Sans', system-ui, sans-serif", background: "#fff", border: "1px solid #E5E2D9", borderRadius: 12, padding: "40px 24px", textAlign: "center", fontSize: 12, color: "#9E9C93" }}>
        No sprints available
      </div>
    );
  }

  const done   = sprint.features.filter(f => f.status === "DONE").length;
  const total  = sprint.features.length;
  const pct    = total > 0 ? Math.round((done / total) * 100) : 0;
  const blocked = sprint.features.filter(f => f.status === "BLOCKED");
  const totalHrs = sprint.features.reduce((s, f) => s + (f.estimatedHours ?? 0), 0);
  const doneHrs  = sprint.features.filter(f => f.status === "DONE").reduce((s, f) => s + (f.estimatedHours ?? 0), 0);

  const dayMap = assignFeaturesToDays(sprint);

  const today = new Date();
  const monday = sprint.startDate ? getMondayOf(new Date(sprint.startDate)) : getMondayOf(today);
  const weekDates = getWeekDates(monday);
  const todayDow = (today.getDay() + 6) % 7;

  return (
    <div style={{ fontFamily: "'DM Sans', system-ui, sans-serif", background: "#fff", border: "1px solid #E5E2D9", borderRadius: 12, overflow: "hidden" }}>
      {/* Toolbar */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderBottom: "1px solid #E5E2D9", background: "#F8F7F3", flexWrap: "wrap" }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: "#18170F" }}>Sprint week view</span>
        <select
          value={selectedId}
          onChange={e => setSelectedId(e.target.value)}
          style={{ fontSize: 11, padding: "3px 8px", border: "1px solid #E5E2D9", borderRadius: 6, background: "#fff", color: "#18170F", fontFamily: "inherit", cursor: "pointer" }}
        >
          {sprints.map(s => (
            <option key={s.id} value={s.id}>{s.name} {s.status === "ACTIVE" ? "●" : ""}</option>
          ))}
        </select>
        <div style={{ display: "flex", gap: 14, marginLeft: "auto", fontSize: 10 }}>
          <span style={{ color: "#9E9C93" }}>Velocity <strong style={{ color: "#18170F", fontFamily: "'DM Mono', monospace" }}>{doneHrs}/{totalHrs}h</strong></span>
          <span style={{ color: "#9E9C93" }}>Progress <strong style={{ color: pct >= 70 ? "#059669" : pct >= 30 ? "#D97706" : "#DC2626", fontFamily: "'DM Mono', monospace" }}>{pct}%</strong></span>
          {blocked.length > 0 && (
            <span style={{ color: "#DC2626", fontWeight: 700 }}>{blocked.length} blocked</span>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ padding: "8px 14px 0", background: "#F8F7F3", borderBottom: "1px solid #E5E2D9" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, fontSize: 10, color: "#9E9C93" }}>
          <span>{sprint.name}</span>
          <span>{done}/{total} tasks · {pct}%</span>
        </div>
        <div style={{ height: 5, background: "#E5E2D9", borderRadius: 99, overflow: "hidden", marginBottom: 8 }}>
          <div style={{ height: "100%", width: `${pct}%`, background: pct >= 70 ? "#059669" : "#2563EB", borderRadius: 99, transition: "width 0.3s" }} />
        </div>
      </div>

      <div style={{ display: "flex" }}>
        {/* Left: sprint summary */}
        <div style={{ width: 170, flexShrink: 0, borderRight: "1px solid #E5E2D9", padding: "10px 12px" }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#9E9C93", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 10 }}>Status</div>
          {[
            { label: "Done",        count: done,                                    color: "#059669" },
            { label: "In progress", count: sprint.features.filter(f=>f.status==="IN_PROGRESS").length, color: "#2563EB" },
            { label: "To do",       count: sprint.features.filter(f=>f.status==="TODO").length,        color: "#9CA3AF" },
            { label: "Blocked",     count: blocked.length,                           color: "#DC2626" },
          ].map(row => (
            <div key={row.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: row.color }} />
                <span style={{ fontSize: 10, color: "#5C5A52" }}>{row.label}</span>
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, color: row.color, fontFamily: "'DM Mono', monospace" }}>{row.count}</span>
            </div>
          ))}

          {blocked.length > 0 && (
            <>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#DC2626", textTransform: "uppercase", letterSpacing: ".06em", marginTop: 14, marginBottom: 8 }}>Blocked</div>
              {blocked.map(f => (
                <div key={f.id} style={{ fontSize: 10, color: "#991B1B", background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 5, padding: "4px 6px", marginBottom: 4, lineHeight: 1.3 }}>
                  {f.title.length > 28 ? f.title.slice(0, 28) + "…" : f.title}
                </div>
              ))}
            </>
          )}

          {sprint.startDate && sprint.endDate && (
            <>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#9E9C93", textTransform: "uppercase", letterSpacing: ".06em", marginTop: 14, marginBottom: 6 }}>Dates</div>
              <div style={{ fontSize: 10, color: "#5C5A52", lineHeight: 1.7 }}>
                <div>Start: {new Date(sprint.startDate).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</div>
                <div>End:   {new Date(sprint.endDate).toLocaleDateString("en-GB",   { day: "numeric", month: "short" })}</div>
              </div>
            </>
          )}
        </div>

        {/* Right: week grid */}
        <div style={{ flex: 1, overflowX: "auto" }}>
          {/* Day headers */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", borderBottom: "1px solid #E5E2D9" }}>
            {DAYS.map((d, i) => {
              const isToday = i === todayDow && sprint.status === "ACTIVE";
              const dateStr = weekDates[i].toLocaleDateString("en-GB", { day: "numeric", month: "short" });
              return (
                <div key={d} style={{
                  padding: "7px 10px", textAlign: "center",
                  background: isToday ? "#F0FDF4" : "#F8F7F3",
                  borderRight: i < 4 ? "1px solid #E5E2D9" : "none",
                }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: isToday ? "#059669" : "#5C5A52" }}>{d}</div>
                  <div style={{ fontSize: 9, color: isToday ? "#059669" : "#9E9C93" }}>{dateStr}</div>
                </div>
              );
            })}
          </div>

          {/* Task cells */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", minHeight: 180, alignItems: "start" }}>
            {DAYS.map((_, i) => {
              const isToday = i === todayDow && sprint.status === "ACTIVE";
              const tasks = dayMap.get(i) ?? [];
              return (
                <div key={i} style={{
                  padding: "8px 8px", minHeight: 120,
                  background: isToday ? "#FAFFFE" : "transparent",
                  borderRight: i < 4 ? "1px solid #F0EEE8" : "none",
                  borderTop: "none",
                }}>
                  {tasks.map(f => (
                    <div key={f.id} style={{
                      background: f.status === "BLOCKED" ? "#FEF2F2" : f.status === "DONE" ? "#F0FDF4" : "#fff",
                      border: `1px solid ${f.status === "BLOCKED" ? "#FECACA" : f.status === "DONE" ? "#BBF7D0" : "#E5E2D9"}`,
                      borderLeft: `3px solid ${statusColor(f.status)}`,
                      borderRadius: 6, padding: "5px 7px", marginBottom: 5,
                    }}>
                      <div style={{ fontSize: 10, fontWeight: 600, color: "#18170F", lineHeight: 1.3, marginBottom: 3 }}>
                        {f.title.length > 32 ? f.title.slice(0, 32) + "…" : f.title}
                      </div>
                      <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                        <span style={{ fontSize: 8, fontWeight: 700, padding: "1px 5px", borderRadius: 10, ...priorityBadge(f.priority) }}>
                          {f.priority}
                        </span>
                        {f.estimatedHours != null && f.estimatedHours > 0 && (
                          <span style={{ fontSize: 8, color: "#9E9C93" }}>{f.estimatedHours}h</span>
                        )}
                      </div>
                    </div>
                  ))}
                  {tasks.length === 0 && (
                    <div style={{ fontSize: 9, color: "#E5E2D9", textAlign: "center", paddingTop: 24 }}>—</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
