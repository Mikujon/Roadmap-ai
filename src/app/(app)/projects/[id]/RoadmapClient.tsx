"use client";
import { useState, useCallback, useEffect } from "react";
import FinancialsView from "./FinancialsView";
import GovernanceView from "./GovernanceView";
import BoardView from "./BoardView";
import OverviewView from "./OverviewView";
import { ErrorBoundary } from "./ErrorBoundary";
import { useProject } from "./useProject";

type Status = "TODO" | "IN_PROGRESS" | "DONE" | "BLOCKED";
type Priority = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
type SprintStatus = "UPCOMING" | "ACTIVE" | "DONE";

interface FeatureDep { id: string; dependsOnId: string; }
interface Feature {
  id: string; title: string; module?: string; status: Status; priority: Priority;
  notes?: string; dependsOn: FeatureDep[];
  estimatedHours: number; actualHours: number;
}
interface Sprint  { id: string; num: string; name: string; goal?: string; status: SprintStatus; startDate?: string; endDate?: string; features: Feature[]; }
interface Phase   { id: string; num: number; label: string; sub?: string; accent: string; }
interface ProjectDep { id: string; dependsOnId: string; dependsOn: { id: string; name: string; } }
interface Risk { id: string; title: string; description?: string; probability: number; impact: number; status: string; mitigation?: string; ownerName?: string; category?: string; }
interface Resource { id: string; name: string; role: string; costPerHour: number; }
interface Assignment { id: string; estimatedHours: number; actualHours: number; resource: Resource; }
interface Department { id: string; name: string; color: string; }
interface Requester { id: string; name?: string; email: string; }
interface Project {
  id: string; name: string; description?: string; startDate: string; endDate: string;
  budgetTotal: number; costActual: number; revenueExpected: number; status: string;
  phases: Phase[]; sprints: Sprint[]; shareToken?: string; shareEnabled: boolean;
  dependsOn: ProjectDep[]; risks: Risk[]; assignments: Assignment[];
  departments: Department[]; requestedBy?: Requester;
}

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
const PROJECT_STATUS_META: Record<string, { label: string; color: string; bg: string; border: string }> = {
  NOT_STARTED: { label: "Not Started", color: "#64748B", bg: "#F8FAFC",  border: "#E2E8F0" },
  ACTIVE:      { label: "Active",      color: "#059669", bg: "#ECFDF5",  border: "#A7F3D0" },
  PAUSED:      { label: "Paused",      color: "#D97706", bg: "#FFFBEB",  border: "#FDE68A" },
  COMPLETED:   { label: "Completed",   color: "#2563EB", bg: "#EFF6FF",  border: "#BFDBFE" },
  CLOSED:      { label: "Closed",      color: "#94A3B8", bg: "#F8FAFC",  border: "#E2E8F0" },
  ARCHIVED:    { label: "Archived",    color: "#94A3B8", bg: "#F8FAFC",  border: "#E2E8F0" },
};
const RISK_SCORE_COLOR = (s: number) => s >= 15 ? "#DC2626" : s >= 8 ? "#EA580C" : s >= 4 ? "#D97706" : "#059669";
const RISK_SCORE_BG    = (s: number) => s >= 15 ? "#FEF2F2" : s >= 8 ? "#FFF7ED" : s >= 4 ? "#FFFBEB" : "#ECFDF5";
const RISK_SCORE_LABEL = (s: number) => s >= 15 ? "CRITICAL" : s >= 8 ? "HIGH" : s >= 4 ? "MEDIUM" : "LOW";

type TabId = "overview" | "board" | "timeline" | "financials" | "risks" | "governance";
const TABS: { id: TabId; label: string }[] = [
  { id: "overview",    label: "Overview"    },
  { id: "board",       label: "Board"       },
  { id: "timeline",    label: "Timeline"    },
  { id: "financials",  label: "Financials"  },
  { id: "risks",       label: "Risks"       },
  { id: "governance",  label: "Governance"  },
];

// ── Guardian Strip ────────────────────────────────────────────────────────────
function GuardianStrip({ projectId }: { projectId: string }) {
  const [insight, setInsight]     = useState<string | null>(null);
  const [healthScore, setScore]   = useState<number | null>(null);
  const [loading, setLoading]     = useState(true);
  const [expanded, setExpanded]   = useState(false);
  const [report, setReport]       = useState<any>(null);

  useEffect(() => {
    fetch(`/api/guardian/${projectId}`)
      .then(r => r.json())
      .then(data => {
        setReport(data);
        setScore(data.healthScore ?? null);
        const topAlert = data.alerts?.[0] ?? data.criticalAlerts?.[0];
        if (topAlert) setInsight(topAlert.detail ?? topAlert.title);
        else if (data.recommendations?.[0]) setInsight(data.recommendations[0]);
        else setInsight("Project is on track — no critical issues detected.");
      })
      .catch(() => setInsight(null))
      .finally(() => setLoading(false));
  }, [projectId]);

  const hsColor = healthScore !== null
    ? (healthScore >= 80 ? "#059669" : healthScore >= 60 ? "#D97706" : "#DC2626")
    : "#94A3B8";

  const criticalCount = report?.alerts?.filter((a: any) => a.level === "critical").length
    ?? report?.criticalAlerts?.length ?? 0;

  return (
    <div style={{ background: criticalCount > 0 ? "#FEF9F9" : "#FAFBFC", borderBottom: "1px solid #E2E8F0" }}>
      {/* Strip */}
      <div style={{ padding: "9px 28px", display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ fontSize: 13 }}>🛡️</span>
        <span style={{ fontSize: 10, fontWeight: 700, color: "#006D6B", textTransform: "uppercase", letterSpacing: "0.07em", flexShrink: 0 }}>Guardian AI</span>
        {healthScore !== null && (
          <span style={{ fontSize: 12, fontWeight: 800, color: hsColor, flexShrink: 0, minWidth: 24, textAlign: "center" }}>{healthScore}</span>
        )}
        <span style={{ fontSize: 12, color: loading ? "#CBD5E1" : criticalCount > 0 ? "#DC2626" : "#64748B", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {loading ? "Analyzing project…" : insight ?? ""}
        </span>
        <button
          onClick={() => setExpanded(e => !e)}
          style={{ fontSize: 11, color: "#006D6B", fontWeight: 600, background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", flexShrink: 0, padding: 0 }}
        >
          {expanded ? "Hide ↑" : "Full analysis ↓"}
        </button>
      </div>

      {/* Expanded panel */}
      {expanded && report && (
        <div style={{ padding: "14px 28px 18px", borderTop: "1px solid #F1F5F9" }}>
          {/* Score row */}
          {report.progressReal !== undefined && (
            <div style={{ display: "flex", gap: 20, marginBottom: 14, flexWrap: "wrap" }}>
              {[
                { label: "Health Score",    value: `${report.healthScore ?? "—"}` },
                { label: "Real Progress",   value: `${Math.round(report.progressReal ?? 0)}%` },
                { label: "On-Time Prob.",   value: `${report.onTrackProbability ?? "—"}%` },
                { label: "Est. Delay",      value: report.estimatedDelay > 0 ? `+${report.estimatedDelay}d` : "None" },
              ].map(m => (
                <div key={m.label} style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 16, fontWeight: 800, color: "#0F172A" }}>{m.value}</div>
                  <div style={{ fontSize: 10, color: "#94A3B8", fontWeight: 600 }}>{m.label}</div>
                </div>
              ))}
            </div>
          )}

          {/* Alerts */}
          {(report.alerts ?? [...(report.criticalAlerts ?? []), ...(report.warningAlerts ?? [])]).slice(0, 4).map((a: any) => (
            <div key={a.id} style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 8, padding: "8px 12px", background: a.level === "critical" ? "#FEF2F2" : a.level === "warning" ? "#FFFBEB" : "#F8FAFC", borderRadius: 8 }}>
              <span style={{ fontSize: 11, flexShrink: 0, marginTop: 1 }}>{a.level === "critical" ? "🔴" : a.level === "warning" ? "🟡" : "🔵"}</span>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#0F172A" }}>{a.title}</div>
                {a.detail && <div style={{ fontSize: 11, color: "#64748B", marginTop: 2 }}>{a.detail}</div>}
              </div>
            </div>
          ))}

          {/* Recommendations */}
          {report.recommendations?.length > 0 && (
            <div style={{ marginTop: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>Recommendations</div>
              {report.recommendations.slice(0, 3).map((r: string, i: number) => (
                <div key={i} style={{ fontSize: 12, color: "#475569", padding: "4px 0", display: "flex", gap: 8 }}>
                  <span style={{ color: "#006D6B", fontWeight: 700, flexShrink: 0 }}>→</span>
                  {r}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Risks View ────────────────────────────────────────────────────────────────
function RisksView({ project, canEdit }: { project: any; canEdit: boolean }) {
  const [risks, setRisks]   = useState<Risk[]>(project.risks ?? []);
  const [adding, setAdding] = useState(false);
  const [form, setForm]     = useState({ title: "", probability: 3, impact: 3, category: "Technical", mitigation: "" });
  const [saving, setSaving] = useState(false);

  const openRisks   = risks.filter(r => r.status === "OPEN").length;
  const critRisks   = risks.filter(r => r.status === "OPEN" && r.probability * r.impact >= 15).length;
  const highRisks   = risks.filter(r => r.status === "OPEN" && r.probability * r.impact >= 8 && r.probability * r.impact < 15).length;
  const mitigated   = risks.filter(r => r.status === "MITIGATED").length;

  const addRisk = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/projects/${project.id}/risks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const newRisk = await res.json();
      setRisks(r => [newRisk, ...r]);
      setForm({ title: "", probability: 3, impact: 3, category: "Technical", mitigation: "" });
      setAdding(false);
    } finally {
      setSaving(false);
    }
  };

  const changeStatus = async (riskId: string, newStatus: string) => {
    setRisks(rs => rs.map(r => r.id === riskId ? { ...r, status: newStatus } : r));
    await fetch(`/api/projects/${project.id}/risks/${riskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
  };

  const sorted = [...risks].sort((a, b) => (b.probability * b.impact) - (a.probability * a.impact));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* Summary KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
        {[
          { label: "Open Risks",  value: openRisks,  color: openRisks  > 0 ? "#DC2626" : "#059669" },
          { label: "Critical",    value: critRisks,  color: critRisks  > 0 ? "#DC2626" : "#059669" },
          { label: "High",        value: highRisks,  color: highRisks  > 0 ? "#EA580C" : "#059669" },
          { label: "Mitigated",   value: mitigated,  color: "#2563EB"                               },
        ].map(k => (
          <div key={k.label} style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 12, padding: "16px 18px" }}>
            <div style={{ fontSize: 10, color: "#94A3B8", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8 }}>{k.label}</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: k.color, letterSpacing: "-1px" }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Risk matrix (5×5) */}
      <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 14, padding: "20px 24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#0F172A" }}>Risk Matrix</div>
          <div style={{ display: "flex", gap: 14, fontSize: 11, color: "#64748B" }}>
            {[{ color: "#DC2626", label: "Critical (≥15)" }, { color: "#EA580C", label: "High (8-14)" }, { color: "#D97706", label: "Medium (4-7)" }, { color: "#059669", label: "Low (<4)" }].map(l => (
              <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <div style={{ width: 8, height: 8, borderRadius: 2, background: l.color }} />
                {l.label}
              </div>
            ))}
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "40px repeat(5, 1fr)", gap: 4 }}>
          {/* Y-axis label */}
          <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-around", alignItems: "center" }}>
            {[5,4,3,2,1].map(p => (
              <div key={p} style={{ fontSize: 10, color: "#94A3B8", fontWeight: 600 }}>{p}</div>
            ))}
          </div>
          {/* Matrix cells */}
          {[5,4,3,2,1].map(prob => (
            [1,2,3,4,5].map(imp => {
              const score = prob * imp;
              const bg = score >= 15 ? "#FEF2F2" : score >= 8 ? "#FFF7ED" : score >= 4 ? "#FFFBEB" : "#F0FDF4";
              const dotsHere = risks.filter(r => r.probability === prob && r.impact === imp && r.status === "OPEN");
              return (
                <div key={`${prob}-${imp}`} style={{ background: bg, borderRadius: 6, height: 44, display: "flex", alignItems: "center", justifyContent: "center", flexWrap: "wrap", gap: 3, padding: 4, position: "relative" }}>
                  {dotsHere.map(r => (
                    <div key={r.id} title={r.title} style={{ width: 10, height: 10, borderRadius: "50%", background: RISK_SCORE_COLOR(score), border: "1.5px solid #fff", cursor: "default" }} />
                  ))}
                </div>
              );
            })
          ))}
        </div>
        {/* X-axis */}
        <div style={{ display: "grid", gridTemplateColumns: "40px repeat(5, 1fr)", gap: 4, marginTop: 4 }}>
          <div />
          {[1,2,3,4,5].map(n => <div key={n} style={{ fontSize: 10, color: "#94A3B8", fontWeight: 600, textAlign: "center" }}>{n}</div>)}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4, paddingLeft: 40 }}>
          <div style={{ fontSize: 10, color: "#94A3B8" }}>← Probability</div>
          <div style={{ fontSize: 10, color: "#94A3B8" }}>Impact →</div>
        </div>
      </div>

      {/* Risk list */}
      <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 14, overflow: "hidden" }}>
        <div style={{ padding: "16px 22px", borderBottom: "1px solid #F1F5F9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#0F172A" }}>Risk Register</div>
          {canEdit && (
            <button onClick={() => setAdding(a => !a)} style={{ fontSize: 12, fontWeight: 600, color: "#006D6B", background: "#F0FDFA", border: "1px solid #A7F3D0", padding: "6px 14px", borderRadius: 8, cursor: "pointer", fontFamily: "inherit" }}>
              {adding ? "Cancel" : "+ Add Risk"}
            </button>
          )}
        </div>

        {/* Add form */}
        {adding && (
          <div style={{ padding: "16px 22px", background: "#F8FAFC", borderBottom: "1px solid #F1F5F9", display: "flex", flexDirection: "column", gap: 12 }}>
            <input
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="Risk title…"
              style={{ background: "#fff", border: "1.5px solid #E2E8F0", borderRadius: 8, padding: "9px 12px", fontSize: 13, outline: "none", fontFamily: "inherit", color: "#0F172A" }}
            />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
              {[
                { label: "Probability (1-5)", key: "probability", value: form.probability },
                { label: "Impact (1-5)",      key: "impact",      value: form.impact      },
              ].map(f => (
                <div key={f.key}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 5 }}>{f.label}</div>
                  <input
                    type="number" min={1} max={5}
                    value={f.value}
                    onChange={e => setForm(prev => ({ ...prev, [f.key]: Number(e.target.value) }))}
                    style={{ width: "100%", background: "#fff", border: "1.5px solid #E2E8F0", borderRadius: 8, padding: "8px 12px", fontSize: 13, outline: "none", fontFamily: "inherit" }}
                  />
                </div>
              ))}
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 5 }}>Category</div>
                <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} style={{ width: "100%", background: "#fff", border: "1.5px solid #E2E8F0", borderRadius: 8, padding: "8px 12px", fontSize: 13, outline: "none", fontFamily: "inherit" }}>
                  {["Technical","Resource","Budget","Schedule","Scope","External","Compliance","Other"].map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <textarea
              value={form.mitigation}
              onChange={e => setForm(f => ({ ...f, mitigation: e.target.value }))}
              placeholder="Mitigation plan (optional)…"
              rows={2}
              style={{ background: "#fff", border: "1.5px solid #E2E8F0", borderRadius: 8, padding: "9px 12px", fontSize: 13, outline: "none", fontFamily: "inherit", resize: "vertical", color: "#0F172A" }}
            />
            <button onClick={addRisk} disabled={saving} style={{ alignSelf: "flex-start", background: "#006D6B", color: "#fff", border: "none", borderRadius: 8, padding: "9px 20px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", opacity: saving ? 0.7 : 1 }}>
              {saving ? "Saving…" : "Add Risk"}
            </button>
          </div>
        )}

        {sorted.length === 0 ? (
          <div style={{ padding: "40px 24px", textAlign: "center", color: "#94A3B8", fontSize: 13 }}>No risks logged yet.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column" }}>
            {sorted.map((r, i) => {
              const score = r.probability * r.impact;
              return (
                <div key={r.id} style={{ padding: "14px 22px", borderBottom: i < sorted.length - 1 ? "1px solid #F8FAFC" : "none", display: "flex", gap: 14, alignItems: "center", opacity: r.status === "CLOSED" ? 0.55 : 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 900, color: RISK_SCORE_COLOR(score), minWidth: 28, textAlign: "center" }}>{score}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#0F172A", marginBottom: 2 }}>{r.title}</div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 10, fontWeight: 700, color: RISK_SCORE_COLOR(score), background: RISK_SCORE_BG(score), padding: "1px 7px", borderRadius: 10 }}>{RISK_SCORE_LABEL(score)}</span>
                      {r.category && <span style={{ fontSize: 10, color: "#64748B", background: "#F1F5F9", padding: "1px 7px", borderRadius: 10 }}>{r.category}</span>}
                      {r.ownerName && <span style={{ fontSize: 10, color: "#64748B" }}>Owner: {r.ownerName}</span>}
                    </div>
                    {r.mitigation && <div style={{ fontSize: 11, color: "#64748B", marginTop: 4 }}>Mitigation: {r.mitigation}</div>}
                  </div>
                  {canEdit && r.status === "OPEN" && (
                    <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                      <button onClick={() => changeStatus(r.id, "MITIGATED")} style={{ fontSize: 11, color: "#D97706", background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 7, padding: "4px 10px", cursor: "pointer", fontFamily: "inherit", fontWeight: 600 }}>Mitigate</button>
                      <button onClick={() => changeStatus(r.id, "CLOSED")}    style={{ fontSize: 11, color: "#059669", background: "#ECFDF5", border: "1px solid #A7F3D0", borderRadius: 7, padding: "4px 10px", cursor: "pointer", fontFamily: "inherit", fontWeight: 600 }}>Close</button>
                    </div>
                  )}
                  {r.status !== "OPEN" && (
                    <span style={{ fontSize: 10, fontWeight: 700, color: r.status === "MITIGATED" ? "#D97706" : "#059669", background: r.status === "MITIGATED" ? "#FFFBEB" : "#ECFDF5", border: `1px solid ${r.status === "MITIGATED" ? "#FDE68A" : "#A7F3D0"}`, padding: "3px 10px", borderRadius: 20, flexShrink: 0 }}>{r.status}</span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function RoadmapClient({
  project: initial, role, allProjects = [], allMembers = [], allDepartments = [], allResources = []
}: {
  project: Project; role: string;
  allProjects?: { id: string; name: string }[];
  allMembers?: { id: string; name?: string; email: string }[];
  allResources?: { id: string; name: string; role: string; costPerHour: number }[];
  allDepartments?: { id: string; name: string; color: string }[];
}) {
  const {
    project, setProject, saving, projectStatus, setProjectStatus,
    shareUrl, setCopied, copied, noteDrawer, setNoteDrawer, noteText, setNoteText,
    statusChangeModal, setStatusChangeModal, updateFeature, updateSprint,
    confirmStatusChange, toggleShare, openNote, saveNote,
    addProjectDep, removeProjectDep, addFeatureDep, removeFeatureDep,
    allF, totalPct, daysLeft,
  } = useProject(initial);

  const [view, setView]       = useState<TabId>("overview");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [search, setSearch]   = useState("");
  const canEdit = role === "ADMIN" || role === "MANAGER";
  const isAdmin = role === "ADMIN";

  // Support ?tab=xxx URL param for deep-linking from Command Center
  useEffect(() => {
    const tab = new URLSearchParams(window.location.search).get("tab") as TabId | null;
    if (tab && TABS.some(t => t.id === tab)) setView(tab);
  }, []);

  const phaseGroups: Record<number, { phase: Phase; sprints: any[] }> = {};
  project.phases.forEach(ph => { phaseGroups[ph.num] = { phase: ph, sprints: [] }; });
  project.sprints.forEach((s, i) => {
    const phIdx = Math.floor(i / Math.ceil(project.sprints.length / Math.max(project.phases.length, 1)));
    const ph = project.phases[Math.min(phIdx, project.phases.length - 1)];
    if (ph && phaseGroups[ph.num]) phaseGroups[ph.num].sprints.push(s);
  });

  const ROLE_META: Record<string, { color: string; bg: string }> = {
    ADMIN:   { color: "#006D6B", bg: "rgba(0,109,107,0.1)" },
    MANAGER: { color: "#2563EB", bg: "rgba(37,99,235,0.1)" },
    VIEWER:  { color: "#64748B", bg: "rgba(100,116,139,0.1)" },
  };
  const rm  = ROLE_META[role] ?? ROLE_META.VIEWER;
  const psm = PROJECT_STATUS_META[projectStatus] ?? PROJECT_STATUS_META.ACTIVE;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        *{box-sizing:border-box}
        .tab-btn{padding:6px 16px;border-radius:8px;font-size:12px;font-weight:600;border:none;cursor:pointer;font-family:'Plus Jakarta Sans',sans-serif;transition:all 0.15s}
        .tab-btn.active{background:#fff;color:#0F172A;box-shadow:0 1px 4px rgba(0,0,0,0.08)}
        .tab-btn:not(.active){background:transparent;color:#64748B}
        .tab-btn:not(.active):hover{color:#0F172A;background:rgba(255,255,255,0.5)}
        .progress-bar{height:5px;background:#F1F5F9;border-radius:3px;overflow:hidden}
        .progress-fill{height:100%;border-radius:3px;transition:width 0.4s}
        .feature-row{display:flex;align-items:center;gap:8px;padding:7px 10px;border-radius:8px;background:#F8FAFC;border:1px solid #F1F5F9;transition:background 0.1s}
        .feature-row:hover{background:#F1F5F9}
        .sprint-card{background:#fff;border-radius:12px;border:1px solid #E2E8F0;overflow:hidden;transition:box-shadow 0.15s}
        .sprint-card:hover{box-shadow:0 4px 16px rgba(0,0,0,0.06)}
        select.light{background:#F8FAFC;border:1.5px solid #E2E8F0;border-radius:8px;padding:8px 12px;color:#0F172A;font-size:13px;font-family:'Plus Jakarta Sans',sans-serif;outline:none;width:100%}
        select.light:focus{border-color:#006D6B}
        .field-input{background:#F8FAFC;border:1.5px solid #E2E8F0;border-radius:8px;padding:9px 12px;color:#0F172A;font-size:13px;font-family:'Plus Jakarta Sans',sans-serif;outline:none}
        .field-input:focus{border-color:#006D6B;background:#fff}
        .status-select{border-radius:8px;font-size:11px;font-weight:700;padding:5px 10px;cursor:pointer;font-family:'Plus Jakarta Sans',sans-serif;outline:none;border-width:1.5px;border-style:solid;}
      `}</style>

      <div style={{ minHeight: "100vh", background: "#F0F2F5", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>

        {/* Sticky header */}
        <div style={{ background: "#fff", borderBottom: "1px solid #E2E8F0", padding: "14px 28px", display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap", position: "sticky", top: 0, zIndex: 10 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: "#0F172A", letterSpacing: "-0.3px", marginBottom: 2 }}>{project.name}</div>
            <div style={{ fontSize: 11, color: "#94A3B8", display: "flex", alignItems: "center", gap: 10 }}>
              <span>{project.startDate?.slice(0,10)} → {project.endDate?.slice(0,10)}</span>
              <span style={{ color: daysLeft < 0 ? "#DC2626" : daysLeft <= 7 ? "#D97706" : "#94A3B8", fontWeight: 600 }}>
                {daysLeft >= 0 ? `${daysLeft}d left` : `${Math.abs(daysLeft)}d overdue`}
              </span>
            </div>
          </div>

          {/* Progress */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 80, height: 5, background: "#F1F5F9", borderRadius: 3, overflow: "hidden" }}>
              <div style={{ height: "100%", width: totalPct + "%", background: "linear-gradient(90deg,#006D6B,#2563EB)", borderRadius: 3 }} />
            </div>
            <span style={{ fontSize: 12, color: "#006D6B", fontWeight: 700 }}>{totalPct}%</span>
          </div>

          {canEdit && (
            <button onClick={toggleShare} style={{ padding: "6px 14px", background: shareUrl ? "#ECFDF5" : "#F8FAFC", border: `1px solid ${shareUrl ? "#A7F3D0" : "#E2E8F0"}`, borderRadius: 8, fontSize: 11, color: shareUrl ? "#059669" : "#64748B", cursor: "pointer", fontWeight: 600, fontFamily: "inherit" }}>
              {shareUrl ? "🔗 Shared" : "Share"}
            </button>
          )}
          {shareUrl && (
            <button onClick={() => { navigator.clipboard.writeText(shareUrl); setCopied(true); setTimeout(() => setCopied(false), 2000); }} style={{ padding: "6px 14px", background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 8, fontSize: 11, color: "#64748B", cursor: "pointer", fontFamily: "inherit" }}>
              {copied ? "Copied!" : "Copy link"}
            </button>
          )}
          {saving && <span style={{ fontSize: 11, color: "#006D6B", fontWeight: 600 }}>● saving</span>}
          <span style={{ fontSize: 10, fontWeight: 700, color: rm.color, background: rm.bg, padding: "3px 10px", borderRadius: 20 }}>{role}</span>

          {canEdit ? (
            <select
              value={projectStatus}
              onChange={e => setStatusChangeModal({ newStatus: e.target.value, note: "" })}
              className="status-select"
              style={{ background: psm.bg, color: psm.color, borderColor: psm.border }}
            >
              <option value="NOT_STARTED">Not Started</option>
              <option value="ACTIVE">Active</option>
              <option value="PAUSED">Paused</option>
              <option value="COMPLETED">Completed</option>
              <option value="CLOSED">Closed</option>
              <option value="ARCHIVED">Archived</option>
            </select>
          ) : (
            <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 10, fontWeight: 700, background: psm.bg, color: psm.color, border: `1px solid ${psm.border}` }}>{psm.label}</span>
          )}

          {/* Tabs */}
          <div style={{ display: "flex", gap: 2, background: "#F1F5F9", borderRadius: 10, padding: 3 }}>
            {TABS.map(t => (
              <button key={t.id} onClick={() => setView(t.id)} className={`tab-btn${view === t.id ? " active" : ""}`}>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Guardian strip — always visible */}
        <GuardianStrip projectId={project.id} />

        {/* Search bar for board */}
        {view === "board" && (
          <div style={{ padding: "10px 28px", background: "#fff", borderBottom: "1px solid #F1F5F9" }}>
            <input className="field-input" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search features…" style={{ width: 220 }} />
          </div>
        )}

        {/* Tab content */}
        <div style={{ padding: "24px 28px" }}>
          {view === "overview" && (
            <ErrorBoundary name="Overview">
              <OverviewView project={project} allF={allF} allMembers={allMembers} allDepartments={allDepartments} allResources={allResources} canEdit={canEdit} setProject={setProject} />
            </ErrorBoundary>
          )}
          {view === "board" && (
            <ErrorBoundary name="Board">
              <BoardView phaseGroups={phaseGroups} expanded={expanded} setExpanded={setExpanded} updateFeature={updateFeature} updateSprint={updateSprint} canEdit={canEdit} search={search} onOpenNote={openNote} allF={allF} addFeatureDep={addFeatureDep} removeFeatureDep={removeFeatureDep} projectStart={project.startDate} projectEnd={project.endDate} />
            </ErrorBoundary>
          )}
          {view === "timeline" && <TimelineView project={project} phaseGroups={phaseGroups} allF={allF} />}
          {view === "financials" && <FinancialsView projectId={project.id} canEdit={canEdit} />}
          {view === "risks" && <RisksView project={project} canEdit={canEdit} />}
          {view === "governance" && <GovernanceView projectId={project.id} canEdit={canEdit} />}
        </div>
      </div>

      {/* Note drawer */}
      {noteDrawer && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)", zIndex: 100, display: "flex", justifyContent: "flex-end" }} onClick={() => setNoteDrawer(null)}>
          <div style={{ width: 420, background: "#fff", borderLeft: "1px solid #E2E8F0", padding: 28, display: "flex", flexDirection: "column", gap: 16, boxShadow: "-4px 0 24px rgba(0,0,0,0.08)" }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontWeight: 700, fontSize: 15, color: "#0F172A" }}>Feature Notes</span>
              <button onClick={() => setNoteDrawer(null)} style={{ background: "none", border: "none", color: "#94A3B8", cursor: "pointer", fontSize: 18 }}>✕</button>
            </div>
            <div style={{ fontSize: 14, color: "#0F172A", fontWeight: 600 }}>{noteDrawer.title}</div>
            <textarea value={noteText} onChange={e => setNoteText(e.target.value)} placeholder="Add notes, acceptance criteria, links…" rows={12} style={{ background: "#F8FAFC", color: "#0F172A", border: "1.5px solid #E2E8F0", borderRadius: 10, padding: "12px 14px", fontSize: 13, outline: "none", resize: "vertical", lineHeight: 1.6, fontFamily: "inherit" }} />
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={saveNote} style={{ flex: 1, padding: "10px", background: "#006D6B", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Save Notes</button>
              <button onClick={() => setNoteDrawer(null)} style={{ padding: "10px 16px", background: "#F8FAFC", color: "#64748B", border: "1px solid #E2E8F0", borderRadius: 8, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Status change modal */}
      {statusChangeModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#fff", borderRadius: 16, padding: 28, width: 440, boxShadow: "0 20px 60px rgba(0,0,0,0.15)" }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#0F172A", marginBottom: 6 }}>
              Change status to "{PROJECT_STATUS_META[statusChangeModal.newStatus]?.label}"
            </div>
            <div style={{ fontSize: 12, color: "#94A3B8", marginBottom: 20 }}>
              Add a note explaining why — visible to Guardian AI and the team.
            </div>
            <textarea
              value={statusChangeModal.note}
              onChange={e => setStatusChangeModal(s => s ? { ...s, note: e.target.value } : null)}
              placeholder={
                statusChangeModal.newStatus === "PAUSED"   ? "Why is this project paused?" :
                statusChangeModal.newStatus === "CLOSED"   ? "Why is this project being closed?" :
                statusChangeModal.newStatus === "ARCHIVED" ? "Archiving reason?" :
                "Reason for status change…"
              }
              rows={4}
              style={{ width: "100%", background: "#F8FAFC", border: "1.5px solid #E2E8F0", borderRadius: 10, padding: "12px 14px", fontSize: 13, outline: "none", resize: "vertical", fontFamily: "inherit", color: "#0F172A", marginBottom: 16 }}
              autoFocus
            />
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={confirmStatusChange} style={{ flex: 1, padding: "10px", background: "#006D6B", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Confirm</button>
              <button onClick={() => setStatusChangeModal(null)} style={{ padding: "10px 16px", background: "#F8FAFC", color: "#64748B", border: "1px solid #E2E8F0", borderRadius: 8, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ── Timeline (Gantt) ──────────────────────────────────────────────────────────
function TimelineView({ project, phaseGroups }: any) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const start = new Date(project.startDate).getTime();
  const end   = new Date(project.endDate).getTime();
  const total = end - start;

  return (
    <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 14, overflow: "hidden" }}>
      <div style={{ padding: "16px 20px", borderBottom: "1px solid #F1F5F9", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: "#0F172A" }}>Timeline</span>
        <div style={{ display: "flex", gap: 16, fontSize: 11 }}>
          {[{ color: "#059669", label: "Done" }, { color: "#2563EB", label: "Active" }, { color: "#CBD5E1", label: "Upcoming" }, { color: "#DC2626", label: "Blocked" }].map(l => (
            <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <div style={{ width: 8, height: 8, borderRadius: 2, background: l.color }} />
              <span style={{ color: "#64748B", fontWeight: 500 }}>{l.label}</span>
            </div>
          ))}
        </div>
      </div>
      <div style={{ padding: "16px 20px", overflowX: "auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "200px 1fr", gap: 12, marginBottom: 12 }}>
          <div />
          <div style={{ position: "relative", height: 20 }}>
            {[0,25,50,75,100].map(pct => (
              <div key={pct} style={{ position: "absolute", left: pct + "%", transform: "translateX(-50%)", fontSize: 9, color: "#CBD5E1", fontFamily: "monospace" }}>
                {new Date(start + (total * pct / 100)).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}
              </div>
            ))}
          </div>
        </div>
        {Object.values(phaseGroups).map(({ phase: ph, sprints }: any) => (
          <div key={ph.id} style={{ marginBottom: 24 }}>
            <div style={{ display: "grid", gridTemplateColumns: "200px 1fr", gap: 12, alignItems: "center", marginBottom: 10 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: ph.accent }}>PHASE {ph.num} — {ph.sub || ph.label}</div>
              <div style={{ height: 1, background: ph.accent + "30" }} />
            </div>
            {sprints.map((s: any) => {
              const sStart = s.startDate ? new Date(s.startDate).getTime() : start;
              const sEnd   = s.endDate   ? new Date(s.endDate).getTime()   : end;
              const left   = total > 0 ? ((sStart - start) / total) * 100 : 0;
              const width  = total > 0 ? ((sEnd - sStart) / total) * 100 : 10;
              const done   = s.features.filter((f: any) => f.status === "DONE").length;
              const blk    = s.features.filter((f: any) => f.status === "BLOCKED").length;
              const pct    = s.features.length ? Math.round((done / s.features.length) * 100) : 0;
              const barColor = s.status === "DONE" ? "#059669" : blk > 0 ? "#DC2626" : s.status === "ACTIVE" ? ph.accent : "#CBD5E1";
              return (
                <div key={s.id} style={{ marginBottom: 6 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "200px 1fr", gap: 12, alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <button onClick={() => setExpanded(e => ({ ...e, [s.id]: !e[s.id] }))} style={{ background: "none", border: "none", color: "#CBD5E1", cursor: "pointer", fontSize: 10, padding: 0, width: 14 }}>{expanded[s.id] ? "▼" : "▶"}</button>
                      <span style={{ fontFamily: "monospace", fontSize: 9, color: ph.accent, fontWeight: 700 }}>{s.num}</span>
                      <span style={{ fontSize: 11, color: "#475569", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.name}</span>
                    </div>
                    <div style={{ position: "relative", height: 28, background: "#F8FAFC", borderRadius: 8, overflow: "hidden", border: "1px solid #F1F5F9" }}>
                      <div style={{ position: "absolute", left: `${Math.max(0, Math.min(left, 95))}%`, width: `${Math.max(3, Math.min(width, 100 - left))}%`, height: "100%", background: barColor, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 8px", fontSize: 10, color: "#fff", fontWeight: 700 }}>
                        <span>{pct}%</span>{blk > 0 && <span>⚠ {blk}</span>}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
