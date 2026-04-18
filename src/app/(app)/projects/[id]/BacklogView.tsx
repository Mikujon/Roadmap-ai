"use client";
import { useState, useMemo, useEffect } from "react";
 
type Status   = "TODO" | "IN_PROGRESS" | "DONE" | "BLOCKED";
type Priority = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
 
interface Assignee { id: string; name: string; role: string; }
interface FeatureDep { id: string; dependsOnId: string; }
interface Feature {
  id: string; title: string; module?: string; status: Status; priority: string;
  notes?: string; estimatedHours: number; actualHours: number;
  dependsOn: FeatureDep[]; assignedTo?: Assignee | null;
  sprintId: string; sprintNum: string; sprintName: string; sprintEnd?: string | null;
}
interface Resource { id: string; name: string; role: string; costPerHour: number; }
 
const STATUS_META: Record<Status, { label: string; color: string; bg: string; border: string; icon: string }> = {
  TODO:        { label: "To Do",       color: "#5C5A52", bg: "#F8FAFC", border: "#E5E2D9", icon: "○" },
  IN_PROGRESS: { label: "In Progress", color: "#2563EB", bg: "#EFF6FF", border: "#BFDBFE", icon: "◐" },
  DONE:        { label: "Done",        color: "#059669", bg: "#ECFDF5", border: "#A7F3D0", icon: "✓" },
  BLOCKED:     { label: "Blocked",     color: "#DC2626", bg: "#FEF2F2", border: "#FECACA", icon: "✕" },
};
const PRIORITY_META: Record<Priority, { color: string; bg: string; border: string }> = {
  CRITICAL: { color: "#DC2626", bg: "#FEF2F2", border: "#FECACA" },
  HIGH:     { color: "#EA580C", bg: "#FFF7ED", border: "#FED7AA" },
  MEDIUM:   { color: "#D97706", bg: "#FFFBEB", border: "#FDE68A" },
  LOW:      { color: "#059669", bg: "#ECFDF5", border: "#A7F3D0" },
};
 
export default function BacklogView({
  allF, updateFeature, canEdit, onOpenNote, onOpenDetail, allResources = [],
}: {
  allF: Feature[];
  updateFeature: (id: string, patch: any) => Promise<void>;
  canEdit: boolean;
  onOpenNote: (f: Feature) => void;
  onOpenDetail?: (f: Feature) => void;
  allResources?: Resource[];
}) {
  const [search,         setSearch]         = useState("");
  const [groupBy,        setGroupBy]        = useState<"sprint" | "status" | "module" | "priority" | "assignee">("sprint");
  const [filterStatus,   setFilterStatus]   = useState<string>("ALL");
  const [filterPriority, setFilterPriority] = useState<string>("ALL");
  const [filterModule,   setFilterModule]   = useState<string>("ALL");
  const [blockNote,      setBlockNote]      = useState<{ id: string; text: string } | null>(null);
  const [taskInsights,   setTaskInsights]   = useState<Record<string, string>>({});
  const [loadingInsights, setLoadingInsights] = useState(false);
 
  // Load AI insights on mount
  useEffect(() => {
    if (allF.length === 0) return;
    setLoadingInsights(true);
    fetch("/api/guardian/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectName: "Project",
        projectEnd: allF.find(f => f.sprintEnd)?.sprintEnd ?? "",
        tasks: allF.map(f => ({
          id: f.id, title: f.title, status: f.status, priority: f.priority,
          module: f.module, assignedTo: f.assignedTo?.name ?? null,
          estimatedHours: f.estimatedHours, actualHours: f.actualHours,
          sprintEnd: f.sprintEnd, sprintName: f.sprintName,
          dependsCount: f.dependsOn?.length ?? 0,
          blockedByDeps: f.status === "BLOCKED" && (f.dependsOn?.length ?? 0) > 0,
        })),
      }),
    })
      .then(r => r.json())
      .then(data => setTaskInsights(data.insights ?? {}))
      .catch(() => {})
      .finally(() => setLoadingInsights(false));
  }, [allF.length]);
 
  const modules   = useMemo(() => [...new Set(allF.map(f => f.module ?? "—"))].sort(), [allF]);
  const PRIORITY_ORDER: Record<Priority, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
 
  const filtered = useMemo(() => {
    return allF.filter(f => {
      if (search && !f.title.toLowerCase().includes(search.toLowerCase()) &&
          !(f.module ?? "").toLowerCase().includes(search.toLowerCase())) return false;
      if (filterStatus   !== "ALL" && f.status   !== filterStatus)   return false;
      if (filterPriority !== "ALL" && f.priority !== filterPriority) return false;
      if (filterModule   !== "ALL" && (f.module ?? "—") !== filterModule) return false;
      return true;
    }).sort((a, b) => (PRIORITY_ORDER[a.priority as Priority] ?? 99) - (PRIORITY_ORDER[b.priority as Priority] ?? 99));
  }, [allF, search, filterStatus, filterPriority, filterModule]);
 
  const grouped = useMemo(() => {
    const g: Record<string, Feature[]> = {};
    filtered.forEach(f => {
      const key =
        groupBy === "sprint"   ? `${f.sprintNum} — ${f.sprintName}` :
        groupBy === "status"   ? STATUS_META[f.status].label :
        groupBy === "module"   ? (f.module ?? "—") :
        groupBy === "priority" ? f.priority :
        groupBy === "assignee" ? (f.assignedTo?.name ?? "Unassigned") : "";
      if (!g[key]) g[key] = [];
      g[key].push(f);
    });
    return g;
  }, [filtered, groupBy]);
 
  const blockedCount  = filtered.filter(f => f.status === "BLOCKED").length;
  const criticalCount = filtered.filter(f => f.priority === "CRITICAL" && f.status !== "DONE").length;
  const doneCount     = filtered.filter(f => f.status === "DONE").length;
  const effortRisk    = filtered.filter(f => f.actualHours > f.estimatedHours * 1.3 && f.estimatedHours > 0).length;
  const hasActiveFilters = filterStatus !== "ALL" || filterPriority !== "ALL" || filterModule !== "ALL" || search;
 
  const saveBlockNote = async () => {
    if (!blockNote) return;
    await updateFeature(blockNote.id, { notes: blockNote.text });
    setBlockNote(null);
  };
 
  return (
    <>
      <style>{`
        .bl-toolbar { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 14px; }
        .bl-select { background: #F8FAFC; border: 1.5px solid #E5E2D9; border-radius: 8px; padding: 6px 10px; color: #18170F; font-size: 12px; font-family: inherit; outline: none; cursor: pointer; }
        .bl-select:focus { border-color: #006D6B; }
        .bl-select.active { border-color: #006D6B; background: #ECFDF5; color: #006D6B; font-weight: 600; }
        .bl-search { background: #F8FAFC; border: 1.5px solid #E5E2D9; border-radius: 8px; padding: 7px 12px; color: #18170F; font-size: 12px; font-family: inherit; outline: none; width: 200px; }
        .bl-search:focus { border-color: #006D6B; background: #fff; }
        .group-pill { padding: 5px 12px; border-radius: 8px; font-size: 12px; font-weight: 600; border: 1.5px solid #E5E2D9; cursor: pointer; font-family: inherit; transition: all 0.15s; background: #fff; color: #5C5A52; }
        .group-pill.active { background: #006D6B; color: #fff; border-color: #006D6B; }
        .bl-table { width: 100%; border-collapse: collapse; font-size: 12px; }
        .bl-table th { background: #FDFCFA; border-bottom: 1px solid #E5E2D9; padding: 8px 14px; text-align: left; font-size: 10px; font-weight: 700; color: #9E9C93; text-transform: uppercase; letter-spacing: 0.07em; white-space: nowrap; }
        .bl-table td { padding: 11px 14px; border-bottom: 1px solid #F4F2EC; vertical-align: middle; }
        .bl-row:hover td { background: #FDFCFA; }
        .bl-row:last-child td { border-bottom: none; }
        .bl-row.blocked td { background: #FEF2F220; }
        .badge-sm { display: inline-flex; align-items: center; padding: 2px 8px; border-radius: 20px; font-size: 10px; font-weight: 700; white-space: nowrap; }
        .effort-risk { color: #DC2626; font-weight: 700; }
        .effort-ok { color: #059669; }
        .clear-btn { font-size: 11px; color: #DC2626; background: #FEF2F2; border: 1px solid #FECACA; border-radius: 6px; padding: 4px 10px; cursor: pointer; font-family: inherit; font-weight: 600; }
        .task-title:hover { text-decoration: underline; text-decoration-style: dotted; cursor: help; }
      `}</style>
 
      {/* Governance summary bar */}
      <div style={{ display: "flex", gap: 16, marginBottom: 14, padding: "11px 16px", background: "#fff", border: "1px solid #E5E2D9", borderRadius: 12, alignItems: "center" }}>
        {[
          { label: "Total",      value: filtered.length, color: "#18170F" },
          { label: "Done",       value: doneCount,        color: "#059669" },
          { label: "Blocked",    value: blockedCount,     color: blockedCount > 0 ? "#DC2626" : "#059669" },
          { label: "Critical",   value: criticalCount,    color: criticalCount > 0 ? "#DC2626" : "#059669" },
          { label: "Effort risk",value: effortRisk,       color: effortRisk > 0 ? "#D97706" : "#059669" },
        ].map(s => (
          <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 10, color: "#9E9C93", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>{s.label}</span>
            <span style={{ fontSize: 14, fontWeight: 800, color: s.color }}>{s.value}</span>
          </div>
        ))}
        {loadingInsights && <span style={{ fontSize: 10, color: "#9E9C93", marginLeft: 8 }}>🛡️ AI analyzing…</span>}
        {hasActiveFilters && (
          <button className="clear-btn" style={{ marginLeft: "auto" }} onClick={() => { setSearch(""); setFilterStatus("ALL"); setFilterPriority("ALL"); setFilterModule("ALL"); }}>
            Clear filters
          </button>
        )}
      </div>
 
      {/* Toolbar */}
      <div className="bl-toolbar">
        <input className="bl-search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search tasks…" />
        <div style={{ width: 1, height: 24, background: "#E5E2D9" }} />
        <span style={{ fontSize: 11, color: "#9E9C93", fontWeight: 600 }}>Group:</span>
        {(["sprint","status","module","priority","assignee"] as const).map(g => (
          <button key={g} className={`group-pill${groupBy === g ? " active" : ""}`} onClick={() => setGroupBy(g)}>
            {g.charAt(0).toUpperCase() + g.slice(1)}
          </button>
        ))}
        <div style={{ width: 1, height: 24, background: "#E5E2D9" }} />
        <span style={{ fontSize: 11, color: "#9E9C93", fontWeight: 600 }}>Filter:</span>
        <select className={`bl-select${filterStatus !== "ALL" ? " active" : ""}`} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="ALL">All Status</option>
          {Object.entries(STATUS_META).map(([v, m]) => <option key={v} value={v}>{m.label}</option>)}
        </select>
        <select className={`bl-select${filterPriority !== "ALL" ? " active" : ""}`} value={filterPriority} onChange={e => setFilterPriority(e.target.value)}>
          <option value="ALL">All Priority</option>
          {["CRITICAL","HIGH","MEDIUM","LOW"].map(v => <option key={v} value={v}>{v}</option>)}
        </select>
        <select className={`bl-select${filterModule !== "ALL" ? " active" : ""}`} value={filterModule} onChange={e => setFilterModule(e.target.value)}>
          <option value="ALL">All Modules</option>
          {modules.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>
 
      {/* Groups */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {Object.entries(grouped).map(([group, features]) => {
          const gDone    = features.filter(f => f.status === "DONE").length;
          const gBlocked = features.filter(f => f.status === "BLOCKED").length;
          const gPct     = features.length ? Math.round((gDone / features.length) * 100) : 0;
 
          return (
            <div key={group} style={{ background: "#fff", border: `1px solid ${gBlocked > 0 ? "#FECACA" : "#E5E2D9"}`, borderRadius: 12, overflow: "hidden" }}>
              <div style={{ padding: "10px 16px", background: gBlocked > 0 ? "#FEF2F2" : "#FDFCFA", borderBottom: "1px solid #F4F2EC", display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontWeight: 700, fontSize: 13, color: "#18170F" }}>{group}</span>
                <span style={{ fontSize: 11, color: "#9E9C93", background: "#F4F2EC", padding: "1px 8px", borderRadius: 10, fontWeight: 600 }}>{features.length}</span>
                {gBlocked > 0 && <span style={{ fontSize: 11, color: "#DC2626", fontWeight: 700 }}>⚠ {gBlocked} blocked</span>}
                <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{ width: 60, height: 4, background: "#F4F2EC", borderRadius: 2, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: gPct + "%", background: gPct === 100 ? "#059669" : "#006D6B", borderRadius: 2 }} />
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#18170F" }}>{gPct}%</span>
                </div>
              </div>
 
              <table className="bl-table">
                <thead>
                  <tr>
                    <th style={{ width: 20 }}></th>
                    <th>Task</th>
                    <th>Status</th>
                    <th>Priority</th>
                    <th>Module</th>
                    <th>Assignee</th>
                    <th>Est. h</th>
                    <th>Act. h</th>
                    <th>Due</th>
                    <th>Block note</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {features.map(f => {
                    const sm = STATUS_META[f.status];
                    const pm = PRIORITY_META[f.priority as Priority] ?? { color: "#5C5A52", bg: "#F8FAFC", border: "#E5E2D9" };
                    const isOverdue = f.sprintEnd && new Date(f.sprintEnd) < new Date() && f.status !== "DONE";
                    const effortOver = f.estimatedHours > 0 && f.actualHours > f.estimatedHours * 1.3;
                    const insight = taskInsights[f.id];
 
                    return (
                      <tr key={f.id} className={`bl-row${f.status === "BLOCKED" ? " blocked" : ""}`}>
                        <td style={{ textAlign: "center", paddingRight: 0 }}>
                          <span style={{ fontSize: 12, color: sm.color }}>{sm.icon}</span>
                        </td>
 
                        {/* Title with AI tooltip */}
                        <td style={{ maxWidth: 280, minWidth: 180 }}>
                          <span
                            className="task-title"
                            title={insight ?? `Sprint: ${f.sprintName}`}
                            style={{ fontSize: 13, fontWeight: 500, color: f.status === "DONE" ? "#CCC9BF" : "#18170F", textDecoration: f.status === "DONE" ? "line-through" : "none" }}
                          >
                            {f.title}
                          </span>
                          {insight && (
                            <div style={{ fontSize: 10, color: "#9E9C93", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 260 }}>
                              🛡️ {insight}
                            </div>
                          )}
                        </td>
 
                        <td>
                          {canEdit ? (
                            <select value={f.status} onChange={e => updateFeature(f.id, { status: e.target.value })}
                              style={{ background: sm.bg, color: sm.color, border: `1px solid ${sm.border}`, borderRadius: 8, fontSize: 11, padding: "3px 6px", outline: "none", cursor: "pointer", fontFamily: "inherit", fontWeight: 600 }}>
                              {Object.entries(STATUS_META).map(([v, m]) => <option key={v} value={v}>{m.label}</option>)}
                            </select>
                          ) : (
                            <span className="badge-sm" style={{ color: sm.color, background: sm.bg, border: `1px solid ${sm.border}` }}>{sm.label}</span>
                          )}
                        </td>
 
                        <td>
                          <span className="badge-sm" style={{ color: pm.color, background: pm.bg, border: `1px solid ${pm.border}` }}>{f.priority}</span>
                        </td>
 
                        <td>
                          <span style={{ fontSize: 11, color: "#5C5A52", background: "#F4F2EC", padding: "2px 8px", borderRadius: 6, fontWeight: 500 }}>{f.module ?? "—"}</span>
                        </td>
 
                        <td style={{ minWidth: 120 }}>
                          {canEdit ? (
                            <select value={f.assignedTo?.id ?? ""} onChange={async e => {
                              const resourceId = e.target.value;
                              await fetch(`/api/features/${f.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ assignedToId: resourceId || null }) });
                              await updateFeature(f.id, { assignedTo: resourceId ? allResources.find(r => r.id === resourceId) ?? null : null });
                            }} style={{ background: "transparent", border: "none", fontSize: 12, fontFamily: "inherit", color: "#5C5A52", cursor: "pointer", outline: "none", maxWidth: 130 }}>
                              <option value="">— Unassigned —</option>
                              {allResources.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                            </select>
                          ) : (
                            <span style={{ fontSize: 12, color: f.assignedTo ? "#18170F" : "#CCC9BF" }}>
                              {f.assignedTo ? (
                                <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                                  <span style={{ width: 20, height: 20, borderRadius: "50%", background: "#EFF6FF", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, color: "#2563EB" }}>
                                    {f.assignedTo.name[0]}
                                  </span>
                                  {f.assignedTo.name}
                                </span>
                              ) : "—"}
                            </span>
                          )}
                        </td>
 
                        <td style={{ textAlign: "center" }}>
                          <span style={{ fontSize: 12, color: "#2563EB", fontWeight: 600 }}>
                            {f.estimatedHours > 0 ? `${f.estimatedHours}h` : "—"}
                          </span>
                        </td>
 
                        <td style={{ textAlign: "center" }}>
                          <span className={effortOver ? "effort-risk" : "effort-ok"} style={{ fontSize: 12 }}>
                            {f.actualHours > 0 ? `${f.actualHours}h${effortOver ? " ⚠" : ""}` : "—"}
                          </span>
                        </td>
 
                        <td>
                          {f.sprintEnd ? (
                            <span
                              title={insight ?? `Sprint: ${f.sprintName}`}
                              style={{ fontSize: 11, color: isOverdue ? "#DC2626" : "#5C5A52", fontWeight: isOverdue ? 700 : 400, cursor: "help" }}
                            >
                              {new Date(f.sprintEnd).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}
                              {isOverdue && " ⚠"}
                            </span>
                          ) : <span style={{ color: "#CCC9BF" }}>—</span>}
                        </td>
 
                        <td>
                          {f.status === "BLOCKED" ? (
                            <button onClick={() => setBlockNote({ id: f.id, text: f.notes ?? "" })}
                              style={{ fontSize: 11, color: f.notes ? "#DC2626" : "#9E9C93", background: f.notes ? "#FEF2F2" : "#F8FAFC", border: `1px solid ${f.notes ? "#FECACA" : "#E5E2D9"}`, borderRadius: 6, padding: "2px 8px", cursor: "pointer", fontFamily: "inherit", fontWeight: 600 }}>
                              {f.notes ? "📝 View" : "+ Add note"}
                            </button>
                          ) : <span style={{ color: "#CCC9BF" }}>—</span>}
                        </td>
                        <td>
                          <button
                            onClick={() => onOpenDetail?.(f)}
                            title="View details"
                            style={{ background: "none", border: "none", cursor: "pointer", color: "#CCC9BF", fontSize: 14, padding: "2px 4px", lineHeight: 1, transition: "color 0.12s" }}
                            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = "#006D6B"; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = "#CCC9BF"; }}
                          >⊕</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          );
        })}
 
        {filtered.length === 0 && (
          <div style={{ textAlign: "center", padding: "48px", background: "#fff", border: "1px solid #E5E2D9", borderRadius: 12 }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🔍</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#18170F", marginBottom: 6 }}>No tasks found</div>
            <div style={{ fontSize: 12, color: "#9E9C93" }}>Try adjusting your filters</div>
          </div>
        )}
      </div>
 
      {/* Block note drawer */}
      {blockNote && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)", zIndex: 100, display: "flex", justifyContent: "flex-end" }} onClick={() => setBlockNote(null)}>
          <div style={{ width: 380, background: "#fff", padding: 24, display: "flex", flexDirection: "column", gap: 16, boxShadow: "-4px 0 24px rgba(0,0,0,0.08)" }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontWeight: 700, fontSize: 14, color: "#DC2626" }}>⚠ Block Note</span>
              <button onClick={() => setBlockNote(null)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: "#9E9C93" }}>✕</button>
            </div>
            <div style={{ fontSize: 12, color: "#5C5A52" }}>Document why this task is blocked and what needs to happen to unblock it.</div>
            <textarea value={blockNote.text} onChange={e => setBlockNote(b => b ? { ...b, text: e.target.value } : null)}
              placeholder="Why is this blocked? What needs to happen to unblock it? Who is responsible?"
              rows={8} style={{ background: "#F8FAFC", border: "1.5px solid #FECACA", borderRadius: 10, padding: "12px 14px", fontSize: 13, outline: "none", resize: "vertical", lineHeight: 1.6, fontFamily: "inherit", color: "#18170F" }} />
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={saveBlockNote} style={{ flex: 1, padding: "10px", background: "#DC2626", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Save Block Note</button>
              <button onClick={() => setBlockNote(null)} style={{ padding: "10px 16px", background: "#F8FAFC", color: "#5C5A52", border: "1px solid #E5E2D9", borderRadius: 8, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}