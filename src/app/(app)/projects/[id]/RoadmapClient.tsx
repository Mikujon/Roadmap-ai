"use client";
import { useState, useCallback } from "react";
import FinancialsView from "./FinancialsView";
import GovernanceView from "./GovernanceView";

type Status = "TODO" | "IN_PROGRESS" | "DONE" | "BLOCKED";
type Priority = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
type SprintStatus = "UPCOMING" | "ACTIVE" | "DONE";

interface FeatureDep { id: string; dependsOnId: string; }
interface Feature { id: string; title: string; module?: string; status: Status; priority: Priority; notes?: string; dependsOn: FeatureDep[]; }
interface Sprint  { id: string; num: string; name: string; goal?: string; status: SprintStatus; startDate?: string; endDate?: string; features: Feature[]; }
interface Phase   { id: string; num: number; label: string; sub?: string; accent: string; }
interface ProjectDep { id: string; dependsOnId: string; dependsOn: { id: string; name: string; } }
interface Project { id: string; name: string; startDate: string; endDate: string; phases: Phase[]; sprints: Sprint[]; shareToken?: string; shareEnabled: boolean; dependsOn: ProjectDep[]; }

const STATUS_META: Record<Status, { label: string; color: string; bg: string; icon: string }> = {
  TODO:        { label: "To Do",       color: "#9CA3AF", bg: "rgba(156,163,175,0.10)", icon: "○" },
  IN_PROGRESS: { label: "In Progress", color: "#3B82F6", bg: "rgba(59,130,246,0.12)",  icon: "◐" },
  DONE:        { label: "Done",        color: "#00C97A", bg: "rgba(0,201,122,0.12)",   icon: "✓" },
  BLOCKED:     { label: "Blocked",     color: "#EF4444", bg: "rgba(239,68,68,0.12)",   icon: "✕" },
};
const SPRINT_STATUS: Record<SprintStatus, { label: string; color: string }> = {
  UPCOMING: { label: "Upcoming", color: "#64748B" },
  ACTIVE:   { label: "Active",   color: "#3B82F6" },
  DONE:     { label: "Completed",color: "#00C97A" },
};
const PRIORITY_COLOR: Record<Priority, string> = {
  CRITICAL: "#EF4444", HIGH: "#F97316", MEDIUM: "#EAB308", LOW: "#22C55E",
};

export default function RoadmapClient({ project: initial, role, allProjects = [] }: { project: Project; role: string; allProjects?: { id: string; name: string }[] }) {
  const [project, setProject] = useState({ ...initial, dependsOn: initial.dependsOn ?? [] });
  const [view, setView] = useState<"board" | "backlog" | "gantt" | "metrics" | "dependencies" | "financials" | "governance">("board");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [shareUrl, setShareUrl] = useState(
    initial.shareEnabled && initial.shareToken
      ? `${window.location.origin}/share/${initial.shareToken}`
      : ""
  );
  const [copied, setCopied] = useState(false);
  const [noteDrawer, setNoteDrawer] = useState<Feature | null>(null);
  const [noteText, setNoteText] = useState("");

  const canEdit = role === "ADMIN" || role === "MANAGER";
  const isAdmin = role === "ADMIN";

  const updateFeature = useCallback(async (featureId: string, patch: Partial<Feature>) => {
    setSaving(true);
    setProject(p => ({
      ...p,
      sprints: p.sprints.map(s => ({
        ...s,
        features: s.features.map(f => f.id === featureId ? { ...f, ...patch } : f),
      })),
    }));
    await fetch(`/api/features/${featureId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    setTimeout(() => setSaving(false), 600);
  }, []);

  const updateSprint = useCallback(async (sprintId: string, patch: { status: SprintStatus }) => {
    setSaving(true);
    setProject(p => ({
      ...p,
      sprints: p.sprints.map(s => s.id === sprintId ? { ...s, ...patch } : s),
    }));
    await fetch(`/api/sprints/${sprintId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    setTimeout(() => setSaving(false), 600);
  }, []);

  const toggleShare = useCallback(async () => {
    if (shareUrl) {
      await fetch(`/api/projects/${project.id}/share`, { method: "DELETE" });
      setShareUrl("");
    } else {
      const res = await fetch(`/api/projects/${project.id}/share`, { method: "POST" });
      const data = await res.json();
      setShareUrl(data.url);
    }
  }, [project.id, shareUrl]);

  const openNote = (f: Feature) => { setNoteDrawer(f); setNoteText(f.notes ?? ""); };
  const saveNote = async () => {
    if (!noteDrawer) return;
    await updateFeature(noteDrawer.id, { notes: noteText });
    setNoteDrawer(null);
  };

  const addProjectDep = async (dependsOnId: string) => {
    await fetch("/api/dependencies/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId: project.id, dependsOnId }),
    });
    setProject(p => ({
      ...p,
      dependsOn: [...p.dependsOn, { id: Date.now().toString(), dependsOnId, dependsOn: { id: dependsOnId, name: allProjects.find(pr => pr.id === dependsOnId)?.name ?? "" } }],
    }));
  };

  const removeProjectDep = async (dependsOnId: string) => {
    await fetch("/api/dependencies/projects", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId: project.id, dependsOnId }),
    });
    setProject(p => ({ ...p, dependsOn: p.dependsOn.filter(d => d.dependsOnId !== dependsOnId) }));
  };

  const addFeatureDep = async (featureId: string, dependsOnId: string) => {
    await fetch("/api/dependencies/features", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ featureId, dependsOnId }),
    });
    setProject(p => ({
      ...p,
      sprints: p.sprints.map(s => ({
        ...s,
        features: s.features.map(f => f.id === featureId
          ? { ...f, dependsOn: [...(f.dependsOn ?? []), { id: Date.now().toString(), dependsOnId }] }
          : f),
      })),
    }));
  };

  const removeFeatureDep = async (featureId: string, dependsOnId: string) => {
    await fetch("/api/dependencies/features", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ featureId, dependsOnId }),
    });
    setProject(p => ({
      ...p,
      sprints: p.sprints.map(s => ({
        ...s,
        features: s.features.map(f => f.id === featureId
          ? { ...f, dependsOn: (f.dependsOn ?? []).filter(d => d.dependsOnId !== dependsOnId) }
          : f),
      })),
    }));
  };

  const allF = project.sprints.flatMap(s =>
    s.features.map(f => ({ ...f, sprintId: s.id, sprintNum: s.num, sprintName: s.name }))
  );
  const totalDone = allF.filter(f => f.status === "DONE").length;
  const totalPct  = allF.length ? Math.round((totalDone / allF.length) * 100) : 0;

  const phaseGroups: Record<number, { phase: Phase; sprints: Sprint[] }> = {};
  project.phases.forEach(ph => { phaseGroups[ph.num] = { phase: ph, sprints: [] }; });
  project.sprints.forEach((s, i) => {
    const phIdx = Math.floor(i / Math.ceil(project.sprints.length / Math.max(project.phases.length, 1)));
    const ph = project.phases[Math.min(phIdx, project.phases.length - 1)];
    if (ph && phaseGroups[ph.num]) phaseGroups[ph.num].sprints.push(s);
  });

  const VIEWS = ["board", "backlog", "gantt", "metrics", "dependencies", "financials", "governance"] as const;

  return (
    <div style={{ minHeight: "100vh", background: "#080E1A", color: "#E2EBF6" }}>
      <div style={{ background: "#0A1220", borderBottom: "1px solid #1A2E44", padding: "14px 32px", display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 16, fontWeight: 700 }}>{project.name}</div>
          <div style={{ fontSize: 11, color: "#64748B" }}>
            {project.startDate?.slice(0, 10)} → {project.endDate?.slice(0, 10)}
            {project.dependsOn.length > 0 && (
              <span style={{ marginLeft: 10, color: "#F97316" }}>
                ⬡ depends on: {project.dependsOn.map(d => d.dependsOn.name).join(", ")}
              </span>
            )}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 80, height: 4, background: "#1E3A5F", borderRadius: 2, overflow: "hidden" }}>
            <div style={{ height: "100%", width: totalPct + "%", background: "linear-gradient(90deg,#007A73,#3B82F6)", borderRadius: 2, transition: "width 0.5s" }} />
          </div>
          <span style={{ fontSize: 11, color: "#00C97A", fontFamily: "monospace" }}>{totalPct}%</span>
        </div>
        {canEdit && (
          <button onClick={toggleShare} style={{ padding: "6px 14px", background: "#0F1827", border: "1px solid " + (shareUrl ? "#00C97A" : "#1E3A5F"), borderRadius: 7, fontSize: 11, color: shareUrl ? "#00C97A" : "#64748B", cursor: "pointer" }}>
            {shareUrl ? "🔗 Shared" : "Share"}
          </button>
        )}
        {shareUrl && (
          <button onClick={() => { navigator.clipboard.writeText(shareUrl); setCopied(true); setTimeout(() => setCopied(false), 2000); }} style={{ padding: "6px 14px", background: "#0F1827", border: "1px solid #1E3A5F", borderRadius: 7, fontSize: 11, color: "#64748B", cursor: "pointer" }}>
            {copied ? "Copied!" : "Copy link"}
          </button>
        )}
        {saving && <span style={{ fontSize: 10, color: "#00C97A", fontFamily: "monospace" }}>● saving</span>}
        <span style={{ fontSize: 10, color: role === "ADMIN" ? "#F97316" : role === "MANAGER" ? "#3B82F6" : "#64748B", background: role === "ADMIN" ? "rgba(249,115,22,0.1)" : role === "MANAGER" ? "rgba(59,130,246,0.1)" : "rgba(100,116,139,0.1)", padding: "3px 8px", borderRadius: 4, fontWeight: 700 }}>
          {role}
        </span>
        <div style={{ display: "flex", gap: 2, background: "#0F1827", borderRadius: 8, padding: 3 }}>
          {VIEWS.map(v => (
            <button key={v} onClick={() => setView(v)} style={{ padding: "5px 12px", borderRadius: 6, fontSize: 11, fontWeight: 500, background: view === v ? "#1E3A5F" : "transparent", color: view === v ? "#E2EBF6" : "#64748B", border: "none", cursor: "pointer" }}>
              {v.charAt(0).toUpperCase() + v.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: "10px 32px", background: "#0A1220", borderBottom: "1px solid #1A2E44" }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search features…" style={{ background: "#0F1827", color: "#E2EBF6", border: "1px solid #1E3A5F", borderRadius: 6, padding: "5px 12px", fontSize: 12, outline: "none", width: 200 }} />
      </div>

      <div style={{ padding: "24px 32px" }}>
        {view === "board"        && <BoardView phaseGroups={phaseGroups} expanded={expanded} setExpanded={setExpanded} updateFeature={updateFeature} updateSprint={updateSprint} canEdit={canEdit} search={search} onOpenNote={openNote} allF={allF} addFeatureDep={addFeatureDep} removeFeatureDep={removeFeatureDep} />}
        {view === "backlog"      && <BacklogView allF={allF} search={search} updateFeature={updateFeature} canEdit={canEdit} onOpenNote={openNote} />}
        {view === "gantt"        && <GanttView project={project} phaseGroups={phaseGroups} allF={allF} />}
        {view === "metrics"      && <MetricsView project={project} allF={allF} phaseGroups={phaseGroups} />}
        {view === "dependencies" && <DependenciesView project={project} allProjects={allProjects} allF={allF} canEdit={isAdmin} addProjectDep={addProjectDep} removeProjectDep={removeProjectDep} addFeatureDep={addFeatureDep} removeFeatureDep={removeFeatureDep} />}
        {view === "financials"   && <FinancialsView projectId={project.id} canEdit={canEdit} />}
        {view === "governance"   && <GovernanceView projectId={project.id} canEdit={canEdit} />}
      </div>

      {noteDrawer && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 100, display: "flex", justifyContent: "flex-end" }} onClick={() => setNoteDrawer(null)}>
          <div style={{ width: 400, background: "#0D1929", borderLeft: "1px solid #1E3A5F", padding: 24, display: "flex", flexDirection: "column", gap: 16 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontWeight: 700, fontSize: 14 }}>Feature Notes</span>
              <button onClick={() => setNoteDrawer(null)} style={{ background: "none", border: "none", color: "#64748B", cursor: "pointer", fontSize: 18 }}>✕</button>
            </div>
            <div style={{ fontSize: 13, color: "#E2EBF6", fontWeight: 600 }}>{noteDrawer.title}</div>
            <div style={{ display: "flex", gap: 6 }}>
              <span style={{ fontSize: 10, color: STATUS_META[noteDrawer.status].color, background: STATUS_META[noteDrawer.status].bg, padding: "2px 8px", borderRadius: 4 }}>{STATUS_META[noteDrawer.status].label}</span>
              <span style={{ fontSize: 10, color: PRIORITY_COLOR[noteDrawer.priority], background: PRIORITY_COLOR[noteDrawer.priority] + "18", padding: "2px 8px", borderRadius: 4 }}>{noteDrawer.priority}</span>
            </div>
            <textarea value={noteText} onChange={e => setNoteText(e.target.value)} placeholder="Add notes, acceptance criteria, links…" rows={12} style={{ background: "#0A1220", color: "#E2EBF6", border: "1px solid #1E3A5F", borderRadius: 8, padding: "10px 14px", fontSize: 12, outline: "none", resize: "vertical", lineHeight: 1.6 }} />
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={saveNote} style={{ flex: 1, padding: "10px", background: "linear-gradient(135deg,#007A73,#0a9a90)", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Save Notes</button>
              <button onClick={() => setNoteDrawer(null)} style={{ padding: "10px 16px", background: "#1E3A5F", color: "#E2EBF6", border: "none", borderRadius: 8, fontSize: 13, cursor: "pointer" }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function BoardView({ phaseGroups, expanded, setExpanded, updateFeature, updateSprint, canEdit, search, onOpenNote, allF, addFeatureDep, removeFeatureDep }: any) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
      {Object.values(phaseGroups).map(({ phase: ph, sprints }: any) => {
        if (!sprints.length) return null;
        const phF = sprints.flatMap((s: any) => s.features);
        const pct = phF.length ? Math.round((phF.filter((f: any) => f.status === "DONE").length / phF.length) * 100) : 0;
        return (
          <div key={ph.id}>
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 14 }}>
              <div style={{ flex: 1, height: 1, background: `linear-gradient(90deg,${ph.accent}50,transparent)` }} />
              <span style={{ color: ph.accent, fontSize: 10, fontWeight: 700, fontFamily: "monospace" }}>PHASE {ph.num}</span>
              <span style={{ fontSize: 13, fontWeight: 600 }}>{ph.sub || ph.label}</span>
              <span style={{ fontSize: 10, color: ph.accent, background: ph.accent + "18", padding: "2px 8px", borderRadius: 4, fontFamily: "monospace" }}>{pct}%</span>
              <div style={{ flex: 1, height: 1, background: `linear-gradient(90deg,transparent,${ph.accent}50)` }} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px,1fr))", gap: 14 }}>
              {sprints.map((sprint: any) => (
                <SprintCard key={sprint.id} sprint={sprint} accent={ph.accent} expanded={!!expanded[sprint.id]} onToggle={() => setExpanded((e: any) => ({ ...e, [sprint.id]: !e[sprint.id] }))} updateFeature={updateFeature} updateSprint={updateSprint} canEdit={canEdit} search={search} onOpenNote={onOpenNote} allF={allF} addFeatureDep={addFeatureDep} removeFeatureDep={removeFeatureDep} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function SprintCard({ sprint, accent, expanded, onToggle, updateFeature, updateSprint, canEdit, search, onOpenNote, allF, addFeatureDep, removeFeatureDep }: any) {
  const sm = SPRINT_STATUS[sprint.status as SprintStatus];
  const total = sprint.features.length;
  const done  = sprint.features.filter((f: any) => f.status === "DONE").length;
  const blocked = sprint.features.filter((f: any) => f.status === "BLOCKED").length;
  const pct   = total ? Math.round((done / total) * 100) : 0;
  const isAtRisk = blocked >= 2 || (blocked > 0 && sprint.status === "ACTIVE");
  const visF  = sprint.features.filter((f: any) => !search || f.title.toLowerCase().includes(search.toLowerCase()));
  const borderColor = sprint.status === "ACTIVE" ? accent : sprint.status === "DONE" ? "#00C97A" : "#1E3A5F";
  const NEXT_STATUS: Record<SprintStatus, SprintStatus | null> = { UPCOMING: "ACTIVE", ACTIVE: null, DONE: null };

  return (
    <div style={{ background: "#0D1929", border: `1px solid ${isAtRisk ? "#EF444440" : "#1E3A5F"}`, borderTop: `3px solid ${isAtRisk ? "#EF4444" : borderColor}`, borderRadius: 12, overflow: "hidden" }}>
      <div style={{ padding: "14px 16px", cursor: "pointer" }} onClick={onToggle}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 3 }}>
              <span style={{ fontFamily: "monospace", fontSize: 9, color: accent, fontWeight: 700 }}>{sprint.num}</span>
              <span style={{ fontSize: 13, fontWeight: 700 }}>{sprint.name}</span>
              {isAtRisk && <span style={{ fontSize: 9, color: "#EF4444", background: "rgba(239,68,68,0.12)", padding: "1px 6px", borderRadius: 3, fontWeight: 700 }}>⚠ AT RISK</span>}
            </div>
            <p style={{ fontSize: 11, color: "#64748B", lineHeight: 1.5 }}>{sprint.goal}</p>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
            <span style={{ fontSize: 9, color: sm.color, background: sm.color + "18", padding: "2px 7px", borderRadius: 4, fontWeight: 600 }}>{sm.label}</span>
            {canEdit && NEXT_STATUS[sprint.status as SprintStatus] && (
              <button onClick={e => { e.stopPropagation(); updateSprint(sprint.id, { status: NEXT_STATUS[sprint.status as SprintStatus] }); }} style={{ fontSize: 9, color: "#64748B", background: "#0F1827", border: "1px solid #1E3A5F", borderRadius: 4, padding: "2px 6px", cursor: "pointer" }}>
                → {NEXT_STATUS[sprint.status as SprintStatus]}
              </button>
            )}
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
          <span style={{ fontSize: 10, color: "#64748B" }}>{done}/{total} {blocked > 0 && <span style={{ color: "#EF4444" }}>· {blocked} blocked</span>}</span>
          <span style={{ fontFamily: "monospace", fontSize: 10, color: pct === 100 ? "#00C97A" : "#E2EBF6" }}>{pct}%</span>
        </div>
        <div style={{ height: 3, background: "#1E3A5F", borderRadius: 2, overflow: "hidden" }}>
          <div style={{ height: "100%", width: pct + "%", background: pct === 100 ? "#00C97A" : `linear-gradient(90deg,${accent},${accent}bb)`, borderRadius: 2, transition: "width 0.4s" }} />
        </div>
        <span style={{ float: "right", fontSize: 9, color: "#475569", marginTop: 4 }}>{expanded ? "▲" : "▼"}</span>
      </div>
      {expanded && (
        <div style={{ borderTop: "1px solid #1A2E44", padding: "10px 14px", display: "flex", flexDirection: "column", gap: 5 }}>
          {visF.map((f: any) => (
            <FeatureRow key={f.id} feature={f} onUpdate={(patch: any) => updateFeature(f.id, patch)} canEdit={canEdit} onOpenNote={() => onOpenNote(f)} allF={allF} addFeatureDep={addFeatureDep} removeFeatureDep={removeFeatureDep} />
          ))}
        </div>
      )}
    </div>
  );
}

function FeatureRow({ feature, onUpdate, canEdit, onOpenNote, allF, addFeatureDep, removeFeatureDep }: any) {
  const sm = STATUS_META[feature.status as Status];
  const [showDeps, setShowDeps] = useState(false);
  const blockerTitles = (feature.dependsOn ?? []).map((d: any) => allF.find((f: any) => f.id === d.dependsOnId)?.title ?? d.dependsOnId);
  const hasBlockers = blockerTitles.length > 0;

  return (
    <div style={{ borderRadius: 6, background: "#0A1220", border: "1px solid #1A2E44", overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 7, padding: "4px 7px" }}>
        <span style={{ fontSize: 11, color: sm.color, minWidth: 12 }}>{sm.icon}</span>
        <span style={{ flex: 1, fontSize: 11, color: feature.status === "DONE" ? "#475569" : "#C8D8E8", textDecoration: feature.status === "DONE" ? "line-through" : "none" }}>{feature.title}</span>
        {feature.module && <span style={{ fontSize: 9, color: "#475569", background: "#0F1827", padding: "1px 5px", borderRadius: 3 }}>{feature.module}</span>}
        {hasBlockers && <span style={{ fontSize: 9, color: "#F97316" }}>⬡{blockerTitles.length}</span>}
        {feature.notes && <span style={{ fontSize: 9, color: "#3B82F6" }}>📝</span>}
        <span style={{ width: 5, height: 5, borderRadius: "50%", background: PRIORITY_COLOR[feature.priority as Priority], flexShrink: 0 }} />
        {canEdit && <button onClick={() => setShowDeps(s => !s)} style={{ background: "none", border: "none", color: "#475569", cursor: "pointer", fontSize: 10, padding: "0 2px" }}>⬡</button>}
        <button onClick={onOpenNote} style={{ background: "none", border: "none", color: "#475569", cursor: "pointer", fontSize: 11, padding: "0 2px" }}>✎</button>
        {canEdit ? (
          <select value={feature.status} onChange={e => onUpdate({ status: e.target.value })} style={{ background: sm.bg, color: sm.color, border: "1px solid " + sm.color + "60", borderRadius: 4, fontSize: 10, padding: "1px 3px", outline: "none", cursor: "pointer" }}>
            {Object.entries(STATUS_META).map(([v, m]) => <option key={v} value={v}>{m.label}</option>)}
          </select>
        ) : (
          <span style={{ fontSize: 9, color: sm.color, background: sm.bg, padding: "1px 6px", borderRadius: 3 }}>{sm.label}</span>
        )}
      </div>
      {showDeps && canEdit && (
        <div style={{ padding: "8px 12px", borderTop: "1px solid #1A2E44", background: "#060E18" }}>
          <div style={{ fontSize: 10, color: "#64748B", marginBottom: 6 }}>Depends on:</div>
          {(feature.dependsOn ?? []).map((d: any, i: number) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
              <span style={{ fontSize: 10, color: "#F97316" }}>⬡</span>
              <span style={{ fontSize: 11, flex: 1, color: "#C8D8E8" }}>{blockerTitles[i]}</span>
              <button onClick={() => removeFeatureDep(feature.id, d.dependsOnId)} style={{ fontSize: 9, color: "#EF4444", background: "none", border: "none", cursor: "pointer" }}>✕</button>
            </div>
          ))}
          <select onChange={e => { if (e.target.value) { addFeatureDep(feature.id, e.target.value); e.target.value = ""; } }} style={{ background: "#0F1827", color: "#E2EBF6", border: "1px solid #1E3A5F", borderRadius: 4, fontSize: 10, padding: "3px 6px", outline: "none", width: "100%", marginTop: 4 }}>
            <option value="">+ Add dependency…</option>
            {allF.filter((f: any) => f.id !== feature.id && !(feature.dependsOn ?? []).some((d: any) => d.dependsOnId === f.id)).map((f: any) => (
              <option key={f.id} value={f.id}>{f.sprintNum} — {f.title}</option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}

function GanttView({ project, phaseGroups, allF }: any) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const start = new Date(project.startDate).getTime();
  const end   = new Date(project.endDate).getTime();
  const total = end - start;

  return (
    <div style={{ background: "#0D1929", border: "1px solid #1E3A5F", borderRadius: 12, overflow: "hidden" }}>
      <div style={{ padding: "16px 20px", borderBottom: "1px solid #1A2E44", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 13, fontWeight: 700 }}>Timeline</span>
        <div style={{ display: "flex", gap: 16, fontSize: 10, color: "#64748B" }}>
          {[{ color: "#00C97A", label: "Done" }, { color: "#3B82F6", label: "Active" }, { color: "#1E3A5F", label: "Upcoming" }, { color: "#EF4444", label: "Blocked" }].map(l => (
            <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <div style={{ width: 8, height: 8, borderRadius: 2, background: l.color }} />{l.label}
            </div>
          ))}
        </div>
      </div>
      <div style={{ padding: "16px 20px", overflowX: "auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "200px 1fr", gap: 12, marginBottom: 12 }}>
          <div />
          <div style={{ position: "relative", height: 20 }}>
            {[0, 25, 50, 75, 100].map(pct => (
              <div key={pct} style={{ position: "absolute", left: pct + "%", transform: "translateX(-50%)", fontSize: 9, color: "#475569", fontFamily: "monospace" }}>
                {new Date(start + (total * pct / 100)).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}
              </div>
            ))}
          </div>
        </div>
        {Object.values(phaseGroups).map(({ phase: ph, sprints }: any) => (
          <div key={ph.id} style={{ marginBottom: 24 }}>
            <div style={{ display: "grid", gridTemplateColumns: "200px 1fr", gap: 12, alignItems: "center", marginBottom: 8 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: ph.accent, fontFamily: "monospace" }}>PHASE {ph.num} — {ph.sub || ph.label}</div>
              <div style={{ height: 2, background: ph.accent + "30", borderRadius: 1 }} />
            </div>
            {sprints.map((s: any) => {
              const sStart = s.startDate ? new Date(s.startDate).getTime() : start;
              const sEnd   = s.endDate   ? new Date(s.endDate).getTime()   : end;
              const left   = total > 0 ? ((sStart - start) / total) * 100 : 0;
              const width  = total > 0 ? ((sEnd - sStart) / total) * 100 : 10;
              const done   = s.features.filter((f: any) => f.status === "DONE").length;
              const blk    = s.features.filter((f: any) => f.status === "BLOCKED").length;
              const pct    = s.features.length ? Math.round((done / s.features.length) * 100) : 0;
              const isExp  = !!expanded[s.id];
              const barColor = s.status === "DONE" ? "#00C97A" : blk > 0 ? "#EF4444" : s.status === "ACTIVE" ? ph.accent : "#1E3A5F";
              const byModule: Record<string, any[]> = {};
              s.features.forEach((f: any) => { const m = f.module ?? "General"; if (!byModule[m]) byModule[m] = []; byModule[m].push(f); });
              return (
                <div key={s.id} style={{ marginBottom: 4 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "200px 1fr", gap: 12, alignItems: "center", marginBottom: 2 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <button onClick={() => setExpanded(e => ({ ...e, [s.id]: !e[s.id] }))} style={{ background: "none", border: "none", color: "#64748B", cursor: "pointer", fontSize: 10, padding: 0, width: 14 }}>{isExp ? "▼" : "▶"}</button>
                      <span style={{ fontFamily: "monospace", fontSize: 9, color: ph.accent }}>{s.num}</span>
                      <span style={{ fontSize: 11, color: "#C8D8E8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.name}</span>
                    </div>
                    <div style={{ position: "relative", height: 28, background: "#0A1220", borderRadius: 6, overflow: "hidden", cursor: "pointer" }} onClick={() => setExpanded(e => ({ ...e, [s.id]: !e[s.id] }))}>
                      <div style={{ position: "absolute", left: `${Math.max(0, Math.min(left, 95))}%`, width: `${Math.max(3, Math.min(width, 100 - left))}%`, height: "100%", background: `linear-gradient(90deg,${barColor},${barColor}bb)`, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 8px", fontSize: 10, color: "#fff", fontFamily: "monospace" }}>
                        <span>{pct}%</span>{blk > 0 && <span style={{ color: "#FCA5A5" }}>⚠ {blk}</span>}
                      </div>
                    </div>
                  </div>
                  {isExp && (
                    <div style={{ marginLeft: 20, marginBottom: 8 }}>
                      {Object.entries(byModule).map(([module, features]: any) => (
                        <div key={module} style={{ marginBottom: 6 }}>
                          <div style={{ display: "grid", gridTemplateColumns: "200px 1fr", gap: 12, alignItems: "center", marginBottom: 2 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6, paddingLeft: 14 }}>
                              <span style={{ fontSize: 9, color: "#475569", background: "#0F1827", padding: "1px 6px", borderRadius: 3, fontWeight: 600 }}>📁 {module}</span>
                              <span style={{ fontSize: 9, color: "#475569" }}>{features.filter((f: any) => f.status === "DONE").length}/{features.length}</span>
                            </div>
                            <div style={{ height: 1, background: "#1A2E44" }} />
                          </div>
                          {features.map((f: any) => {
                            const fColor = f.status === "DONE" ? "#00C97A" : f.status === "BLOCKED" ? "#EF4444" : f.status === "IN_PROGRESS" ? "#3B82F6" : "#475569";
                            const fIcon  = f.status === "DONE" ? "✓" : f.status === "BLOCKED" ? "✕" : f.status === "IN_PROGRESS" ? "◐" : "○";
                            return (
                              <div key={f.id} style={{ display: "grid", gridTemplateColumns: "200px 1fr", gap: 12, alignItems: "center", marginBottom: 3 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 6, paddingLeft: 28 }}>
                                  <span style={{ fontSize: 10, color: fColor }}>{fIcon}</span>
                                  <span style={{ fontSize: 10, color: f.status === "DONE" ? "#475569" : "#94A3B8", textDecoration: f.status === "DONE" ? "line-through" : "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.title}</span>
                                  {(f.dependsOn?.length ?? 0) > 0 && <span style={{ fontSize: 8, color: "#F97316" }}>⬡</span>}
                                </div>
                                <div style={{ position: "relative", height: 18, background: "#060E18", borderRadius: 4, overflow: "hidden" }}>
                                  <div style={{ position: "absolute", left: `${Math.max(0, Math.min(left, 95))}%`, width: `${Math.max(1, Math.min(width, 100 - left))}%`, height: "100%", background: fColor + "40", borderLeft: `2px solid ${fColor}`, borderRadius: 3, display: "flex", alignItems: "center", paddingLeft: 6, fontSize: 9, color: fColor, fontFamily: "monospace" }}>
                                    <span style={{ fontSize: 8, color: PRIORITY_COLOR[f.priority as Priority], marginRight: 4 }}>●</span>{f.priority}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

function BacklogView({ allF, search, updateFeature, canEdit, onOpenNote }: any) {
  const [groupBy, setGroup] = useState<"sprint" | "status" | "module" | "priority">("sprint");
  const filtered = allF.filter((f: any) => !search || f.title.toLowerCase().includes(search.toLowerCase()));
  const grouped: Record<string, any[]> = {};
  filtered.forEach((f: any) => {
    const key = groupBy === "sprint" ? (f.sprintNum + " — " + f.sprintName) : groupBy === "status" ? STATUS_META[f.status as Status].label : groupBy === "module" ? (f.module ?? "Other") : f.priority;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(f);
  });
  return (
    <div>
      <div style={{ display: "flex", gap: 4, marginBottom: 20, alignItems: "center" }}>
        <span style={{ fontSize: 11, color: "#64748B" }}>Group:</span>
        {(["sprint", "status", "module", "priority"] as const).map(g => (
          <button key={g} onClick={() => setGroup(g)} style={{ padding: "4px 10px", borderRadius: 5, fontSize: 11, background: groupBy === g ? "#1E3A5F" : "#0F1827", color: groupBy === g ? "#E2EBF6" : "#64748B", border: "1px solid #1E3A5F", cursor: "pointer" }}>
            {g.charAt(0).toUpperCase() + g.slice(1)}
          </button>
        ))}
        <span style={{ fontSize: 11, color: "#64748B", marginLeft: "auto" }}>{filtered.length} features</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {Object.entries(grouped).map(([group, features]) => (
          <div key={group} style={{ background: "#0D1929", border: "1px solid #1E3A5F", borderRadius: 10, overflow: "hidden" }}>
            <div style={{ padding: "9px 16px", background: "#0A1220", display: "flex", alignItems: "center", gap: 10, borderBottom: "1px solid #1A2E44" }}>
              <span style={{ fontWeight: 600, fontSize: 13 }}>{group}</span>
              <span style={{ fontSize: 11, color: "#64748B", background: "#0F1827", padding: "1px 7px", borderRadius: 4 }}>{features.length}</span>
            </div>
            <div style={{ padding: "8px 14px", display: "flex", flexDirection: "column", gap: 4 }}>
              {features.map((f: any) => <FeatureRow key={f.id} feature={f} onUpdate={(patch: any) => updateFeature(f.id, patch)} canEdit={canEdit} onOpenNote={() => onOpenNote(f)} allF={allF} addFeatureDep={() => {}} removeFeatureDep={() => {}} />)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function DependenciesView({ project, allProjects, allF, canEdit, addProjectDep, removeProjectDep, addFeatureDep, removeFeatureDep }: any) {
  const blockedFeatures = allF.filter((f: any) => (f.dependsOn ?? []).length > 0);
  const availableProjects = allProjects.filter((p: any) => p.id !== project.id && !project.dependsOn.some((d: any) => d.dependsOnId === p.id));
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ background: "#0D1929", border: "1px solid #1E3A5F", borderRadius: 12, padding: "20px 24px" }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#E2EBF6", marginBottom: 16 }}>⬡ Project Dependencies</div>
        {project.dependsOn.length === 0 ? <div style={{ fontSize: 12, color: "#475569", fontStyle: "italic" }}>No project dependencies set.</div> : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
            {project.dependsOn.map((d: any) => (
              <div key={d.id} style={{ display: "flex", alignItems: "center", gap: 10, background: "#0A1220", border: "1px solid #1E3A5F", borderRadius: 8, padding: "10px 14px" }}>
                <span style={{ color: "#F97316" }}>⬡</span>
                <span style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>{d.dependsOn.name}</span>
                {canEdit && <button onClick={() => removeProjectDep(d.dependsOnId)} style={{ fontSize: 11, color: "#EF4444", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 6, padding: "3px 10px", cursor: "pointer" }}>Remove</button>}
              </div>
            ))}
          </div>
        )}
        {canEdit && availableProjects.length > 0 && (
          <select onChange={e => { if (e.target.value) { addProjectDep(e.target.value); e.target.value = ""; } }} style={{ background: "#0F1827", color: "#E2EBF6", border: "1px solid #1E3A5F", borderRadius: 8, padding: "8px 12px", fontSize: 12, outline: "none", width: "100%" }}>
            <option value="">+ Add project dependency…</option>
            {availableProjects.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        )}
      </div>
      <div style={{ background: "#0D1929", border: "1px solid #1E3A5F", borderRadius: 12, padding: "20px 24px" }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#E2EBF6", marginBottom: 16 }}>Feature Dependencies <span style={{ fontSize: 11, color: "#64748B", fontWeight: 400 }}>— {blockedFeatures.length} with dependencies</span></div>
        {blockedFeatures.length === 0 ? <div style={{ fontSize: 12, color: "#475569", fontStyle: "italic" }}>No feature dependencies. Open Board view and click ⬡.</div> : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {blockedFeatures.map((f: any) => {
              const blockers = (f.dependsOn ?? []).map((d: any) => ({ dep: d, blocker: allF.find((ff: any) => ff.id === d.dependsOnId) }));
              const allDone = blockers.every((b: any) => b.blocker?.status === "DONE");
              return (
                <div key={f.id} style={{ background: "#0A1220", border: `1px solid ${allDone ? "#1E3A5F" : "#F9731630"}`, borderRadius: 8, padding: "12px 14px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <span style={{ fontSize: 11, color: STATUS_META[f.status].color }}>{STATUS_META[f.status].icon}</span>
                    <span style={{ fontSize: 12, fontWeight: 600, flex: 1 }}>{f.title}</span>
                    {!allDone && <span style={{ fontSize: 9, color: "#F97316", fontWeight: 700 }}>WAITING</span>}
                    {allDone  && <span style={{ fontSize: 9, color: "#00C97A", fontWeight: 700 }}>UNBLOCKED</span>}
                  </div>
                  <div style={{ paddingLeft: 20 }}>
                    {blockers.map(({ dep, blocker }: any) => (
                      <div key={dep.dependsOnId} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                        <span style={{ fontSize: 9, color: "#475569" }}>needs →</span>
                        <span style={{ fontSize: 10, color: blocker?.status === "DONE" ? "#00C97A" : "#F97316" }}>{blocker?.status === "DONE" ? "✓" : "◐"}</span>
                        <span style={{ fontSize: 11, flex: 1, color: "#94A3B8" }}>{blocker?.title ?? dep.dependsOnId}</span>
                        {canEdit && <button onClick={() => removeFeatureDep(f.id, dep.dependsOnId)} style={{ fontSize: 9, color: "#EF4444", background: "none", border: "none", cursor: "pointer" }}>✕</button>}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <div style={{ background: "#0D1929", border: "1px solid #1E3A5F", borderRadius: 12, padding: "20px 24px" }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#E2EBF6", marginBottom: 16 }}>Impact Analysis</div>
        {(() => {
          const bc = allF.filter((f: any) => (f.dependsOn ?? []).some((d: any) => { const b = allF.find((ff: any) => ff.id === d.dependsOnId); return b && b.status !== "DONE"; })).length;
          const cc = allF.filter((f: any) => f.priority === "CRITICAL" && (f.dependsOn ?? []).some((d: any) => { const b = allF.find((ff: any) => ff.id === d.dependsOnId); return b && b.status !== "DONE"; })).length;
          return (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12 }}>
              {[{ label: "Waiting on dep", value: bc, color: bc > 0 ? "#F97316" : "#00C97A" }, { label: "Critical blocked", value: cc, color: cc > 0 ? "#EF4444" : "#00C97A" }, { label: "Project deps", value: project.dependsOn.length, color: "#E2EBF6" }].map(k => (
                <div key={k.label} style={{ background: "#0A1220", border: "1px solid #1E3A5F", borderRadius: 8, padding: "14px 16px", textAlign: "center" }}>
                  <div style={{ fontSize: 24, fontWeight: 800, color: k.color, fontFamily: "monospace" }}>{k.value}</div>
                  <div style={{ fontSize: 10, color: "#64748B", marginTop: 4 }}>{k.label}</div>
                </div>
              ))}
            </div>
          );
        })()}
      </div>
    </div>
  );
}

function MetricsView({ project, allF, phaseGroups }: any) {
  const byStatus = { DONE: 0, IN_PROGRESS: 0, TODO: 0, BLOCKED: 0 };
  allF.forEach((f: any) => { (byStatus as any)[f.status]++; });
  const total = allF.length;
  const pct   = total ? Math.round((byStatus.DONE / total) * 100) : 0;
  const activeSprint = project.sprints.find((s: any) => s.status === "ACTIVE");
  const atRiskSprints = project.sprints.filter((s: any) => { const b = s.features.filter((f: any) => f.status === "BLOCKED").length; return b >= 2 || (b > 0 && s.status === "ACTIVE"); });
  const byModule: Record<string, { done: number; total: number }> = {};
  allF.forEach((f: any) => { const m = f.module ?? "Other"; if (!byModule[m]) byModule[m] = { done: 0, total: 0 }; byModule[m].total++; if (f.status === "DONE") byModule[m].done++; });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px,1fr))", gap: 10 }}>
        {[{ label: "Total Features", value: total, color: "#E2EBF6" }, { label: "Done", value: `${byStatus.DONE} (${pct}%)`, color: "#00C97A" }, { label: "In Progress", value: byStatus.IN_PROGRESS, color: "#3B82F6" }, { label: "Blocked", value: byStatus.BLOCKED, color: "#EF4444" }, { label: "Sprints", value: project.sprints.length, color: "#E2EBF6" }, { label: "At Risk", value: atRiskSprints.length, color: atRiskSprints.length > 0 ? "#EF4444" : "#00C97A" }].map(k => (
          <div key={k.label} style={{ background: "#0D1929", border: "1px solid #1E3A5F", borderRadius: 10, padding: "14px 16px" }}>
            <div style={{ fontSize: 10, color: "#64748B", marginBottom: 6 }}>{k.label}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: k.color, fontFamily: "monospace" }}>{k.value}</div>
          </div>
        ))}
      </div>
      {atRiskSprints.length > 0 && (
        <div style={{ background: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 10, padding: "14px 18px" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#EF4444", marginBottom: 10 }}>⚠ SPRINTS AT RISK</div>
          {atRiskSprints.map((s: any) => { const b = s.features.filter((f: any) => f.status === "BLOCKED").length; return (<div key={s.id} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}><span style={{ fontFamily: "monospace", fontSize: 11, color: "#EF4444" }}>{s.num}</span><span style={{ fontSize: 12 }}>{s.name}</span><span style={{ fontSize: 10, color: "#EF4444" }}>{b} blocked</span></div>); })}
        </div>
      )}
      <div style={{ background: "#0D1929", border: "1px solid #1E3A5F", borderRadius: 10, padding: "18px 22px" }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: "#E2EBF6", marginBottom: 14, letterSpacing: "0.05em" }}>PHASE PROGRESS</div>
        {Object.values(phaseGroups).map(({ phase: ph, sprints }: any) => { const phF = sprints.flatMap((s: any) => s.features); const phDone = phF.filter((f: any) => f.status === "DONE").length; const phPct = phF.length ? Math.round((phDone / phF.length) * 100) : 0; return (<div key={ph.id} style={{ marginBottom: 12 }}><div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}><span style={{ fontSize: 12, color: ph.accent, fontWeight: 600 }}>Phase {ph.num} — {ph.sub || ph.label}</span><span style={{ fontFamily: "monospace", fontSize: 11, color: phPct === 100 ? "#00C97A" : "#E2EBF6" }}>{phDone}/{phF.length} · {phPct}%</span></div><div style={{ height: 6, background: "#1E3A5F", borderRadius: 3, overflow: "hidden" }}><div style={{ height: "100%", width: phPct + "%", background: phPct === 100 ? "#00C97A" : `linear-gradient(90deg,${ph.accent},${ph.accent}bb)`, borderRadius: 3, transition: "width 0.5s" }} /></div></div>); })}
      </div>
      <div style={{ background: "#0D1929", border: "1px solid #1E3A5F", borderRadius: 10, padding: "18px 22px" }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: "#E2EBF6", marginBottom: 14, letterSpacing: "0.05em" }}>MODULE BREAKDOWN</div>
        {Object.entries(byModule).sort((a, b) => b[1].total - a[1].total).map(([mod, c]) => { const p = c.total ? Math.round((c.done / c.total) * 100) : 0; return (<div key={mod} style={{ display: "grid", gridTemplateColumns: "120px 1fr 60px 50px", alignItems: "center", gap: 10, marginBottom: 8 }}><span style={{ fontSize: 11 }}>{mod}</span><div style={{ height: 5, background: "#1E3A5F", borderRadius: 2, overflow: "hidden" }}><div style={{ height: "100%", width: p + "%", background: p === 100 ? "#00C97A" : "#007A73", borderRadius: 2 }} /></div><span style={{ fontSize: 10, color: "#64748B", fontFamily: "monospace" }}>{c.done}/{c.total}</span><span style={{ fontSize: 10, color: p === 100 ? "#00C97A" : "#E2EBF6", fontFamily: "monospace" }}>{p}%</span></div>); })}
      </div>
      {activeSprint && (
        <div style={{ background: "#0D1929", border: "1px solid #3B82F6", borderRadius: 10, padding: "18px 22px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#3B82F6" }} />
            <span style={{ fontSize: 11, fontWeight: 600, color: "#3B82F6" }}>ACTIVE SPRINT</span>
            <span style={{ fontSize: 13, fontWeight: 600 }}>{activeSprint.num} — {activeSprint.name}</span>
          </div>
          <p style={{ fontSize: 11, color: "#64748B", marginBottom: 14 }}>{activeSprint.goal}</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8 }}>
            {(["TODO", "IN_PROGRESS", "DONE", "BLOCKED"] as Status[]).map(st => { const n = activeSprint.features.filter((f: any) => f.status === st).length; const m = STATUS_META[st]; return (<div key={st} style={{ background: "#0A1220", border: `1px solid ${m.color}30`, borderRadius: 8, padding: "10px 12px", textAlign: "center" }}><div style={{ fontSize: 20, fontWeight: 700, color: m.color, fontFamily: "monospace" }}>{n}</div><div style={{ fontSize: 10, color: "#64748B", marginTop: 2 }}>{m.label}</div></div>); })}
          </div>
        </div>
      )}
    </div>
  );
}
