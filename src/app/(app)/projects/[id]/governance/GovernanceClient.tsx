"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { C, CARD, CARD_H, CARD_T, CARD_S, G2, BTN, Tag, Dot, GuardianBar, Row, useToast } from "@/components/ui/shared";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { ModalSnapshot, ModalScopeChange, ModalEscalate, ModalRaci } from "@/components/ui/project-modals";
import { ProjectChat, ChatButton } from "@/components/ui/project-chat";

interface StatusLog {
  id: string; status: string; note: string;
  changedBy: string; createdAt: string;
}
interface Snapshot {
  id: string; reason: string; createdAt: string;
  healthScore: number; status: string;
}
interface Dependency {
  id: string; name: string; status: string;
  type: "depends_on" | "blocked_by"; blocked: boolean;
}
interface Props {
  projectId: string; projectName: string;
  statusLogs: StatusLog[];
  snapshots: Snapshot[];
  dependencies: Dependency[];
  blockers: Dependency[];
}

type ChangeType = "SCOPE" | "BUDGET" | "STATUS" | "RISK" | "TEAM" | "FEATURE" | "SPRINT" | "SETTINGS";
type ChangeFilter = "ALL" | ChangeType;

interface ChangeEntry {
  id: string;
  type: ChangeType;
  description: string;
  userName: string;
  userInitials: string;
  oldValue?: string;
  newValue?: string;
  createdAt: string;
}

const STATUS_COLORS: Record<string, string> = {
  ACTIVE:      C.blue,
  NOT_STARTED: C.text3,
  CLOSED:      C.text3,
  ARCHIVED:    C.text3,
  ON_HOLD:     C.amber,
};

const TYPE_META: Record<ChangeType, { label: string; bg: string; color: string; border: string }> = {
  SCOPE:    { label: "Scope",    bg: "#EFF6FF", color: "#2563EB", border: "#BFDBFE" },
  BUDGET:   { label: "Budget",   bg: "#FFFBEB", color: "#D97706", border: "#FDE68A" },
  STATUS:   { label: "Status",   bg: "#F5F3FF", color: "#7C3AED", border: "#DDD6FE" },
  RISK:     { label: "Risk",     bg: "#FEF2F2", color: "#DC2626", border: "#FECACA" },
  TEAM:     { label: "Team",     bg: "#F0FDFA", color: "#006D6B", border: "#99F6E4" },
  FEATURE:  { label: "Feature",  bg: "#F0FDF4", color: "#16A34A", border: "#BBF7D0" },
  SPRINT:   { label: "Sprint",   bg: "#EEF2FF", color: "#4F46E5", border: "#C7D2FE" },
  SETTINGS: { label: "Settings", bg: "#F8F7F3", color: "#9E9C93", border: "#E5E2D9" },
};

const FILTER_LABELS: { id: ChangeFilter; label: string }[] = [
  { id: "ALL",      label: "All"      },
  { id: "SCOPE",    label: "Scope"    },
  { id: "BUDGET",   label: "Budget"   },
  { id: "STATUS",   label: "Status"   },
  { id: "RISK",     label: "Risk"     },
  { id: "TEAM",     label: "Team"     },
  { id: "FEATURE",  label: "Feature"  },
  { id: "SPRINT",   label: "Sprint"   },
];

type Tab = "dependencies" | "scope" | "raci" | "snapshots" | "audit" | "changelog";

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function fmtTs(iso: string) {
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function exportCsv(entries: ChangeEntry[], projectName: string) {
  const header = ["Date", "Type", "Description", "From", "To", "User"];
  const rows = entries.map(e => [
    fmtTs(e.createdAt),
    e.type,
    `"${e.description.replace(/"/g, '""')}"`,
    e.oldValue ?? "",
    e.newValue ?? "",
    e.userName,
  ]);
  const csv = [header, ...rows].map(r => r.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = `changelog-${projectName.replace(/\s+/g, "-").toLowerCase()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ProjectGovernanceClient({ projectId, projectName, statusLogs, snapshots, dependencies, blockers }: Props) {
  const [activeTab,       setActiveTab]       = useState<Tab>("dependencies");
  const [showSnapshot,    setShowSnapshot]    = useState(false);
  const [showScopeChange, setShowScopeChange] = useState(false);
  const [showEscalate,    setShowEscalate]    = useState(false);
  const [showRaci,        setShowRaci]        = useState(false);
  const [chatOpen,        setChatOpen]        = useState(false);
  const { show: toast, ToastContainer }      = useToast();

  // Change Log state
  const [clEntries,  setClEntries]  = useState<ChangeEntry[]>([]);
  const [clFilter,   setClFilter]   = useState<ChangeFilter>("ALL");
  const [clLoading,  setClLoading]  = useState(false);
  const [clLoaded,   setClLoaded]   = useState(false);

  const fetchChangelog = useCallback(async (filter: ChangeFilter) => {
    setClLoading(true);
    try {
      const qs  = filter !== "ALL" ? `?type=${filter}` : "";
      const res = await fetch(`/api/projects/${projectId}/changelog${qs}`);
      const data = await res.json() as { entries: ChangeEntry[] };
      setClEntries(data.entries ?? []);
      setClLoaded(true);
    } catch {
      toast("Failed to load changelog", "err");
    } finally {
      setClLoading(false);
    }
  }, [projectId, toast]);

  useEffect(() => {
    if (activeTab === "changelog" && !clLoaded) {
      fetchChangelog("ALL");
    }
  }, [activeTab, clLoaded, fetchChangelog]);

  const handleFilterChange = (f: ChangeFilter) => {
    setClFilter(f);
    fetchChangelog(f);
  };

  const allDeps     = [...dependencies, ...blockers];
  const criticalDep = allDeps.find(d => d.blocked);

  const TABS: { id: Tab; label: string }[] = [
    { id: "dependencies", label: "Dependencies" },
    { id: "scope",        label: "Scope"        },
    { id: "raci",         label: "RACI"         },
    { id: "snapshots",    label: "Snapshots"    },
    { id: "audit",        label: "Audit"        },
    { id: "changelog",    label: "Change Log"   },
  ];

  return (
    <div style={{ padding: "24px 28px", fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <style>{`
        .gov-tab { padding: 7px 14px; font-size: 12px; font-weight: 500; border: none; background: none; cursor: pointer; color: #9E9C93; border-bottom: 2px solid transparent; font-family: inherit; transition: color .12s; white-space: nowrap; }
        .gov-tab:hover { color: #18170F; }
        .gov-tab.active { color: #006D6B; border-bottom-color: #006D6B; font-weight: 700; }
        .cl-chip { display: inline-flex; align-items: center; padding: 4px 11px; border-radius: 20px; font-size: 11px; font-weight: 500; border: 1px solid #E5E2D9; background: #F8F7F3; color: #5C5A52; cursor: pointer; transition: all .1s; user-select: none; }
        .cl-chip:hover { background: #F0EEE8; color: #18170F; }
        .cl-chip.on { background: #18170F; color: #fff; border-color: #18170F; font-weight: 600; }
        .cl-avatar { width: 26px; height: 26px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 9px; font-weight: 800; flex-shrink: 0; background: #E5E2D9; color: #5C5A52; letter-spacing: .03em; }
        .cl-entry { display: flex; align-items: flex-start; gap: 12px; padding: 12px 16px; border-bottom: 1px solid #F0EEE8; }
        .cl-entry:last-child { border-bottom: none; }
        .cl-entry:hover { background: #FAFAF8; }
      `}</style>

      <Breadcrumb items={[{ label: "Portfolio", href: "/portfolio" }, { label: projectName, href: `/projects/${projectId}` }, { label: "Governance" }]} />

      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16, gap: 14, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: C.text, letterSpacing: "-.4px", margin: 0, marginBottom: 4 }}>Governance & Audit</h1>
          <p style={{ fontSize: 11, color: C.text2, margin: 0 }}>Dependencies · snapshots · audit trail · RACI · change log</p>
        </div>
        <div style={{ display: "flex", gap: 7, alignItems: "center" }}>
          <Link href={`/projects/${projectId}`} style={{ ...BTN("sm"), textDecoration: "none" }}>← Overview</Link>
          <ChatButton onClick={() => setChatOpen(true)} />
          <button style={BTN("primary", { fontSize: 10, padding: "4px 9px" })} onClick={() => setShowSnapshot(true)}>📸 Snapshot</button>
        </div>
      </div>

      {/* Tab bar */}
      <div style={{ display: "flex", borderBottom: "1px solid #E5E2D9", marginBottom: 20, overflowX: "auto", gap: 0, background: "#fff", borderRadius: "10px 10px 0 0", paddingLeft: 4 }}>
        {TABS.map(t => (
          <button
            key={t.id}
            className={`gov-tab${activeTab === t.id ? " active" : ""}`}
            onClick={() => setActiveTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Dependencies ──────────────────────────────────────────────────── */}
      {activeTab === "dependencies" && (
        <div style={CARD}>
          <div style={CARD_H}>
            <span style={CARD_T}>Project dependencies</span>
            <button style={BTN("sm")} onClick={() => toast("Dependency management in Governance settings", "ok")}>+ Add</button>
          </div>
          {allDeps.length === 0 ? (
            <div style={{ padding: "20px 14px", fontSize: 12, color: C.text3, textAlign: "center" }}>No dependencies configured</div>
          ) : allDeps.map(dep => (
            <div key={dep.id} style={{ display: "flex", alignItems: "center", gap: 9, padding: "9px 14px", borderBottom: `1px solid ${C.border}`, background: dep.blocked ? "rgba(220,38,38,.04)" : undefined }}>
              <Dot c={dep.blocked ? "r" : "g"} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 500, color: C.text }}>
                  {dep.name} ({dep.type === "depends_on" ? "depends on" : "blocked by"})
                </div>
                <div style={{ fontSize: 10, color: C.text3 }}>{dep.status}</div>
              </div>
              <Tag v={dep.blocked ? "r" : "g"}>{dep.blocked ? "Critical" : "OK"}</Tag>
              {dep.blocked && (
                <button style={BTN("danger", { fontSize: 10, padding: "3px 8px" })} onClick={() => setShowEscalate(true)}>Escalate</button>
              )}
            </div>
          ))}
          {criticalDep && (
            <GuardianBar text={`Critical dependency on ${criticalDep.name} — escalation recommended`} />
          )}
        </div>
      )}

      {/* ── Scope ─────────────────────────────────────────────────────────── */}
      {activeTab === "scope" && (
        <div style={CARD}>
          <div style={CARD_H}>
            <span style={CARD_T}>Scope change log</span>
            <button style={BTN("sm")} onClick={() => setShowScopeChange(true)}>+ Change scope</button>
          </div>
          {statusLogs.filter(l => l.note).slice(0, 10).map(log => (
            <div key={log.id} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 14px", borderBottom: `1px solid ${C.border}` }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: STATUS_COLORS[log.status] ?? C.text3, flexShrink: 0, marginTop: 4 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, color: C.text, fontWeight: 500, lineHeight: 1.35 }}>{log.note || `Status → ${log.status}`}</div>
                <div style={{ fontSize: 10, color: C.text3, marginTop: 2 }}>{log.changedBy} · {timeAgo(log.createdAt)}</div>
              </div>
              <Tag v="g">Logged</Tag>
            </div>
          ))}
          {statusLogs.filter(l => l.note).length === 0 && (
            <div style={{ padding: "20px 14px", fontSize: 12, color: C.text3, textAlign: "center" }}>No scope changes logged</div>
          )}
        </div>
      )}

      {/* ── RACI ──────────────────────────────────────────────────────────── */}
      {activeTab === "raci" && (
        <div style={CARD}>
          <div style={CARD_H}>
            <span style={CARD_T}>RACI Matrix</span>
            <button style={BTN("sm")} onClick={() => setShowRaci(true)}>Edit RACI</button>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ background: C.surface2 }}>
                  {["Activity", "Responsible", "Accountable", "Consulted", "Informed"].map(h => (
                    <th key={h} style={{ padding: "8px 12px", textAlign: "left", fontSize: 9, fontWeight: 800, color: C.text3, textTransform: "uppercase", letterSpacing: ".06em", borderBottom: `1px solid ${C.border}` }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  ["Sprint planning", "Project Lead", "Project Lead", "Tech Lead",     "Stakeholder" ],
                  ["Code review",     "Tech Lead",    "Tech Lead",    "Team",          "Project Lead"],
                  ["Budget approval", "Project Lead", "CFO",          "PMO",           "CEO"         ],
                  ["Scope change",    "PMO",          "Sponsor",      "Project Lead",  "Team"        ],
                ].map((row, i) => (
                  <tr key={i} style={{ borderTop: i > 0 ? `1px solid ${C.border}` : undefined }}>
                    {row.map((cell, j) => (
                      <td key={j} style={{ padding: "8px 12px", color: j === 0 ? C.text : C.text2, fontWeight: j === 0 ? 500 : 400 }}>{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Snapshots ─────────────────────────────────────────────────────── */}
      {activeTab === "snapshots" && (
        <div style={CARD}>
          <div style={CARD_H}>
            <span style={CARD_T}>Snapshots</span>
            <span style={CARD_S}>version control</span>
          </div>
          {snapshots.length === 0 ? (
            <div style={{ padding: "20px 14px", fontSize: 12, color: C.text3, textAlign: "center" }}>
              No snapshots yet
              <div style={{ marginTop: 8 }}>
                <button style={BTN("sm")} onClick={() => setShowSnapshot(true)}>Create first snapshot</button>
              </div>
            </div>
          ) : snapshots.map((snap, i) => (
            <div key={snap.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 14px", borderBottom: `1px solid ${C.border}` }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 500, color: C.text }}>
                  {snap.reason || "Manual snapshot"} {snap.healthScore > 0 && `· Score: ${Math.round(snap.healthScore)}`}
                </div>
                <div style={{ fontSize: 10, color: C.text3, marginTop: 2 }}>{timeAgo(snap.createdAt)}</div>
              </div>
              {i === 0 ? <Tag v="g">Current</Tag> : <Tag v="n">v{snapshots.length - i}</Tag>}
              <button style={BTN("sm")} onClick={() => toast(i === 0 ? "Viewing current snapshot" : `Restored to v${snapshots.length - i}`, "ok")}>
                {i === 0 ? "View" : "Restore"}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ── Audit ─────────────────────────────────────────────────────────── */}
      {activeTab === "audit" && (
        <div style={CARD}>
          <div style={CARD_H}>
            <span style={CARD_T}>Audit log</span>
            <span style={CARD_S}>all changes · all actors</span>
          </div>
          {statusLogs.length === 0 ? (
            <div style={{ padding: "20px 14px", fontSize: 12, color: C.text3, textAlign: "center" }}>No activity logged yet</div>
          ) : statusLogs.slice(0, 20).map(log => (
            <Row key={log.id}>
              <div style={{ width: 7, height: 7, borderRadius: "50%", background: STATUS_COLORS[log.status] ?? C.text3, flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 500, color: C.text }}>
                  {log.note || `Status → ${log.status}`}
                </div>
              </div>
              <div style={{ fontSize: 10, color: C.text3, whiteSpace: "nowrap" }}>{log.changedBy} · {timeAgo(log.createdAt)}</div>
            </Row>
          ))}
          <div style={{ padding: "8px 14px" }}>
            <button style={BTN("sm")} onClick={() => toast("Exporting audit log…", "ok")}>Download full audit log</button>
          </div>
        </div>
      )}

      {/* ── Change Log ────────────────────────────────────────────────────── */}
      {activeTab === "changelog" && (
        <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 10, overflow: "hidden" }}>
          {/* Toolbar */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderBottom: `1px solid ${C.border}`, gap: 12, flexWrap: "wrap" }}>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {FILTER_LABELS.map(f => (
                <div
                  key={f.id}
                  className={`cl-chip${clFilter === f.id ? " on" : ""}`}
                  onClick={() => handleFilterChange(f.id)}
                >
                  {f.label}
                </div>
              ))}
            </div>
            <button
              style={BTN("sm")}
              onClick={() => { exportCsv(clEntries, projectName); toast("CSV exported", "ok"); }}
              disabled={clEntries.length === 0}
            >
              Export CSV ↓
            </button>
          </div>

          {/* Entries */}
          {clLoading ? (
            <div style={{ padding: "40px 16px", textAlign: "center", fontSize: 12, color: C.text3 }}>
              <div style={{ display: "inline-block", width: 18, height: 18, border: "2px solid #E5E2D9", borderTopColor: "#006D6B", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          ) : clEntries.length === 0 ? (
            <div style={{ padding: "40px 16px", textAlign: "center", fontSize: 12, color: C.text3 }}>
              No changelog entries found
            </div>
          ) : (
            <div>
              {clEntries.map(entry => {
                const meta = TYPE_META[entry.type];
                return (
                  <div key={entry.id} className="cl-entry">
                    {/* Timestamp */}
                    <div style={{ fontSize: 10, color: "#A8A59C", whiteSpace: "nowrap", paddingTop: 3, minWidth: 130 }}>
                      {fmtTs(entry.createdAt)}
                    </div>

                    {/* Type badge */}
                    <div style={{ paddingTop: 2 }}>
                      <span style={{
                        display: "inline-flex", alignItems: "center",
                        padding: "2px 7px", borderRadius: 4,
                        fontSize: 9, fontWeight: 800, letterSpacing: ".05em", textTransform: "uppercase",
                        background: meta.bg, color: meta.color, border: `1px solid ${meta.border}`,
                        whiteSpace: "nowrap",
                      }}>
                        {meta.label}
                      </span>
                    </div>

                    {/* Avatar */}
                    <div className="cl-avatar">{entry.userInitials}</div>

                    {/* Content */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "baseline", gap: 6, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 12, fontWeight: 500, color: C.text, lineHeight: 1.4 }}>
                          {entry.description}
                        </span>
                        <span style={{ fontSize: 10, color: C.text3 }}>{entry.userName}</span>
                      </div>
                      {(entry.oldValue || entry.newValue) && (
                        <div style={{ marginTop: 4, display: "flex", alignItems: "center", gap: 6 }}>
                          {entry.oldValue && (
                            <span style={{ fontSize: 10, fontFamily: "DM Mono, monospace", background: "#FEF2F2", color: "#DC2626", padding: "1px 6px", borderRadius: 3, border: "1px solid #FECACA" }}>
                              {entry.oldValue}
                            </span>
                          )}
                          {entry.oldValue && entry.newValue && (
                            <span style={{ fontSize: 10, color: C.text3 }}>→</span>
                          )}
                          {entry.newValue && (
                            <span style={{ fontSize: 10, fontFamily: "DM Mono, monospace", background: "#F0FDF4", color: "#16A34A", padding: "1px 6px", borderRadius: 3, border: "1px solid #BBF7D0" }}>
                              {entry.newValue}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Footer count */}
          {!clLoading && clEntries.length > 0 && (
            <div style={{ padding: "8px 16px", borderTop: `1px solid ${C.border}`, fontSize: 10, color: C.text3 }}>
              {clEntries.length} entries
            </div>
          )}
        </div>
      )}

      <ModalSnapshot    open={showSnapshot}    onClose={() => { setShowSnapshot(false);    toast("Snapshot created",       "ok"); }} />
      <ModalScopeChange open={showScopeChange} onClose={() => { setShowScopeChange(false); toast("Scope change submitted", "ok"); }} />
      <ModalEscalate    open={showEscalate}    onClose={() => { setShowEscalate(false);    toast("Escalation sent",         "ok"); }} />
      <ModalRaci        open={showRaci}        onClose={() => { setShowRaci(false);        toast("RACI updated",            "ok"); }} />
      <ToastContainer />
      <ProjectChat open={chatOpen} onClose={() => setChatOpen(false)} projectId={projectId} projectName={projectName} teamMembers={[]} />
    </div>
  );
}
