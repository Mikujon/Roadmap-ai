"use client";
import { useState, useEffect } from "react";
import { useToast } from "@/components/ui/toast";

interface Risk {
  id: string; title: string; description?: string;
  probability: number; impact: number; status: string;
  mitigation?: string; ownerId?: string; ownerName?: string; category?: string;
}
interface Assignment {
  id: string; estimatedHours: number; actualHours: number;
  resource: { id: string; name: string; role: string; costPerHour: number; capacityHours: number; };
}
interface OrgResource { id: string; name: string; role: string; costPerHour: number; capacityHours: number; }
interface Snapshot { id: string; version: number; name: string; reason?: string; createdBy?: string; createdAt: string; data?: any; }

const RISK_SCORE_COLOR = (s: number) => s >= 15 ? "#DC2626" : s >= 8 ? "#EA580C" : s >= 4 ? "#D97706" : "#059669";
const RISK_SCORE_BG    = (s: number) => s >= 15 ? "#FEF2F2" : s >= 8 ? "#FFF7ED" : s >= 4 ? "#FFFBEB" : "#ECFDF5";
const RISK_SCORE_LABEL = (s: number) => s >= 15 ? "CRITICAL" : s >= 8 ? "HIGH" : s >= 4 ? "MEDIUM" : "LOW";
const STATUS_COLOR: Record<string, { color: string; bg: string; border: string }> = {
  OPEN:      { color: "#DC2626", bg: "#FEF2F2", border: "#FECACA" },
  MITIGATED: { color: "#D97706", bg: "#FFFBEB", border: "#FDE68A" },
  CLOSED:    { color: "#059669", bg: "#ECFDF5", border: "#A7F3D0" },
};
const CATEGORIES = ["Technical", "Resource", "Budget", "Schedule", "Scope", "External", "Compliance", "Other"];

const PROB_LABELS: Record<number, string> = { 1: "Very Low", 2: "Low", 3: "Medium", 4: "High", 5: "Very High" };
const IMPACT_LABELS: Record<number, string> = { 1: "Negligible", 2: "Minor", 3: "Moderate", 4: "Major", 5: "Critical" };

function RiskCard({ risk, onStatusChange, canEdit, idx }: {
  risk: Risk; onStatusChange: (id: string, status: string) => void; canEdit: boolean; idx: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const score = risk.probability * risk.impact;
  const sm = STATUS_COLOR[risk.status] ?? STATUS_COLOR.OPEN;
  const nextStatuses = risk.status === "OPEN" ? ["MITIGATED", "CLOSED"] : risk.status === "MITIGATED" ? ["CLOSED"] : [];

  return (
    <div style={{ background: "#fff", border: `1px solid ${risk.status === "CLOSED" ? "#E5E2D9" : RISK_SCORE_COLOR(score) + "30"}`, borderRadius: 12, overflow: "hidden", opacity: risk.status === "CLOSED" ? 0.6 : 1 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", cursor: "pointer" }} onClick={() => setExpanded(e => !e)}>
        {/* ID */}
        <div style={{ fontSize: 10, fontWeight: 800, color: "#9E9C93", fontFamily: "monospace", flexShrink: 0, minWidth: 32 }}>R{String(idx + 1).padStart(2, "0")}</div>
        {/* Score badge */}
        <div style={{ width: 36, height: 36, borderRadius: 8, background: RISK_SCORE_BG(score), display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: RISK_SCORE_COLOR(score), lineHeight: 1 }}>{score}</div>
          <div style={{ fontSize: 8, fontWeight: 700, color: RISK_SCORE_COLOR(score) }}>{RISK_SCORE_LABEL(score)}</div>
        </div>
        {/* Title + meta */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: risk.status === "CLOSED" ? "#9E9C93" : "#18170F", marginBottom: 3 }}>{risk.title}</div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            {risk.category && <span style={{ fontSize: 10, fontWeight: 600, color: "#5C5A52", background: "#F4F2EC", padding: "1px 6px", borderRadius: 4 }}>{risk.category}</span>}
            {risk.ownerName && <span style={{ fontSize: 10, color: "#5C5A52" }}>👤 {risk.ownerName}</span>}
            <span style={{ fontSize: 10, color: "#9E9C93" }}>P:{risk.probability} × I:{risk.impact}</span>
          </div>
        </div>
        {/* Status */}
        <div style={{ display: "flex", gap: 6, alignItems: "center", flexShrink: 0 }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: sm.color, background: sm.bg, border: `1px solid ${sm.border}`, padding: "3px 8px", borderRadius: 20 }}>{risk.status}</span>
          {canEdit && nextStatuses.length > 0 && nextStatuses.map(ns => (
            <button key={ns} onClick={e => { e.stopPropagation(); onStatusChange(risk.id, ns); }}
              style={{ fontSize: 10, fontWeight: 600, color: STATUS_COLOR[ns].color, background: STATUS_COLOR[ns].bg, border: `1px solid ${STATUS_COLOR[ns].border}`, padding: "3px 8px", borderRadius: 20, cursor: "pointer", fontFamily: "inherit" }}>
              → {ns}
            </button>
          ))}
          <span style={{ fontSize: 12, color: "#CCC9BF" }}>{expanded ? "▲" : "▼"}</span>
        </div>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div style={{ padding: "0 16px 16px", display: "flex", flexDirection: "column", gap: 10, borderTop: "1px solid #F4F2EC" }}>
          <div style={{ paddingTop: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div style={{ background: "#F8FAFC", borderRadius: 8, padding: "10px 12px" }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: "#9E9C93", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 4 }}>Probability</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#18170F" }}>{risk.probability}/5 — {PROB_LABELS[risk.probability]}</div>
            </div>
            <div style={{ background: "#F8FAFC", borderRadius: 8, padding: "10px 12px" }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: "#9E9C93", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 4 }}>Impact</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#18170F" }}>{risk.impact}/5 — {IMPACT_LABELS[risk.impact]}</div>
            </div>
          </div>
          {risk.description && (
            <div style={{ background: "#F8FAFC", borderRadius: 8, padding: "10px 12px" }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: "#9E9C93", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 4 }}>Description</div>
              <div style={{ fontSize: 12, color: "#5C5A52", lineHeight: 1.5 }}>{risk.description}</div>
            </div>
          )}
          {risk.mitigation && (
            <div style={{ background: "#ECFDF5", border: "1px solid #A7F3D0", borderRadius: 8, padding: "10px 12px" }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: "#059669", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 4 }}>Mitigation Action</div>
              <div style={{ fontSize: 12, color: "#065F46", lineHeight: 1.5 }}>{risk.mitigation}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── RACI Matrix ───────────────────────────────────────────────────────────────
const RACI_ROLES = ["Responsible", "Accountable", "Consulted", "Informed"] as const;
type RaciRole = typeof RACI_ROLES[number];
const RACI_COLOR: Record<RaciRole, { short: string; color: string; bg: string }> = {
  Responsible: { short: "R", color: "#006D6B", bg: "#EDFAF9" },
  Accountable: { short: "A", color: "#2563EB", bg: "#EFF6FF" },
  Consulted:   { short: "C", color: "#D97706", bg: "#FFFBEB" },
  Informed:    { short: "I", color: "#5C5A52", bg: "#F8FAFC" },
};

function RaciMatrix({ projectId, canEdit }: { projectId: string; canEdit: boolean }) {
  const { toast } = useToast();
  interface RaciEntry { id: string; activity: string; responsible: string; accountable: string; consulted: string; informed: string; }
  const [entries, setEntries] = useState<RaciEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding]   = useState(false);
  const [form, setForm]       = useState({ activity: "", responsible: "", accountable: "", consulted: "", informed: "" });

  useEffect(() => {
    fetch(`/api/projects/${projectId}/raci`)
      .then(r => r.ok ? r.json() : { entries: [] })
      .then(d => { setEntries(d.entries ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [projectId]);

  const save = async () => {
    if (!form.activity.trim()) { toast("Activity name is required", "warning"); return; }
    try {
      const res = await fetch(`/api/projects/${projectId}/raci`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setEntries(e => [...e, data]);
      setForm({ activity: "", responsible: "", accountable: "", consulted: "", informed: "" });
      setAdding(false);
      toast("RACI entry added", "success");
    } catch { toast("Failed to save", "error"); }
  };

  const remove = async (id: string) => {
    try {
      await fetch(`/api/projects/${projectId}/raci/${id}`, { method: "DELETE" });
      setEntries(e => e.filter(x => x.id !== id));
      toast("Entry removed", "info");
    } catch { toast("Failed to remove", "error"); }
  };

  return (
    <div className="gov-card">
      <div style={{ padding: "16px 20px", borderBottom: "1px solid #F4F2EC", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#18170F" }}>RACI Matrix</div>
          <div style={{ fontSize: 11, color: "#9E9C93" }}>Responsibility Assignment Matrix</div>
        </div>
        {canEdit && <button onClick={() => setAdding(a => !a)} className="btn-primary-sm">+ Add Activity</button>}
      </div>

      {/* Legend */}
      <div style={{ padding: "10px 20px", borderBottom: "1px solid #F4F2EC", display: "flex", gap: 16 }}>
        {RACI_ROLES.map(r => (
          <span key={r} style={{ fontSize: 11, color: RACI_COLOR[r].color }}>
            <span style={{ fontWeight: 800, background: RACI_COLOR[r].bg, padding: "1px 6px", borderRadius: 4, marginRight: 4 }}>{RACI_COLOR[r].short}</span>
            {r}
          </span>
        ))}
      </div>

      {adding && (
        <div style={{ padding: "14px 20px", borderBottom: "1px solid #F4F2EC", background: "#FDFCFA", display: "flex", flexDirection: "column", gap: 10 }}>
          <input value={form.activity} onChange={e => setForm(f => ({ ...f, activity: e.target.value }))} placeholder="Activity / Deliverable" className="gov-field" />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
            {(["responsible", "accountable", "consulted", "informed"] as const).map(k => (
              <input key={k} value={form[k]} onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))}
                placeholder={k.charAt(0).toUpperCase() + k.slice(1)} className="gov-field" />
            ))}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={save} className="btn-primary-sm">Save</button>
            <button onClick={() => setAdding(false)} className="btn-ghost-sm">Cancel</button>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ padding: 32, textAlign: "center", color: "#9E9C93", fontSize: 13 }}>Loading…</div>
      ) : entries.length === 0 ? (
        <div style={{ padding: 40, textAlign: "center", color: "#9E9C93", fontSize: 13 }}>No RACI entries yet. Add activities above.</div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr>
                <th style={{ padding: "10px 16px", textAlign: "left", fontSize: 10, fontWeight: 700, color: "#9E9C93", textTransform: "uppercase", background: "#F8FAFC", borderBottom: "1px solid #E5E2D9" }}>Activity</th>
                {RACI_ROLES.map(r => <th key={r} style={{ padding: "10px 12px", textAlign: "center", fontSize: 10, fontWeight: 700, color: RACI_COLOR[r].color, textTransform: "uppercase", background: "#F8FAFC", borderBottom: "1px solid #E5E2D9" }}>{r}</th>)}
                {canEdit && <th style={{ background: "#F8FAFC", borderBottom: "1px solid #E5E2D9" }} />}
              </tr>
            </thead>
            <tbody>
              {entries.map((e, i) => (
                <tr key={e.id} style={{ background: i % 2 === 0 ? "#fff" : "#FDFCFA" }}>
                  <td style={{ padding: "11px 16px", fontWeight: 600, color: "#18170F", borderBottom: "1px solid #F4F2EC" }}>{e.activity}</td>
                  {(["responsible", "accountable", "consulted", "informed"] as const).map(k => (
                    <td key={k} style={{ padding: "11px 12px", textAlign: "center", borderBottom: "1px solid #F4F2EC" }}>
                      {e[k] ? <span style={{ fontSize: 11, color: RACI_COLOR[k.charAt(0).toUpperCase() + k.slice(1) as RaciRole].color, fontWeight: 600 }}>{e[k]}</span> : <span style={{ color: "#CCC9BF" }}>—</span>}
                    </td>
                  ))}
                  {canEdit && <td style={{ padding: "11px 12px", borderBottom: "1px solid #F4F2EC" }}><button onClick={() => remove(e.id)} style={{ fontSize: 11, color: "#DC2626", background: "none", border: "none", cursor: "pointer" }}>✕</button></td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Audit Log ─────────────────────────────────────────────────────────────────
function AuditLog({ projectId }: { projectId: string }) {
  interface LogEntry { id: string; action: string; detail?: string; userName?: string; createdAt: string; }
  const [logs, setLogs]     = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/projects/${projectId}/audit`)
      .then(r => r.ok ? r.json() : { logs: [] })
      .then(d => { setLogs(d.logs ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [projectId]);

  const ACTION_COLOR: Record<string, string> = {
    created: "#059669", updated: "#2563EB", status_changed: "#D97706",
    deleted: "#DC2626", snapshot: "#8B5CF6", default: "#5C5A52",
  };

  return (
    <div className="gov-card">
      <div style={{ padding: "16px 20px", borderBottom: "1px solid #F4F2EC" }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#18170F" }}>Audit Log</div>
        <div style={{ fontSize: 11, color: "#9E9C93" }}>All changes and actions recorded for this project</div>
      </div>
      {loading ? (
        <div style={{ padding: 32, textAlign: "center", color: "#9E9C93", fontSize: 13 }}>Loading…</div>
      ) : logs.length === 0 ? (
        <div style={{ padding: 40, textAlign: "center", color: "#9E9C93", fontSize: 13 }}>No audit events recorded yet.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column" }}>
          {logs.map((log, i) => {
            const color = ACTION_COLOR[log.action.toLowerCase()] ?? ACTION_COLOR.default;
            return (
              <div key={log.id} style={{ display: "flex", gap: 14, padding: "12px 20px", borderBottom: i < logs.length - 1 ? "1px solid #F8FAFC" : "none" }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: color, flexShrink: 0, marginTop: 5 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "baseline" }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color, textTransform: "capitalize" }}>{log.action.replace(/_/g, " ")}</span>
                    {log.userName && <span style={{ fontSize: 11, color: "#5C5A52" }}>by {log.userName}</span>}
                  </div>
                  {log.detail && <div style={{ fontSize: 12, color: "#5C5A52", marginTop: 2 }}>{log.detail}</div>}
                </div>
                <div style={{ fontSize: 10, color: "#CCC9BF", flexShrink: 0, textAlign: "right" }}>
                  {new Date(log.createdAt).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function GovernanceView({ projectId, canEdit }: { projectId: string; canEdit: boolean }) {
  const [risks,            setRisks]           = useState<Risk[]>([]);
  const [assignments,      setAssignments]      = useState<Assignment[]>([]);
  const [orgResources,     setOrgResources]     = useState<OrgResource[]>([]);
  const [snapshots,        setSnapshots]        = useState<Snapshot[]>([]);
  const [activeTab,        setActiveTab]        = useState<"risks"|"resources"|"raci"|"audit"|"snapshots">("risks");

  // Add risk form
  const [addingRisk,     setAddingRisk]     = useState(false);
  const [savingRisk,     setSavingRisk]     = useState(false);
  const [generatingMit,  setGeneratingMit]  = useState(false);
  const [mitSuggestions, setMitSuggestions] = useState<string[]>([]);
  const [newRisk, setNewRisk] = useState({
    title: "", description: "", probability: 3, impact: 3,
    mitigation: "", ownerId: "", ownerName: "", category: "",
  });

  // Snapshots
  const [snapshotReason,   setSnapshotReason]   = useState("");
  const [savingSnapshot,   setSavingSnapshot]   = useState(false);
  const [selectedSnapshot, setSelectedSnapshot] = useState<Snapshot | null>(null);

  useEffect(() => {
    fetch(`/api/projects/${projectId}/risks`).then(r => r.json()).then(setRisks);
    fetch(`/api/projects/${projectId}/resources`).then(r => r.json()).then(setAssignments);
    fetch(`/api/resources`).then(r => r.json()).then(setOrgResources);
    fetch(`/api/projects/${projectId}/snapshots`).then(r => r.json()).then(setSnapshots);
  }, [projectId]);

  const addRisk = async () => {
    if (!newRisk.title) return;
    setSavingRisk(true);
    const owner = assignments.find(a => a.resource.id === newRisk.ownerId);
    const payload = {
      ...newRisk,
      ownerName: owner?.resource.name ?? newRisk.ownerName ?? null,
    };
    const res = await fetch(`/api/projects/${projectId}/risks`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
    });
    const r = await res.json();
    setRisks(p => [...p, r]);
    setNewRisk({ title: "", description: "", probability: 3, impact: 3, mitigation: "", ownerId: "", ownerName: "", category: "" });
    setMitSuggestions([]);
    setAddingRisk(false);
    setSavingRisk(false);
  };

  const generateMitigation = async () => {
    if (!newRisk.title) return;
    setGeneratingMit(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/risks/suggest-mitigation`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ riskTitle: newRisk.title, probability: newRisk.probability, impact: newRisk.impact }),
      });
      const { suggestions } = await res.json();
      setMitSuggestions(suggestions ?? []);
      if (suggestions?.[0]) setNewRisk(p => ({ ...p, mitigation: suggestions[0] }));
    } finally {
      setGeneratingMit(false);
    }
  };

  const updateRiskStatus = async (id: string, status: string) => {
    await fetch(`/api/projects/${projectId}/risks/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }),
    });
    setRisks(p => p.map(r => r.id === id ? { ...r, status } : r));
  };

  const addResource = async (resourceId: string) => {
    const res = await fetch(`/api/projects/${projectId}/resources`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resourceId, estimatedHours: 0, actualHours: 0 }),
    });
    const a = await res.json();
    setAssignments(p => [...p.filter(x => x.resource.id !== resourceId), a]);
  };

  const updateAssignment = async (id: string, patch: { estimatedHours?: number; actualHours?: number }) => {
    await fetch(`/api/projects/${projectId}/resources/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch),
    });
    setAssignments(p => p.map(a => a.id === id ? { ...a, ...patch } : a));
  };

  const takeSnapshot = async () => {
    setSavingSnapshot(true);
    await fetch(`/api/projects/${projectId}/snapshots`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reason: snapshotReason }),
    });
    const res = await fetch(`/api/projects/${projectId}/snapshots`);
    setSnapshots(await res.json());
    setSnapshotReason("");
    setSavingSnapshot(false);
  };

  const openSnapshot = async (s: Snapshot) => {
    const res = await fetch(`/api/projects/${projectId}/snapshots/${s.id}`);
    setSelectedSnapshot(await res.json());
  };

  // Sort risks: OPEN first, MITIGATED second, CLOSED last
  const sortedRisks = [...risks].sort((a, b) => {
    const order = { OPEN: 0, MITIGATED: 1, CLOSED: 2 };
    return (order[a.status as keyof typeof order] ?? 0) - (order[b.status as keyof typeof order] ?? 0);
  });

  const openRisks   = risks.filter(r => r.status === "OPEN").length;
  const critRisks   = risks.filter(r => r.status === "OPEN" && r.probability * r.impact >= 15).length;

  return (
    <>
      <style>{`
        .gov-card { background: #fff; border: 1px solid #E5E2D9; border-radius: 14px; overflow: hidden; }
        .gov-field { background: #F8FAFC; border: 1.5px solid #E5E2D9; border-radius: 8px; padding: 9px 12px; color: #18170F; font-size: 13px; outline: none; font-family: inherit; width: 100%; box-sizing: border-box; }
        .gov-field:focus { border-color: #006D6B; background: #fff; }
        .tab-pill { padding: 6px 16px; border-radius: 8px; font-size: 12px; font-weight: 600; border: none; cursor: pointer; font-family: inherit; transition: all 0.15s; }
        .tab-pill.active { background: #006D6B; color: #fff; }
        .tab-pill:not(.active) { background: transparent; color: #5C5A52; }
        .tab-pill:not(.active):hover { background: #F4F2EC; color: #18170F; }
        .btn-sm { font-size: 11px; color: #006D6B; background: rgba(0,109,107,0.08); border: 1px solid rgba(0,109,107,0.2); border-radius: 6px; padding: 5px 12px; cursor: pointer; font-weight: 600; font-family: inherit; }
        .btn-primary-sm { padding: 8px 18px; background: #006D6B; color: #fff; border: none; border-radius: 8px; font-size: 12px; font-weight: 600; cursor: pointer; font-family: inherit; }
        .btn-primary-sm:disabled { opacity: 0.6; cursor: not-allowed; }
        .btn-ghost-sm { padding: 8px 14px; background: #F8FAFC; color: #5C5A52; border: 1px solid #E5E2D9; border-radius: 8px; font-size: 12px; cursor: pointer; font-family: inherit; }
        .gov-select { background: #F8FAFC; color: #18170F; border: 1px solid #E5E2D9; border-radius: 8px; padding: 6px 10px; font-size: 12px; outline: none; font-family: inherit; }
        .risk-slider { width: 100%; accent-color: #006D6B; }
      `}</style>

      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {/* Tabs */}
        <div style={{ display: "flex", alignItems: "center", gap: 4, background: "#F4F2EC", borderRadius: 10, padding: 4, width: "fit-content" }}>
          {(["risks", "resources", "raci", "audit", "snapshots"] as const).map(t => (
            <button key={t} onClick={() => setActiveTab(t)} className={`tab-pill${activeTab === t ? " active" : ""}`}>
              {t === "risks" ? `Risks ${openRisks > 0 ? `(${openRisks})` : ""}` : t === "raci" ? "RACI" : t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {/* ── RISKS TAB ── */}
        {activeTab === "risks" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#18170F" }}>Risk Register</div>
                <div style={{ fontSize: 12, color: "#9E9C93", marginTop: 2 }}>
                  {openRisks} open · {critRisks > 0 && <span style={{ color: "#DC2626", fontWeight: 600 }}>{critRisks} critical · </span>}{risks.length} total
                </div>
              </div>
              {canEdit && (
                <button onClick={() => setAddingRisk(true)} className="btn-primary-sm">+ Add Risk</button>
              )}
            </div>

            {/* Add Risk Form */}
            {addingRisk && canEdit && (
              <div style={{ background: "#fff", border: "1px solid #E5E2D9", borderRadius: 14, padding: "20px 24px" }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#18170F", marginBottom: 16 }}>New Risk</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {/* Title */}
                  <div>
                    <label style={{ fontSize: 10, fontWeight: 700, color: "#9E9C93", textTransform: "uppercase", letterSpacing: "0.07em", display: "block", marginBottom: 6 }}>
                      Risk Title * <span style={{ color: "#CCC9BF", fontWeight: 400 }}>— "A causa di X, potrebbe accadere Y, con impatto Z"</span>
                    </label>
                    <input className="gov-field" value={newRisk.title} onChange={e => setNewRisk(p => ({ ...p, title: e.target.value }))} placeholder='Es: "A causa di ritardi del fornitore, potrebbe slittare la consegna, con impatto sul lancio"' />
                  </div>

                  {/* Description */}
                  <div>
                    <label style={{ fontSize: 10, fontWeight: 700, color: "#9E9C93", textTransform: "uppercase", letterSpacing: "0.07em", display: "block", marginBottom: 6 }}>Description</label>
                    <textarea className="gov-field" value={newRisk.description} onChange={e => setNewRisk(p => ({ ...p, description: e.target.value }))} placeholder="Additional context..." rows={2} style={{ resize: "vertical" }} />
                  </div>

                  {/* Category + Owner */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div>
                      <label style={{ fontSize: 10, fontWeight: 700, color: "#9E9C93", textTransform: "uppercase", letterSpacing: "0.07em", display: "block", marginBottom: 6 }}>Category</label>
                      <select className="gov-field gov-select" value={newRisk.category} onChange={e => setNewRisk(p => ({ ...p, category: e.target.value }))}>
                        <option value="">Select category...</option>
                        {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: 10, fontWeight: 700, color: "#9E9C93", textTransform: "uppercase", letterSpacing: "0.07em", display: "block", marginBottom: 6 }}>Owner</label>
                      {assignments.length > 0 ? (
                        <select className="gov-field gov-select" value={newRisk.ownerId} onChange={e => setNewRisk(p => ({ ...p, ownerId: e.target.value }))}>
                          <option value="">Select owner...</option>
                          {assignments.map(a => <option key={a.resource.id} value={a.resource.id}>{a.resource.name} — {a.resource.role}</option>)}
                        </select>
                      ) : (
                        <input className="gov-field" value={newRisk.ownerName} onChange={e => setNewRisk(p => ({ ...p, ownerName: e.target.value }))} placeholder="Owner name..." />
                      )}
                    </div>
                  </div>

                  {/* Probability + Impact */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div style={{ background: "#F8FAFC", borderRadius: 10, padding: "12px 14px" }}>
                      <label style={{ fontSize: 10, fontWeight: 700, color: "#9E9C93", textTransform: "uppercase", letterSpacing: "0.07em", display: "block", marginBottom: 8 }}>
                        Probability: <span style={{ color: "#18170F" }}>{newRisk.probability}/5 — {PROB_LABELS[newRisk.probability]}</span>
                      </label>
                      <input type="range" min={1} max={5} value={newRisk.probability} onChange={e => setNewRisk(p => ({ ...p, probability: parseInt(e.target.value) }))} className="risk-slider" />
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: "#CCC9BF", marginTop: 2 }}>
                        <span>Very Low</span><span>Very High</span>
                      </div>
                    </div>
                    <div style={{ background: "#F8FAFC", borderRadius: 10, padding: "12px 14px" }}>
                      <label style={{ fontSize: 10, fontWeight: 700, color: "#9E9C93", textTransform: "uppercase", letterSpacing: "0.07em", display: "block", marginBottom: 8 }}>
                        Impact: <span style={{ color: "#18170F" }}>{newRisk.impact}/5 — {IMPACT_LABELS[newRisk.impact]}</span>
                      </label>
                      <input type="range" min={1} max={5} value={newRisk.impact} onChange={e => setNewRisk(p => ({ ...p, impact: parseInt(e.target.value) }))} className="risk-slider" />
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: "#CCC9BF", marginTop: 2 }}>
                        <span>Negligible</span><span>Critical</span>
                      </div>
                    </div>
                  </div>

                  {/* Priority preview */}
                  <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: RISK_SCORE_BG(newRisk.probability * newRisk.impact), borderRadius: 8, border: `1px solid ${RISK_SCORE_COLOR(newRisk.probability * newRisk.impact)}30` }}>
                    <span style={{ fontSize: 11, color: "#5C5A52" }}>Priority Score:</span>
                    <span style={{ fontSize: 18, fontWeight: 800, color: RISK_SCORE_COLOR(newRisk.probability * newRisk.impact) }}>{newRisk.probability * newRisk.impact}</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: RISK_SCORE_COLOR(newRisk.probability * newRisk.impact) }}>— {RISK_SCORE_LABEL(newRisk.probability * newRisk.impact)}</span>
                  </div>

                  {/* Mitigation */}
                  <div>
                    <label style={{ fontSize: 10, fontWeight: 700, color: "#9E9C93", textTransform: "uppercase", letterSpacing: "0.07em", display: "block", marginBottom: 6 }}>Mitigation Action</label>
                    <div style={{ display: "flex", gap: 8 }}>
                      <input className="gov-field" value={newRisk.mitigation} onChange={e => setNewRisk(p => ({ ...p, mitigation: e.target.value }))} placeholder="What action will you take to reduce this risk?" style={{ flex: 1 }} />
                      <button onClick={generateMitigation} disabled={generatingMit || !newRisk.title} type="button"
                        style={{ padding: "8px 14px", background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 8, fontSize: 11, fontWeight: 600, color: "#2563EB", cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap", flexShrink: 0 }}>
                        {generatingMit ? "..." : "✨ AI Suggest"}
                      </button>
                    </div>
                    {mitSuggestions.length > 1 && (
                      <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 4 }}>
                        <div style={{ fontSize: 10, color: "#9E9C93", fontWeight: 600 }}>Other AI suggestions:</div>
                        {mitSuggestions.slice(1).map((s, i) => (
                          <button key={i} onClick={() => setNewRisk(p => ({ ...p, mitigation: s }))} type="button"
                            style={{ textAlign: "left", padding: "6px 10px", background: "#F8FAFC", border: "1px solid #E5E2D9", borderRadius: 6, fontSize: 11, color: "#5C5A52", cursor: "pointer", fontFamily: "inherit" }}>
                            {s}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={addRisk} disabled={savingRisk || !newRisk.title} className="btn-primary-sm">{savingRisk ? "Saving..." : "Add Risk"}</button>
                    <button onClick={() => { setAddingRisk(false); setMitSuggestions([]); }} className="btn-ghost-sm">Cancel</button>
                  </div>
                </div>
              </div>
            )}

            {/* Risk list */}
            {sortedRisks.length === 0 ? (
              <div style={{ padding: "48px", textAlign: "center", color: "#9E9C93", fontSize: 13, fontStyle: "italic", background: "#fff", borderRadius: 14, border: "1px solid #E5E2D9" }}>
                No risks registered. Add risks to track and mitigate project threats.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {sortedRisks.map((r, i) => (
                  <RiskCard key={r.id} risk={r} idx={i} onStatusChange={updateRiskStatus} canEdit={canEdit} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── RESOURCES TAB ── */}
        {activeTab === "resources" && (
          <div className="gov-card">
            <div style={{ padding: "16px 20px", borderBottom: "1px solid #F4F2EC", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#18170F" }}>Resource Assignments</div>
              {canEdit && orgResources.length > 0 && (
                <select className="gov-select" onChange={e => { if (e.target.value) { addResource(e.target.value); e.target.value = ""; } }}>
                  <option value="">+ Assign resource...</option>
                  {orgResources.filter(r => !assignments.some(a => a.resource.id === r.id)).map(r => (
                    <option key={r.id} value={r.id}>{r.name} - {r.role}</option>
                  ))}
                </select>
              )}
            </div>
            {assignments.length === 0 ? (
              <div style={{ padding: "32px", fontSize: 13, color: "#CCC9BF", textAlign: "center", fontStyle: "italic" }}>No resources assigned.</div>
            ) : (
              <div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 100px 100px 100px 120px", padding: "8px 20px", background: "#FDFCFA", borderBottom: "1px solid #F4F2EC" }}>
                  {["Resource", "Est. Hours", "Act. Hours", "Cost", "Utilization"].map(h => (
                    <div key={h} style={{ fontSize: 10, fontWeight: 700, color: "#9E9C93", textTransform: "uppercase", letterSpacing: "0.07em" }}>{h}</div>
                  ))}
                </div>
                {assignments.map((a, i) => {
                  const util = a.resource.capacityHours > 0 ? (a.actualHours / a.resource.capacityHours) * 100 : 0;
                  const utilColor = util > 100 ? "#DC2626" : util > 80 ? "#D97706" : "#059669";
                  return (
                    <div key={a.id} style={{ display: "grid", gridTemplateColumns: "1fr 100px 100px 100px 120px", padding: "14px 20px", borderBottom: i < assignments.length - 1 ? "1px solid #F4F2EC" : "none", alignItems: "center" }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "#18170F" }}>{a.resource.name}</div>
                        <div style={{ fontSize: 11, color: "#9E9C93" }}>{a.resource.role} · ${a.resource.costPerHour}/hr</div>
                      </div>
                      <div>{canEdit ? <input type="number" className="gov-field" defaultValue={a.estimatedHours} style={{ width: 70 }} onBlur={e => updateAssignment(a.id, { estimatedHours: parseInt(e.target.value) || 0 })} /> : <span style={{ fontSize: 13, color: "#2563EB", fontWeight: 600 }}>{a.estimatedHours}h</span>}</div>
                      <div>{canEdit ? <input type="number" className="gov-field" defaultValue={a.actualHours} style={{ width: 70 }} onBlur={e => updateAssignment(a.id, { actualHours: parseInt(e.target.value) || 0 })} /> : <span style={{ fontSize: 13, color: "#059669", fontWeight: 600 }}>{a.actualHours}h</span>}</div>
                      <div style={{ fontSize: 13, color: "#18170F", fontWeight: 600 }}>${(a.actualHours * a.resource.costPerHour).toLocaleString()}</div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ flex: 1, height: 5, background: "#F4F2EC", borderRadius: 3, overflow: "hidden" }}>
                          <div style={{ height: "100%", width: Math.min(util, 100) + "%", background: utilColor, borderRadius: 3 }} />
                        </div>
                        <span style={{ fontSize: 11, color: utilColor, fontWeight: 700, minWidth: 36 }}>{Math.round(util)}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── RACI TAB ── */}
        {activeTab === "raci" && (
          <RaciMatrix projectId={projectId} canEdit={canEdit} />
        )}

        {/* ── AUDIT LOG TAB ── */}
        {activeTab === "audit" && (
          <AuditLog projectId={projectId} />
        )}

        {/* ── SNAPSHOTS TAB ── */}
        {activeTab === "snapshots" && (
          <div className="gov-card">
            <div style={{ padding: "16px 20px", borderBottom: "1px solid #F4F2EC", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#18170F" }}>Project Snapshots</div>
                <div style={{ fontSize: 11, color: "#9E9C93" }}>Preserve the current plan state at any point</div>
              </div>
              {canEdit && (
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input value={snapshotReason} onChange={e => setSnapshotReason(e.target.value)} placeholder="Reason (optional)..." className="gov-field" style={{ width: 200 }} />
                  <button onClick={takeSnapshot} disabled={savingSnapshot} className="btn-primary-sm">{savingSnapshot ? "Saving..." : "Take Snapshot"}</button>
                </div>
              )}
            </div>
            {snapshots.length === 0 ? (
              <div style={{ padding: "48px", textAlign: "center", color: "#9E9C93", fontSize: 13, fontStyle: "italic" }}>No snapshots yet.</div>
            ) : (
              <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 10 }}>
                {snapshots.map(s => (
                  <div key={s.id} onClick={() => openSnapshot(s)}
                    style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 16px", background: "#F8FAFC", border: "1px solid #E5E2D9", borderRadius: 10, cursor: "pointer" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "#EFF6FF")}
                    onMouseLeave={e => (e.currentTarget.style.background = "#F8FAFC")}
                  >
                    <div style={{ width: 36, height: 36, borderRadius: 8, background: "#EFF6FF", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, color: "#2563EB", flexShrink: 0 }}>v{s.version}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#18170F" }}>{s.name}</div>
                      <div style={{ fontSize: 11, color: "#9E9C93", marginTop: 2 }}>{s.reason ?? "No reason"} · {new Date(s.createdAt).toLocaleDateString("en-GB")} by {s.createdBy ?? "Unknown"}</div>
                    </div>
                    <span style={{ fontSize: 11, color: "#006D6B", fontWeight: 600 }}>View →</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Snapshot modal */}
      {selectedSnapshot && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => setSelectedSnapshot(null)}>
          <div style={{ background: "#fff", borderRadius: 16, padding: 28, width: 640, maxHeight: "85vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.15)" }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 800, color: "#18170F" }}>{selectedSnapshot.name}</div>
                <div style={{ fontSize: 12, color: "#9E9C93" }}>{selectedSnapshot.reason ?? "No reason"} · {new Date(selectedSnapshot.createdAt).toLocaleDateString("en-GB")} by {selectedSnapshot.createdBy}</div>
              </div>
              <button onClick={() => setSelectedSnapshot(null)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: "#9E9C93" }}>✕</button>
            </div>
            {selectedSnapshot.data && (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                  {[
                    { label: "Start", value: new Date(selectedSnapshot.data.startDate).toLocaleDateString("en-GB") },
                    { label: "End",   value: new Date(selectedSnapshot.data.endDate).toLocaleDateString("en-GB") },
                    { label: "Budget", value: selectedSnapshot.data.budgetTotal > 0 ? `$${selectedSnapshot.data.budgetTotal.toLocaleString()}` : "Not set" },
                  ].map(s => (
                    <div key={s.label} style={{ background: "#F8FAFC", border: "1px solid #E5E2D9", borderRadius: 8, padding: "10px 14px" }}>
                      <div style={{ fontSize: 10, color: "#9E9C93", fontWeight: 700, textTransform: "uppercase", marginBottom: 4 }}>{s.label}</div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#18170F" }}>{s.value}</div>
                    </div>
                  ))}
                </div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#18170F", marginBottom: 8 }}>Sprints ({selectedSnapshot.data.sprints?.length ?? 0})</div>
                  {(selectedSnapshot.data.sprints ?? []).map((sp: any) => (
                    <div key={sp.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", background: "#F8FAFC", border: "1px solid #E5E2D9", borderRadius: 8, marginBottom: 6 }}>
                      <span style={{ fontFamily: "monospace", fontSize: 10, color: "#006D6B", fontWeight: 700 }}>{sp.num}</span>
                      <span style={{ fontSize: 12, flex: 1 }}>{sp.name}</span>
                      <span style={{ fontSize: 11, color: "#5C5A52" }}>{sp.features?.filter((f: any) => f.status === "DONE").length ?? 0}/{sp.features?.length ?? 0} done</span>
                      <span style={{ fontSize: 10, fontWeight: 600, color: sp.status === "DONE" ? "#059669" : "#2563EB", background: sp.status === "DONE" ? "#ECFDF5" : "#EFF6FF", padding: "2px 6px", borderRadius: 4 }}>{sp.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}