"use client";
import { useState, useRef } from "react";
 
type Status = "TODO" | "IN_PROGRESS" | "DONE" | "BLOCKED";
type SprintStatus = "UPCOMING" | "ACTIVE" | "DONE";
type Priority = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
 
const STATUS_META: Record<Status, { label: string; color: string; bg: string; border: string; icon: string }> = {
  TODO:        { label: "To Do",       color: "#5C5A52", bg: "#F8FAFC", border: "#E5E2D9", icon: "○" },
  IN_PROGRESS: { label: "In Progress", color: "#2563EB", bg: "#EFF6FF", border: "#BFDBFE", icon: "◐" },
  DONE:        { label: "Done",        color: "#059669", bg: "#ECFDF5", border: "#A7F3D0", icon: "✓" },
  BLOCKED:     { label: "Blocked",     color: "#DC2626", bg: "#FEF2F2", border: "#FECACA", icon: "✕" },
};
const SPRINT_STATUS: Record<SprintStatus, { label: string; color: string; bg: string }> = {
  UPCOMING: { label: "Upcoming", color: "#5C5A52", bg: "#F8FAFC" },
  ACTIVE:   { label: "Active",   color: "#2563EB", bg: "#EFF6FF" },
  DONE:     { label: "Done",     color: "#059669", bg: "#ECFDF5" },
};
const PRIORITY_COLOR: Record<Priority, string> = {
  CRITICAL: "#DC2626", HIGH: "#EA580C", MEDIUM: "#D97706", LOW: "#059669",
};
 
export default function BoardView({
  phaseGroups, expanded, setExpanded, updateFeature, updateSprint,
  canEdit, search, onOpenNote, onOpenDetail, allF, addFeatureDep, removeFeatureDep,
  projectStart, projectEnd
}: any) {
  const [viewMode, setViewMode] = useState<"cards" | "kanban" | "calendar">("cards");

  const allSprints = Object.values(phaseGroups).flatMap(({ sprints }: any) => sprints) as any[];

  return (
    <div>
      {/* View toggle */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
        <span style={{ fontSize: 11, color: "#9E9C93", fontWeight: 600 }}>View:</span>
        {([
          { key: "cards",    label: "Board"    },
          { key: "kanban",   label: "Kanban"   },
          { key: "calendar", label: "Calendar" },
        ] as const).map(v => (
          <button key={v.key} onClick={() => setViewMode(v.key)} style={{
            padding: "6px 16px", borderRadius: 8, fontSize: 12, fontWeight: 600,
            background: viewMode === v.key ? "#006D6B" : "#fff",
            color: viewMode === v.key ? "#fff" : "#5C5A52",
            border: `1.5px solid ${viewMode === v.key ? "#006D6B" : "#E5E2D9"}`,
            cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s",
          }}>{v.label}</button>
        ))}
      </div>

      {viewMode === "cards" && (
        <CardsView
          phaseGroups={phaseGroups} expanded={expanded} setExpanded={setExpanded}
          updateFeature={updateFeature} updateSprint={updateSprint}
          canEdit={canEdit} search={search} onOpenNote={onOpenNote} onOpenDetail={onOpenDetail}
          allF={allF} addFeatureDep={addFeatureDep} removeFeatureDep={removeFeatureDep}
        />
      )}
      {viewMode === "kanban" && (
        <KanbanView
          allF={allF} updateFeature={updateFeature}
          canEdit={canEdit} search={search} onOpenNote={onOpenNote} onOpenDetail={onOpenDetail}
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

// ─── KANBAN VIEW ──────────────────────────────────────────────────────────────
const KANBAN_COLS: { status: Status; label: string; color: string; bg: string; border: string }[] = [
  { status: "TODO",        label: "To Do",       color: "#5C5A52", bg: "#F8FAFC", border: "#E5E2D9" },
  { status: "IN_PROGRESS", label: "In Progress", color: "#2563EB", bg: "#EFF6FF", border: "#BFDBFE" },
  { status: "BLOCKED",     label: "Blocked",     color: "#DC2626", bg: "#FEF2F2", border: "#FECACA" },
  { status: "DONE",        label: "Done",        color: "#059669", bg: "#ECFDF5", border: "#A7F3D0" },
];

function KanbanView({ allF, updateFeature, canEdit, search, onOpenNote, onOpenDetail }: any) {
  const [dragOver, setDragOver] = useState<Status | null>(null);

  const filtered = search
    ? allF.filter((f: any) => f.title.toLowerCase().includes(search.toLowerCase()))
    : allF;

  const byStatus = (status: Status) => filtered.filter((f: any) => f.status === status);

  const handleDrop = (e: React.DragEvent, newStatus: Status) => {
    e.preventDefault();
    const featureId = e.dataTransfer.getData("featureId");
    if (featureId) updateFeature(featureId, { status: newStatus });
    setDragOver(null);
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, alignItems: "start" }}>
      {KANBAN_COLS.map(col => {
        const items = byStatus(col.status);
        const isOver = dragOver === col.status;
        return (
          <div
            key={col.status}
            onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; setDragOver(col.status); }}
            onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOver(null); }}
            onDrop={e => handleDrop(e, col.status)}
            style={{ background: isOver ? col.bg : "#F8FAFC", border: `1.5px solid ${isOver ? col.border : "#E5E2D9"}`, borderRadius: 12, minHeight: 200, transition: "all 0.15s" }}
          >
            {/* Column header */}
            <div style={{ padding: "12px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: `1px solid ${col.border}`, background: col.bg, borderRadius: "10px 10px 0 0" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: col.color }}>{STATUS_META[col.status].icon}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: col.color }}>{col.label}</span>
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, background: "#fff", color: col.color, border: `1px solid ${col.border}`, borderRadius: 20, padding: "1px 8px" }}>{items.length}</span>
            </div>

            {/* Cards */}
            <div style={{ padding: "10px 10px", display: "flex", flexDirection: "column", gap: 8 }}>
              {items.length === 0 && (
                <div style={{ textAlign: "center", padding: "24px 0", fontSize: 12, color: "#CCC9BF" }}>
                  {isOver ? "Drop here" : "Empty"}
                </div>
              )}
              {items.map((f: any) => (
                <KanbanCard
                  key={f.id} feature={f}
                  onUpdate={(patch: any) => updateFeature(f.id, patch)}
                  canEdit={canEdit}
                  onOpenNote={() => onOpenNote(f)}
                  onOpenDetail={() => onOpenDetail?.(f)}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function KanbanCard({ feature, onUpdate, canEdit, onOpenNote, onOpenDetail }: any) {
  const [isDragging, setIsDragging] = useState(false);
  const sm = STATUS_META[feature.status as Status];

  return (
    <div
      draggable={canEdit}
      onDragStart={e => { e.dataTransfer.setData("featureId", feature.id); e.dataTransfer.effectAllowed = "move"; setIsDragging(true); }}
      onDragEnd={() => setIsDragging(false)}
      style={{
        background: "#fff", border: "1px solid #E5E2D9", borderRadius: 10,
        padding: "12px 13px", cursor: canEdit ? "grab" : "default",
        opacity: isDragging ? 0.4 : 1,
        boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
        transition: "opacity 0.15s, box-shadow 0.15s",
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 12px rgba(0,0,0,0.08)"; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = "0 1px 4px rgba(0,0,0,0.04)"; }}
    >
      <div style={{ fontSize: 12, fontWeight: 600, color: feature.status === "DONE" ? "#9E9C93" : "#18170F", lineHeight: 1.4, textDecoration: feature.status === "DONE" ? "line-through" : "none", marginBottom: 8 }}>
        {feature.title}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
        {feature.module && (
          <span style={{ fontSize: 9, color: "#5C5A52", background: "#F4F2EC", padding: "1px 6px", borderRadius: 4, fontWeight: 600 }}>{feature.module}</span>
        )}
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: PRIORITY_COLOR[feature.priority as Priority], flexShrink: 0 }} />
        <div style={{ marginLeft: "auto", display: "flex", gap: 4 }}>
          <button onClick={onOpenDetail} style={{ background: "none", border: "none", fontSize: 12, color: "#CCC9BF", cursor: "pointer", padding: "2px" }} title="Details">⊕</button>
          {canEdit && (
            <button onClick={onOpenNote} style={{ background: "none", border: "none", fontSize: 12, color: "#CCC9BF", cursor: "pointer", padding: "2px" }} title="Notes">✎</button>
          )}
        </div>
      </div>
    </div>
  );
}
 
// ─── CARDS VIEW ───────────────────────────────────────────────────────────────
function CardsView({ phaseGroups, expanded, setExpanded, updateFeature, updateSprint, canEdit, search, onOpenNote, onOpenDetail, allF, addFeatureDep, removeFeatureDep }: any) {
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
              <span style={{ fontSize: 14, fontWeight: 700, color: "#18170F" }}>{ph.sub || ph.label}</span>
              <span style={{ fontSize: 11, color: ph.accent, background: ph.accent + "15", padding: "2px 10px", borderRadius: 20, fontWeight: 600 }}>{pct}%</span>
              <div style={{ flex: 1, height: 1, background: "#E5E2D9" }} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(320px,1fr))", gap: 14 }}>
              {sprints.map((sprint: any) => (
                <SprintCard
                  key={sprint.id} sprint={sprint} accent={ph.accent}
                  expanded={!!expanded[sprint.id]}
                  onToggle={() => setExpanded((e: any) => ({ ...e, [sprint.id]: !e[sprint.id] }))}
                  updateFeature={updateFeature} updateSprint={updateSprint}
                  canEdit={canEdit} search={search} onOpenNote={onOpenNote} onOpenDetail={onOpenDetail}
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
function SprintCard({ sprint, accent, expanded, onToggle, updateFeature, updateSprint, canEdit, search, onOpenNote, onOpenDetail, allF, addFeatureDep, removeFeatureDep }: any) {
  const [isDragOver, setIsDragOver] = useState(false);
  const sm = SPRINT_STATUS[sprint.status as SprintStatus];
  const total   = sprint.features.length;
  const done    = sprint.features.filter((f: any) => f.status === "DONE").length;
  const blocked = sprint.features.filter((f: any) => f.status === "BLOCKED").length;
  const pct     = total ? Math.round((done / total) * 100) : 0;
  const isAtRisk = blocked >= 2 || (blocked > 0 && sprint.status === "ACTIVE");
  const visF    = sprint.features.filter((f: any) => !search || f.title.toLowerCase().includes(search.toLowerCase()));
  const NEXT: Record<SprintStatus, SprintStatus | null> = { UPCOMING: "ACTIVE", ACTIVE: null, DONE: null };
 
  return (
    <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #E5E2D9", overflow: "hidden", borderTop: `3px solid ${isAtRisk ? "#DC2626" : sprint.status === "ACTIVE" ? accent : sprint.status === "DONE" ? "#059669" : "#E5E2D9"}` }}>
      <div style={{ padding: "14px 16px", cursor: "pointer" }} onClick={onToggle}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4 }}>
              <span style={{ fontFamily: "monospace", fontSize: 10, color: accent, fontWeight: 700 }}>{sprint.num}</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#18170F" }}>{sprint.name}</span>
              {isAtRisk && <span style={{ fontSize: 9, color: "#DC2626", background: "#FEF2F2", border: "1px solid #FECACA", padding: "1px 6px", borderRadius: 4, fontWeight: 700 }}>⚠ AT RISK</span>}
            </div>
            <p style={{ fontSize: 11, color: "#9E9C93", lineHeight: 1.5 }}>{sprint.goal}</p>
            {(sprint.startDate || sprint.endDate) && (
              <div style={{ fontSize: 10, color: "#CCC9BF", marginTop: 4 }}>
                {sprint.startDate && new Date(sprint.startDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}
                {sprint.startDate && sprint.endDate && " → "}
                {sprint.endDate && new Date(sprint.endDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}
              </div>
            )}
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
            <span style={{ fontSize: 10, color: sm.color, background: sm.bg, padding: "2px 8px", borderRadius: 6, fontWeight: 600 }}>{sm.label}</span>
            {canEdit && NEXT[sprint.status as SprintStatus] && (
              <button onClick={e => { e.stopPropagation(); updateSprint(sprint.id, { status: NEXT[sprint.status as SprintStatus] }); }} style={{ fontSize: 10, color: "#5C5A52", background: "#F8FAFC", border: "1px solid #E5E2D9", borderRadius: 6, padding: "2px 8px", cursor: "pointer", fontFamily: "inherit" }}>
                → {NEXT[sprint.status as SprintStatus]}
              </button>
            )}
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
          <span style={{ fontSize: 11, color: "#9E9C93" }}>{done}/{total}{blocked > 0 && <span style={{ color: "#DC2626" }}> · {blocked} blocked</span>}</span>
          <span style={{ fontSize: 11, fontWeight: 700, color: pct === 100 ? "#059669" : "#18170F" }}>{pct}%</span>
        </div>
        <div style={{ height: 4, background: "#F4F2EC", borderRadius: 2, overflow: "hidden" }}>
          <div style={{ height: "100%", width: pct + "%", background: pct === 100 ? "#059669" : accent, borderRadius: 2 }} />
        </div>
        <div style={{ textAlign: "right", fontSize: 10, color: "#CCC9BF", marginTop: 4 }}>{expanded ? "▲" : "▼"}</div>
      </div>
      {expanded && (
        <div
          style={{ borderTop: "1px solid #F4F2EC", padding: "10px 12px", display: "flex", flexDirection: "column", gap: 4, background: isDragOver ? "#EDFAF9" : "transparent", transition: "background 0.15s", minHeight: 40 }}
          onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; setIsDragOver(true); }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={e => {
            e.preventDefault();
            setIsDragOver(false);
            const featureId = e.dataTransfer.getData("featureId");
            if (featureId) {
              // Move feature to this sprint's first available status
              const feature = allF.find((f: any) => f.id === featureId);
              if (feature && feature.sprintId !== sprint.id) {
                updateFeature(featureId, { sprintId: sprint.id, status: "TODO" });
              }
            }
          }}
        >
          {isDragOver && visF.length === 0 && (
            <div style={{ textAlign: "center", fontSize: 11, color: "#006D6B", padding: "8px 0", fontWeight: 600 }}>Drop here to move</div>
          )}
          {visF.map((f: any) => (
            <FeatureRow key={f.id} feature={f} onUpdate={(patch: any) => updateFeature(f.id, patch)} canEdit={canEdit} onOpenNote={() => onOpenNote(f)} onOpenDetail={() => onOpenDetail?.(f)} allF={allF} addFeatureDep={addFeatureDep} removeFeatureDep={removeFeatureDep} />
          ))}
          {isDragOver && visF.length > 0 && (
            <div style={{ height: 4, background: "#006D6B", borderRadius: 2, marginTop: 4, opacity: 0.5 }} />
          )}
        </div>
      )}
    </div>
  );
}
 
// ─── FEATURE ROW ──────────────────────────────────────────────────────────────
function FeatureRow({ feature, onUpdate, canEdit, onOpenNote, onOpenDetail, allF, addFeatureDep, removeFeatureDep, onDragStart }: any) {
  const sm = STATUS_META[feature.status as Status];
  const [showDeps, setShowDeps] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const blockerTitles = (feature.dependsOn ?? []).map((d: any) => allF.find((f: any) => f.id === d.dependsOnId)?.title ?? d.dependsOnId);

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData("featureId", feature.id);
    e.dataTransfer.effectAllowed = "move";
    setIsDragging(true);
    onDragStart?.(feature.id);
  };

  return (
    <div
      draggable={canEdit}
      onDragStart={handleDragStart}
      onDragEnd={() => setIsDragging(false)}
      style={{ borderRadius: 8, overflow: "hidden", border: "1px solid #F4F2EC", opacity: isDragging ? 0.45 : 1, cursor: canEdit ? "grab" : "default", transition: "opacity 0.15s" }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", background: "#F8FAFC" }}>
        <span style={{ fontSize: 11, color: sm.color, minWidth: 14 }}>{sm.icon}</span>
        <span style={{ flex: 1, fontSize: 12, color: feature.status === "DONE" ? "#CCC9BF" : "#18170F", textDecoration: feature.status === "DONE" ? "line-through" : "none", fontWeight: 500 }}>{feature.title}</span>
        {feature.module && <span style={{ fontSize: 9, color: "#9E9C93", background: "#F4F2EC", padding: "1px 6px", borderRadius: 4, fontWeight: 600 }}>{feature.module}</span>}
        {blockerTitles.length > 0 && <span style={{ fontSize: 9, color: "#EA580C", fontWeight: 600 }}>⬡{blockerTitles.length}</span>}
        {feature.notes && <span style={{ fontSize: 10, color: "#2563EB" }}>📝</span>}
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: PRIORITY_COLOR[feature.priority as Priority], flexShrink: 0 }} />
        {canEdit && <span style={{ fontSize: 10, color: "#CCC9BF", cursor: "grab" }} title="Drag to reorder">⠿</span>}
        {canEdit && <button onClick={() => setShowDeps(s => !s)} style={{ background: "none", border: "none", color: "#CCC9BF", cursor: "pointer", fontSize: 11, padding: "0 2px" }}>⬡</button>}
        <button onClick={onOpenDetail} title="Open detail" style={{ background: "none", border: "none", color: "#CCC9BF", cursor: "pointer", fontSize: 12, padding: "0 2px" }}>⊕</button>
        <button onClick={onOpenNote} style={{ background: "none", border: "none", color: "#CCC9BF", cursor: "pointer", fontSize: 12, padding: "0 2px" }}>✎</button>
        {canEdit ? (
          <select value={feature.status} onChange={e => onUpdate({ status: e.target.value })} style={{ background: sm.bg, color: sm.color, border: `1px solid ${sm.border}`, borderRadius: 6, fontSize: 10, padding: "2px 4px", outline: "none", cursor: "pointer", fontFamily: "inherit", fontWeight: 600 }}>
            {Object.entries(STATUS_META).map(([v, m]) => <option key={v} value={v}>{m.label}</option>)}
          </select>
        ) : <span style={{ fontSize: 10, color: sm.color, background: sm.bg, border: `1px solid ${sm.border}`, padding: "1px 6px", borderRadius: 4, fontWeight: 600 }}>{sm.label}</span>}
      </div>
      {showDeps && canEdit && (
        <div style={{ padding: "8px 12px", borderTop: "1px solid #F4F2EC", background: "#FDFCFA" }}>
          <div style={{ fontSize: 10, color: "#9E9C93", marginBottom: 6, fontWeight: 600 }}>Depends on:</div>
          {(feature.dependsOn ?? []).map((d: any, i: number) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
              <span style={{ fontSize: 10, color: "#EA580C" }}>⬡</span>
              <span style={{ fontSize: 11, flex: 1, color: "#5C5A52" }}>{blockerTitles[i]}</span>
              <button onClick={() => removeFeatureDep(feature.id, d.dependsOnId)} style={{ fontSize: 10, color: "#DC2626", background: "none", border: "none", cursor: "pointer" }}>✕</button>
            </div>
          ))}
          <select onChange={e => { if (e.target.value) { addFeatureDep(feature.id, e.target.value); e.target.value = ""; } }} style={{ background: "#F8FAFC", border: "1.5px solid #E5E2D9", borderRadius: 8, padding: "6px 10px", color: "#18170F", fontSize: 12, fontFamily: "inherit", outline: "none", width: "100%", marginTop: 4 }}>
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
    <div style={{ textAlign: "center", padding: 48, color: "#9E9C93", background: "#fff", border: "1px solid #E5E2D9", borderRadius: 14 }}>
      <div style={{ fontSize: 32, marginBottom: 12 }}>📅</div>
      <div style={{ fontSize: 14, fontWeight: 600, color: "#18170F", marginBottom: 6 }}>No sprint dates configured</div>
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
          <div style={{ padding: "16px 20px", borderBottom: "1px solid #F4F2EC", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <span style={{ fontFamily: "monospace", fontSize: 11, color: getAccent(expandedSprintData.id), fontWeight: 700 }}>{expandedSprintData.num}</span>
                <span style={{ fontSize: 15, fontWeight: 700, color: "#18170F" }}>{expandedSprintData.name}</span>
                <span style={{ fontSize: 10, color: SPRINT_STATUS[expandedSprintData.status as SprintStatus].color, background: SPRINT_STATUS[expandedSprintData.status as SprintStatus].bg, padding: "2px 8px", borderRadius: 6, fontWeight: 600 }}>
                  {SPRINT_STATUS[expandedSprintData.status as SprintStatus].label}
                </span>
              </div>
              <div style={{ fontSize: 12, color: "#9E9C93" }}>
                {expandedSprintData.startDate && new Date(expandedSprintData.startDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}
                {" → "}
                {expandedSprintData.endDate && new Date(expandedSprintData.endDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}
                {" · "}{expandedSprintData.features.length} tasks
              </div>
            </div>
            <button onClick={() => setExpandedSprint(null)} style={{ background: "#F8FAFC", border: "1px solid #E5E2D9", borderRadius: 8, padding: "6px 14px", fontSize: 12, color: "#5C5A52", cursor: "pointer", fontFamily: "inherit", fontWeight: 600 }}>
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
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#9E9C93", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 8, display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: getAccent(expandedSprintData.id) }} />
                    {day}
                    <div style={{ flex: 1, height: 1, background: "#F4F2EC" }} />
                    <span style={{ fontSize: 10, fontWeight: 500 }}>{features.reduce((s: number, f: any) => s + (f.estimatedHours || 0), 0)}h</span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    {features.map((f: any) => {
                      const sm = STATUS_META[f.status as Status];
                      return (
                        <div key={f.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 14px", background: "#F8FAFC", border: "1px solid #F4F2EC", borderRadius: 8 }}>
                          <span style={{ fontSize: 12, color: sm.color }}>{sm.icon}</span>
                          <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: f.status === "DONE" ? "#CCC9BF" : "#18170F", textDecoration: f.status === "DONE" ? "line-through" : "none" }}>{f.title}</span>
                          {f.module && <span style={{ fontSize: 10, color: "#9E9C93", background: "#F4F2EC", padding: "1px 6px", borderRadius: 4 }}>{f.module}</span>}
                          {f.estimatedHours > 0 && <span style={{ fontSize: 11, color: "#2563EB", fontWeight: 600 }}>{f.estimatedHours}h</span>}
                          <span style={{ width: 6, height: 6, borderRadius: "50%", background: PRIORITY_COLOR[f.priority as Priority] }} />
                          {canEdit ? (
                            <select value={f.status} onChange={e => updateFeature(f.id, { status: e.target.value })} style={{ background: sm.bg, color: sm.color, border: `1px solid ${sm.border}`, borderRadius: 6, fontSize: 10, padding: "2px 6px", outline: "none", fontFamily: "inherit", fontWeight: 600 }}>
                              {Object.entries(STATUS_META).map(([v, m]) => <option key={v} value={v}>{m.label}</option>)}
                            </select>
                          ) : <span style={{ fontSize: 10, color: sm.color, background: sm.bg, padding: "1px 6px", borderRadius: 4, fontWeight: 600 }}>{sm.label}</span>}
                          <button onClick={() => onOpenNote(f)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, color: f.notes ? "#2563EB" : "#CCC9BF" }}>✎</button>
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
          <div key={monthName} style={{ background: "#fff", border: "1px solid #E5E2D9", borderRadius: 14, overflow: "hidden" }}>
            {/* Header */}
            <div style={{ padding: "14px 20px", borderBottom: "1px solid #F4F2EC", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 15, fontWeight: 800, color: "#18170F", letterSpacing: "-0.3px" }}>{monthName}</span>
              <span style={{ fontSize: 12, color: "#9E9C93" }}>{monthSprints.length} sprint{monthSprints.length !== 1 ? "s" : ""}</span>
            </div>
 
            {/* Sprint bars */}
            <div style={{ padding: "12px 20px", borderBottom: "1px solid #F4F2EC", display: "flex", flexDirection: "column", gap: 6 }}>
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
                      <span style={{ fontSize: 12, fontWeight: isActive ? 700 : 500, color: isActive ? "#18170F" : "#5C5A52", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
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
                  <div key={d} style={{ textAlign: "center", fontSize: 10, fontWeight: 700, color: "#CCC9BF", padding: "4px 0" }}>{d}</div>
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
                      background: isToday ? "#ECFDF5" : isWeekend ? "#FDFCFA" : "transparent",
                      border: isToday ? "1.5px solid #059669" : "1px solid transparent",
                    }}>
                      <div style={{ fontSize: 11, fontWeight: isToday ? 800 : 400, color: isToday ? "#059669" : isWeekend ? "#CCC9BF" : "#5C5A52", marginBottom: 3 }}>{day}</div>
 
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
                        <div style={{ fontSize: 8, color: "#9E9C93", padding: "1px 4px" }}>+{dayFeatures.length - 2} more</div>
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