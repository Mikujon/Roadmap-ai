"use client";
import { useState } from "react";
 
type Status = "TODO" | "IN_PROGRESS" | "DONE" | "BLOCKED";
type SprintStatus = "UPCOMING" | "ACTIVE" | "DONE";
type Priority = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
 
const STATUS_META: Record<Status, { label: string; color: string; bg: string; border: string; icon: string }> = {
  TODO:        { label: "To Do",       color: "#64748B", bg: "#F8FAFC", border: "#E2E8F0", icon: "○" },
  IN_PROGRESS: { label: "In Progress", color: "#2563EB", bg: "#EFF6FF", border: "#BFDBFE", icon: "◐" },
  DONE:        { label: "Done",        color: "#059669", bg: "#ECFDF5", border: "#A7F3D0", icon: "✓" },
  BLOCKED:     { label: "Blocked",     color: "#DC2626", bg: "#FEF2F2", border: "#FECACA", icon: "✕" },
};
const SPRINT_STATUS: Record<SprintStatus, { label: string; color: string; bg: string }> = {
  UPCOMING: { label: "Upcoming", color: "#64748B", bg: "#F8FAFC" },
  ACTIVE:   { label: "Active",   color: "#2563EB", bg: "#EFF6FF" },
  DONE:     { label: "Done",     color: "#059669", bg: "#ECFDF5" },
};
const PRIORITY_COLOR: Record<Priority, string> = {
  CRITICAL: "#DC2626", HIGH: "#EA580C", MEDIUM: "#D97706", LOW: "#059669",
};
 
export default function BoardView({
  phaseGroups, expanded, setExpanded, updateFeature, updateSprint,
  canEdit, search, onOpenNote, allF, addFeatureDep, removeFeatureDep,
  projectStart, projectEnd
}: any) {
  const [viewMode, setViewMode] = useState<"cards" | "calendar">("cards");
 
  const allSprints = Object.values(phaseGroups).flatMap(({ sprints }: any) => sprints) as any[];
 
  return (
    <div>
      {/* View toggle */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
        <span style={{ fontSize: 11, color: "#94A3B8", fontWeight: 600 }}>View:</span>
        {([
          { key: "cards",    icon: "▦", label: "Board" },
          { key: "calendar", icon: "▦", label: "Calendar" },
        ] as const).map(v => (
          <button key={v.key} onClick={() => setViewMode(v.key)} style={{
            padding: "6px 16px", borderRadius: 8, fontSize: 12, fontWeight: 600,
            background: viewMode === v.key ? "#006D6B" : "#fff",
            color: viewMode === v.key ? "#fff" : "#64748B",
            border: `1.5px solid ${viewMode === v.key ? "#006D6B" : "#E2E8F0"}`,
            cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s",
          }}>{v.label}</button>
        ))}
      </div>
 
      {viewMode === "cards" && (
        <CardsView
          phaseGroups={phaseGroups} expanded={expanded} setExpanded={setExpanded}
          updateFeature={updateFeature} updateSprint={updateSprint}
          canEdit={canEdit} search={search} onOpenNote={onOpenNote}
          allF={allF} addFeatureDep={addFeatureDep} removeFeatureDep={removeFeatureDep}
        />
      )}
      {viewMode === "calendar" && (
        <CalendarView
          allSprints={allSprints} phaseGroups={phaseGroups}
          updateFeature={updateFeature} canEdit={canEdit} onOpenNote={onOpenNote}
        />
      )}
    </div>
  );
}
 
// ─── CARDS VIEW ───────────────────────────────────────────────────────────────
function CardsView({ phaseGroups, expanded, setExpanded, updateFeature, updateSprint, canEdit, search, onOpenNote, allF, addFeatureDep, removeFeatureDep }: any) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
      {Object.values(phaseGroups).map(({ phase: ph, sprints }: any) => {
        if (!sprints.length) return null;
        const phF = sprints.flatMap((s: any) => s.features);
        const pct = phF.length ? Math.round((phF.filter((f: any) => f.status === "DONE").length / phF.length) * 100) : 0;
        return (
          <div key={ph.id}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: ph.accent }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: ph.accent }}>PHASE {ph.num}</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: "#0F172A" }}>{ph.sub || ph.label}</span>
              <span style={{ fontSize: 11, color: ph.accent, background: ph.accent + "15", padding: "2px 10px", borderRadius: 20, fontWeight: 600 }}>{pct}%</span>
              <div style={{ flex: 1, height: 1, background: "#E2E8F0" }} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(320px,1fr))", gap: 14 }}>
              {sprints.map((sprint: any) => (
                <SprintCard
                  key={sprint.id} sprint={sprint} accent={ph.accent}
                  expanded={!!expanded[sprint.id]}
                  onToggle={() => setExpanded((e: any) => ({ ...e, [sprint.id]: !e[sprint.id] }))}
                  updateFeature={updateFeature} updateSprint={updateSprint}
                  canEdit={canEdit} search={search} onOpenNote={onOpenNote}
                  allF={allF} addFeatureDep={addFeatureDep} removeFeatureDep={removeFeatureDep}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
 
// ─── SPRINT CARD ──────────────────────────────────────────────────────────────
function SprintCard({ sprint, accent, expanded, onToggle, updateFeature, updateSprint, canEdit, search, onOpenNote, allF, addFeatureDep, removeFeatureDep }: any) {
  const sm = SPRINT_STATUS[sprint.status as SprintStatus];
  const total   = sprint.features.length;
  const done    = sprint.features.filter((f: any) => f.status === "DONE").length;
  const blocked = sprint.features.filter((f: any) => f.status === "BLOCKED").length;
  const pct     = total ? Math.round((done / total) * 100) : 0;
  const isAtRisk = blocked >= 2 || (blocked > 0 && sprint.status === "ACTIVE");
  const visF    = sprint.features.filter((f: any) => !search || f.title.toLowerCase().includes(search.toLowerCase()));
  const NEXT: Record<SprintStatus, SprintStatus | null> = { UPCOMING: "ACTIVE", ACTIVE: null, DONE: null };
 
  return (
    <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #E2E8F0", overflow: "hidden", borderTop: `3px solid ${isAtRisk ? "#DC2626" : sprint.status === "ACTIVE" ? accent : sprint.status === "DONE" ? "#059669" : "#E2E8F0"}` }}>
      <div style={{ padding: "14px 16px", cursor: "pointer" }} onClick={onToggle}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4 }}>
              <span style={{ fontFamily: "monospace", fontSize: 10, color: accent, fontWeight: 700 }}>{sprint.num}</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#0F172A" }}>{sprint.name}</span>
              {isAtRisk && <span style={{ fontSize: 9, color: "#DC2626", background: "#FEF2F2", border: "1px solid #FECACA", padding: "1px 6px", borderRadius: 4, fontWeight: 700 }}>⚠ AT RISK</span>}
            </div>
            <p style={{ fontSize: 11, color: "#94A3B8", lineHeight: 1.5 }}>{sprint.goal}</p>
            {(sprint.startDate || sprint.endDate) && (
              <div style={{ fontSize: 10, color: "#CBD5E1", marginTop: 4 }}>
                {sprint.startDate && new Date(sprint.startDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}
                {sprint.startDate && sprint.endDate && " → "}
                {sprint.endDate && new Date(sprint.endDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}
              </div>
            )}
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
            <span style={{ fontSize: 10, color: sm.color, background: sm.bg, padding: "2px 8px", borderRadius: 6, fontWeight: 600 }}>{sm.label}</span>
            {canEdit && NEXT[sprint.status as SprintStatus] && (
              <button onClick={e => { e.stopPropagation(); updateSprint(sprint.id, { status: NEXT[sprint.status as SprintStatus] }); }} style={{ fontSize: 10, color: "#64748B", background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 6, padding: "2px 8px", cursor: "pointer", fontFamily: "inherit" }}>
                → {NEXT[sprint.status as SprintStatus]}
              </button>
            )}
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
          <span style={{ fontSize: 11, color: "#94A3B8" }}>{done}/{total}{blocked > 0 && <span style={{ color: "#DC2626" }}> · {blocked} blocked</span>}</span>
          <span style={{ fontSize: 11, fontWeight: 700, color: pct === 100 ? "#059669" : "#0F172A" }}>{pct}%</span>
        </div>
        <div style={{ height: 4, background: "#F1F5F9", borderRadius: 2, overflow: "hidden" }}>
          <div style={{ height: "100%", width: pct + "%", background: pct === 100 ? "#059669" : accent, borderRadius: 2 }} />
        </div>
        <div style={{ textAlign: "right", fontSize: 10, color: "#CBD5E1", marginTop: 4 }}>{expanded ? "▲" : "▼"}</div>
      </div>
      {expanded && (
        <div style={{ borderTop: "1px solid #F1F5F9", padding: "10px 12px", display: "flex", flexDirection: "column", gap: 4 }}>
          {visF.map((f: any) => (
            <FeatureRow key={f.id} feature={f} onUpdate={(patch: any) => updateFeature(f.id, patch)} canEdit={canEdit} onOpenNote={() => onOpenNote(f)} allF={allF} addFeatureDep={addFeatureDep} removeFeatureDep={removeFeatureDep} />
          ))}
        </div>
      )}
    </div>
  );
}
 
// ─── FEATURE ROW ──────────────────────────────────────────────────────────────
function FeatureRow({ feature, onUpdate, canEdit, onOpenNote, allF, addFeatureDep, removeFeatureDep }: any) {
  const sm = STATUS_META[feature.status as Status];
  const [showDeps, setShowDeps] = useState(false);
  const blockerTitles = (feature.dependsOn ?? []).map((d: any) => allF.find((f: any) => f.id === d.dependsOnId)?.title ?? d.dependsOnId);
 
  return (
    <div style={{ borderRadius: 8, overflow: "hidden", border: "1px solid #F1F5F9" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", background: "#F8FAFC" }}>
        <span style={{ fontSize: 11, color: sm.color, minWidth: 14 }}>{sm.icon}</span>
        <span style={{ flex: 1, fontSize: 12, color: feature.status === "DONE" ? "#CBD5E1" : "#0F172A", textDecoration: feature.status === "DONE" ? "line-through" : "none", fontWeight: 500 }}>{feature.title}</span>
        {feature.module && <span style={{ fontSize: 9, color: "#94A3B8", background: "#F1F5F9", padding: "1px 6px", borderRadius: 4, fontWeight: 600 }}>{feature.module}</span>}
        {blockerTitles.length > 0 && <span style={{ fontSize: 9, color: "#EA580C", fontWeight: 600 }}>⬡{blockerTitles.length}</span>}
        {feature.notes && <span style={{ fontSize: 10, color: "#2563EB" }}>📝</span>}
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: PRIORITY_COLOR[feature.priority as Priority], flexShrink: 0 }} />
        {canEdit && <button onClick={() => setShowDeps(s => !s)} style={{ background: "none", border: "none", color: "#CBD5E1", cursor: "pointer", fontSize: 11, padding: "0 2px" }}>⬡</button>}
        <button onClick={onOpenNote} style={{ background: "none", border: "none", color: "#CBD5E1", cursor: "pointer", fontSize: 12, padding: "0 2px" }}>✎</button>
        {canEdit ? (
          <select value={feature.status} onChange={e => onUpdate({ status: e.target.value })} style={{ background: sm.bg, color: sm.color, border: `1px solid ${sm.border}`, borderRadius: 6, fontSize: 10, padding: "2px 4px", outline: "none", cursor: "pointer", fontFamily: "inherit", fontWeight: 600 }}>
            {Object.entries(STATUS_META).map(([v, m]) => <option key={v} value={v}>{m.label}</option>)}
          </select>
        ) : <span style={{ fontSize: 10, color: sm.color, background: sm.bg, border: `1px solid ${sm.border}`, padding: "1px 6px", borderRadius: 4, fontWeight: 600 }}>{sm.label}</span>}
      </div>
      {showDeps && canEdit && (
        <div style={{ padding: "8px 12px", borderTop: "1px solid #F1F5F9", background: "#FAFBFC" }}>
          <div style={{ fontSize: 10, color: "#94A3B8", marginBottom: 6, fontWeight: 600 }}>Depends on:</div>
          {(feature.dependsOn ?? []).map((d: any, i: number) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
              <span style={{ fontSize: 10, color: "#EA580C" }}>⬡</span>
              <span style={{ fontSize: 11, flex: 1, color: "#475569" }}>{blockerTitles[i]}</span>
              <button onClick={() => removeFeatureDep(feature.id, d.dependsOnId)} style={{ fontSize: 10, color: "#DC2626", background: "none", border: "none", cursor: "pointer" }}>✕</button>
            </div>
          ))}
          <select onChange={e => { if (e.target.value) { addFeatureDep(feature.id, e.target.value); e.target.value = ""; } }} style={{ background: "#F8FAFC", border: "1.5px solid #E2E8F0", borderRadius: 8, padding: "6px 10px", color: "#0F172A", fontSize: 12, fontFamily: "inherit", outline: "none", width: "100%", marginTop: 4 }}>
            <option value="">+ Add dependency…</option>
            {allF.filter((f: any) => f.id !== feature.id && !(feature.dependsOn ?? []).some((d: any) => d.dependsOnId === f.id)).map((f: any) => <option key={f.id} value={f.id}>{f.sprintNum} — {f.title}</option>)}
          </select>
        </div>
      )}
    </div>
  );
}
 
// ─── CALENDAR VIEW ────────────────────────────────────────────────────────────
function CalendarView({ allSprints, phaseGroups, updateFeature, canEdit, onOpenNote }: any) {
  const [expandedSprint, setExpandedSprint] = useState<string | null>(null);
 
  // Find date range from sprints
  const dates = allSprints.flatMap((s: any) => [s.startDate, s.endDate].filter(Boolean).map((d: string) => new Date(d)));
  if (dates.length === 0) return (
    <div style={{ textAlign: "center", padding: 48, color: "#94A3B8", background: "#fff", border: "1px solid #E2E8F0", borderRadius: 14 }}>
      <div style={{ fontSize: 32, marginBottom: 12 }}>📅</div>
      <div style={{ fontSize: 14, fontWeight: 600, color: "#0F172A", marginBottom: 6 }}>No sprint dates configured</div>
      <div style={{ fontSize: 12 }}>Add start and end dates to your sprints to see the calendar view.</div>
    </div>
  );
 
  const minDate = new Date(Math.min(...dates.map((d: Date) => d.getTime())));
  const maxDate = new Date(Math.max(...dates.map((d: Date) => d.getTime())));
 
  // Generate months
  const months: Date[] = [];
  const cur = new Date(minDate.getFullYear(), minDate.getMonth(), 1);
  while (cur <= maxDate) { months.push(new Date(cur)); cur.setMonth(cur.getMonth() + 1); }
 
  // Get phase accent for sprint
  const getAccent = (sprintId: string) => {
    for (const { phase, sprints } of Object.values(phaseGroups) as any[]) {
      if (sprints.some((s: any) => s.id === sprintId)) return phase.accent;
    }
    return "#006D6B";
  };
 
  // Distribute features across sprint days based on effort
  const getFeatureDay = (feature: any, sprint: any) => {
    if (!sprint.startDate || !sprint.endDate) return null;
    const sprintFeatures = sprint.features;
    const idx = sprintFeatures.findIndex((f: any) => f.id === feature.id);
    if (idx === -1) return null;
    const sprintStart = new Date(sprint.startDate);
    const sprintEnd   = new Date(sprint.endDate);
    const workDays    = Math.max(1, Math.round((sprintEnd.getTime() - sprintStart.getTime()) / 86400000));
    const totalHours  = sprintFeatures.reduce((s: number, f: any) => s + (f.estimatedHours || 1), 0);
    let elapsed = 0;
    for (let i = 0; i < idx; i++) elapsed += sprintFeatures[i].estimatedHours || 1;
    const dayOffset = Math.floor((elapsed / totalHours) * workDays);
    const d = new Date(sprintStart);
    d.setDate(d.getDate() + dayOffset);
    return d;
  };
 
  const expandedSprintData = expandedSprint ? allSprints.find((s: any) => s.id === expandedSprint) : null;
 
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
 
      {/* Expanded sprint drill-down */}
      {expandedSprintData && (
        <div style={{ background: "#fff", border: `1px solid ${getAccent(expandedSprintData.id)}30`, borderLeft: `4px solid ${getAccent(expandedSprintData.id)}`, borderRadius: 14, overflow: "hidden" }}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid #F1F5F9", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <span style={{ fontFamily: "monospace", fontSize: 11, color: getAccent(expandedSprintData.id), fontWeight: 700 }}>{expandedSprintData.num}</span>
                <span style={{ fontSize: 15, fontWeight: 700, color: "#0F172A" }}>{expandedSprintData.name}</span>
                <span style={{ fontSize: 10, color: SPRINT_STATUS[expandedSprintData.status as SprintStatus].color, background: SPRINT_STATUS[expandedSprintData.status as SprintStatus].bg, padding: "2px 8px", borderRadius: 6, fontWeight: 600 }}>
                  {SPRINT_STATUS[expandedSprintData.status as SprintStatus].label}
                </span>
              </div>
              <div style={{ fontSize: 12, color: "#94A3B8" }}>
                {expandedSprintData.startDate && new Date(expandedSprintData.startDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}
                {" → "}
                {expandedSprintData.endDate && new Date(expandedSprintData.endDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}
                {" · "}{expandedSprintData.features.length} tasks
              </div>
            </div>
            <button onClick={() => setExpandedSprint(null)} style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 8, padding: "6px 14px", fontSize: 12, color: "#64748B", cursor: "pointer", fontFamily: "inherit", fontWeight: 600 }}>
              Close ✕
            </button>
          </div>
          <div style={{ padding: "16px 20px" }}>
            {/* Feature list by day */}
            {(() => {
              const byDay: Record<string, any[]> = {};
              expandedSprintData.features.forEach((f: any) => {
                const day = getFeatureDay(f, expandedSprintData);
                const key = day ? day.toLocaleDateString("en-GB", { weekday: "short", day: "2-digit", month: "short" }) : "No date";
                if (!byDay[key]) byDay[key] = [];
                byDay[key].push(f);
              });
              return Object.entries(byDay).map(([day, features]: any) => (
                <div key={day} style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#94A3B8", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 8, display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: getAccent(expandedSprintData.id) }} />
                    {day}
                    <div style={{ flex: 1, height: 1, background: "#F1F5F9" }} />
                    <span style={{ fontSize: 10, fontWeight: 500 }}>{features.reduce((s: number, f: any) => s + (f.estimatedHours || 0), 0)}h</span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    {features.map((f: any) => {
                      const sm = STATUS_META[f.status as Status];
                      return (
                        <div key={f.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 14px", background: "#F8FAFC", border: "1px solid #F1F5F9", borderRadius: 8 }}>
                          <span style={{ fontSize: 12, color: sm.color }}>{sm.icon}</span>
                          <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: f.status === "DONE" ? "#CBD5E1" : "#0F172A", textDecoration: f.status === "DONE" ? "line-through" : "none" }}>{f.title}</span>
                          {f.module && <span style={{ fontSize: 10, color: "#94A3B8", background: "#F1F5F9", padding: "1px 6px", borderRadius: 4 }}>{f.module}</span>}
                          {f.estimatedHours > 0 && <span style={{ fontSize: 11, color: "#2563EB", fontWeight: 600 }}>{f.estimatedHours}h</span>}
                          <span style={{ width: 6, height: 6, borderRadius: "50%", background: PRIORITY_COLOR[f.priority as Priority] }} />
                          {canEdit ? (
                            <select value={f.status} onChange={e => updateFeature(f.id, { status: e.target.value })} style={{ background: sm.bg, color: sm.color, border: `1px solid ${sm.border}`, borderRadius: 6, fontSize: 10, padding: "2px 6px", outline: "none", fontFamily: "inherit", fontWeight: 600 }}>
                              {Object.entries(STATUS_META).map(([v, m]) => <option key={v} value={v}>{m.label}</option>)}
                            </select>
                          ) : <span style={{ fontSize: 10, color: sm.color, background: sm.bg, padding: "1px 6px", borderRadius: 4, fontWeight: 600 }}>{sm.label}</span>}
                          <button onClick={() => onOpenNote(f)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, color: f.notes ? "#2563EB" : "#CBD5E1" }}>✎</button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ));
            })()}
          </div>
        </div>
      )}
 
      {/* Monthly calendars */}
      {months.map(month => {
        const monthName = month.toLocaleDateString("en-US", { month: "long", year: "numeric" });
        const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
        const firstDay    = new Date(month.getFullYear(), month.getMonth(), 1).getDay();
        const mStart = month.getTime();
        const mEnd   = new Date(month.getFullYear(), month.getMonth() + 1, 0).getTime();
 
        const monthSprints = allSprints.filter((s: any) => {
          if (!s.startDate && !s.endDate) return false;
          const sStart = s.startDate ? new Date(s.startDate).getTime() : mStart;
          const sEnd   = s.endDate   ? new Date(s.endDate).getTime()   : mEnd;
          return sStart <= mEnd && sEnd >= mStart;
        });
 
        if (monthSprints.length === 0) return null;
 
        const cells: (number | null)[] = Array(firstDay).fill(null);
        for (let d = 1; d <= daysInMonth; d++) cells.push(d);
        while (cells.length % 7 !== 0) cells.push(null);
 
        return (
          <div key={monthName} style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 14, overflow: "hidden" }}>
            {/* Header */}
            <div style={{ padding: "14px 20px", borderBottom: "1px solid #F1F5F9", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 15, fontWeight: 800, color: "#0F172A", letterSpacing: "-0.3px" }}>{monthName}</span>
              <span style={{ fontSize: 12, color: "#94A3B8" }}>{monthSprints.length} sprint{monthSprints.length !== 1 ? "s" : ""}</span>
            </div>
 
            {/* Sprint bars */}
            <div style={{ padding: "12px 20px", borderBottom: "1px solid #F1F5F9", display: "flex", flexDirection: "column", gap: 6 }}>
              {monthSprints.map((s: any) => {
                const accent   = getAccent(s.id);
                const sm       = SPRINT_STATUS[s.status as SprintStatus];
                const done     = s.features.filter((f: any) => f.status === "DONE").length;
                const pct      = s.features.length ? Math.round((done / s.features.length) * 100) : 0;
                const sStart   = s.startDate ? Math.max(new Date(s.startDate).getTime(), mStart) : mStart;
                const sEnd     = s.endDate   ? Math.min(new Date(s.endDate).getTime(), mEnd)     : mEnd;
                const mDur     = mEnd - mStart;
                const barLeft  = ((sStart - mStart) / mDur) * 100;
                const barWidth = Math.max(((sEnd - sStart) / mDur) * 100, 2);
                const isActive = s.status === "ACTIVE";
                const isExp    = expandedSprint === s.id;
 
                return (
                  <div key={s.id} style={{ display: "grid", gridTemplateColumns: "160px 1fr 80px", gap: 12, alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <div style={{ width: 6, height: 6, borderRadius: "50%", background: accent, flexShrink: 0 }} />
                      <span style={{ fontSize: 12, fontWeight: isActive ? 700 : 500, color: isActive ? "#0F172A" : "#64748B", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {s.num} {s.name}
                      </span>
                    </div>
                    <div
                      style={{ position: "relative", height: 26, background: "#F8FAFC", borderRadius: 6, overflow: "hidden", cursor: "pointer", border: isExp ? `1px solid ${accent}50` : "1px solid transparent" }}
                      onClick={() => setExpandedSprint(isExp ? null : s.id)}
                      title="Click to drill down"
                    >
                      <div style={{ position: "absolute", left: `${barLeft}%`, width: `${barWidth}%`, height: "100%", background: isActive ? `linear-gradient(90deg,${accent},${accent}bb)` : accent + "80", borderRadius: 4, display: "flex", alignItems: "center", paddingLeft: 8, gap: 6 }}>
                        <span style={{ fontSize: 10, color: "#fff", fontWeight: 700 }}>{pct}%</span>
                        <span style={{ fontSize: 9, color: "#fff", opacity: 0.8 }}>{isExp ? "▲" : "▼"}</span>
                      </div>
                    </div>
                    <span style={{ fontSize: 10, color: sm.color, background: sm.bg, border: `1px solid ${sm.color}20`, padding: "2px 8px", borderRadius: 6, fontWeight: 600, textAlign: "center" }}>{sm.label}</span>
                  </div>
                );
              })}
            </div>
 
            {/* Calendar grid */}
            <div style={{ padding: "12px 20px 16px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 2, marginBottom: 4 }}>
                {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d => (
                  <div key={d} style={{ textAlign: "center", fontSize: 10, fontWeight: 700, color: "#CBD5E1", padding: "4px 0" }}>{d}</div>
                ))}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 2 }}>
                {cells.map((day, i) => {
                  if (!day) return <div key={i} />;
                  const cellDate = new Date(month.getFullYear(), month.getMonth(), day);
                  const isToday  = cellDate.toDateString() === new Date().toDateString();
                  const isWeekend = cellDate.getDay() === 0 || cellDate.getDay() === 6;
 
                  // Features scheduled for this day
                  const dayFeatures: { feature: any; sprint: any; accent: string }[] = [];
                  monthSprints.forEach((s: any) => {
                    s.features.forEach((f: any) => {
                      const fd = getFeatureDay(f, s);
                      if (fd && fd.toDateString() === cellDate.toDateString()) {
                        dayFeatures.push({ feature: f, sprint: s, accent: getAccent(s.id) });
                      }
                    });
                  });
 
                  // Sprint start/end markers
                  const sprintStarts = monthSprints.filter((s: any) => s.startDate && new Date(s.startDate).toDateString() === cellDate.toDateString());
                  const sprintEnds   = monthSprints.filter((s: any) => s.endDate   && new Date(s.endDate).toDateString()   === cellDate.toDateString());
                  const activeOnDay  = monthSprints.filter((s: any) => {
                    if (!s.startDate || !s.endDate) return false;
                    return cellDate >= new Date(s.startDate) && cellDate <= new Date(s.endDate);
                  });
 
                  return (
                    <div key={i} style={{
                      minHeight: 56, borderRadius: 8, padding: "5px 6px",
                      background: isToday ? "#ECFDF5" : isWeekend ? "#FAFBFC" : "transparent",
                      border: isToday ? "1.5px solid #059669" : "1px solid transparent",
                    }}>
                      <div style={{ fontSize: 11, fontWeight: isToday ? 800 : 400, color: isToday ? "#059669" : isWeekend ? "#CBD5E1" : "#475569", marginBottom: 3 }}>{day}</div>
 
                      {/* Sprint start marker */}
                      {sprintStarts.map((s: any) => (
                        <div key={s.id} onClick={() => setExpandedSprint(expandedSprint === s.id ? null : s.id)} style={{ fontSize: 8, color: "#fff", background: getAccent(s.id), borderRadius: 3, padding: "1px 4px", marginBottom: 2, cursor: "pointer", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          ▶ {s.num}
                        </div>
                      ))}
 
                      {/* Sprint end marker */}
                      {sprintEnds.filter((s: any) => !sprintStarts.includes(s)).map((s: any) => (
                        <div key={s.id} onClick={() => setExpandedSprint(expandedSprint === s.id ? null : s.id)} style={{ fontSize: 8, color: "#fff", background: "#DC2626", borderRadius: 3, padding: "1px 4px", marginBottom: 2, cursor: "pointer", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          ■ {s.num}
                        </div>
                      ))}
 
                      {/* Active sprint bar */}
                      {activeOnDay.length > 0 && sprintStarts.length === 0 && sprintEnds.length === 0 && (
                        <div style={{ height: 2, borderRadius: 1, background: getAccent(activeOnDay[0].id) + "50", marginBottom: 2 }} />
                      )}
 
                      {/* Features for this day */}
                      {dayFeatures.slice(0, 2).map(({ feature: f, accent }) => {
                        const sm = STATUS_META[f.status as Status];
                        return (
                          <div key={f.id} style={{ fontSize: 8, color: sm.color, background: sm.bg, borderRadius: 3, padding: "1px 4px", marginBottom: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", cursor: "pointer", border: `1px solid ${sm.border}` }} title={f.title}>
                            {sm.icon} {f.title}
                          </div>
                        );
                      })}
                      {dayFeatures.length > 2 && (
                        <div style={{ fontSize: 8, color: "#94A3B8", padding: "1px 4px" }}>+{dayFeatures.length - 2} more</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}