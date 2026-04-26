"use client";
import { useState } from "react";
import Link from "next/link";
import { C, CARD, CARD_H, CARD_T, CARD_S, BTN, Tag, GuardianBar, RiskScore, MemberRow, useToast, DecItem } from "@/components/ui/shared";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { ModalAddFeature, ModalAddRisk, ModalScopeChange, ModalEscalate, ModalAiMitigation } from "@/components/ui/project-modals";
import { ProjectChat, ChatButton } from "@/components/ui/project-chat";
import GanttView from "@/components/views/GanttView";
import TimelineView from "@/components/views/TimelineView";
import SprintWeekView from "@/components/views/SprintWeekView";

type HealthStatus = "OFF_TRACK" | "AT_RISK" | "ON_TRACK" | "COMPLETED" | "NOT_STARTED";

interface ProjectData {
  id: string; name: string; description: string;
  startDate: string; endDate: string; budgetTotal: number; status: string;
}
interface MetricsData {
  spi: number; cpi: number; healthScore: number; healthStatus: HealthStatus;
  progressNominal: number; costActual: number; alerts: any[];
}
interface PhaseData {
  id: string; name: string; startDate: string | null; endDate: string | null; status: string; pct: number;
}
interface SprintData {
  id: string; name: string; startDate: string | null; endDate: string | null;
  totalPts: number; donePts: number; daysLeft: number;
  features: { id: string; title: string; status: string; source: "jira" | "native"; storyPoints: number }[];
}
interface RiskData {
  id: string; title: string; probability: number; impact: number; score: number;
  status: string; owner: string; category: string;
}
interface MemberData {
  id: string; name: string; role: string;
  estimatedHours: number; actualHours: number; capacityHours: number;
}

interface AllSprintItem {
  id: string;
  name: string;
  startDate: string | null;
  endDate: string | null;
  status: string;
  phaseId?: string | null;
  features: { id: string; title: string; status: string; priority: string; estimatedHours: number | null }[];
}

interface Props {
  projectId: string;
  project: ProjectData;
  metrics: MetricsData;
  phases: PhaseData[];
  activeSprint: SprintData | null;
  risks: RiskData[];
  assignments: MemberData[];
  teamLead: string;
  allSprints?: AllSprintItem[];
}

const HEALTH_TAG: Record<HealthStatus, { v: "r"|"a"|"g"|"b"|"n"; label: string }> = {
  OFF_TRACK:   { v: "r", label: "Off track"  },
  AT_RISK:     { v: "a", label: "At risk"    },
  ON_TRACK:    { v: "g", label: "On track"   },
  COMPLETED:   { v: "b", label: "Completed"  },
  NOT_STARTED: { v: "n", label: "Not started"},
};

const PHASE_COLOR: Record<string, string> = {
  DONE:      C.green,
  ACTIVE:    C.blue,
  UPCOMING:  C.text3,
  NOT_STARTED: C.text3,
};

const FEAT_DOT: Record<string, "r"|"b"|"gr"|"g"> = {
  BLOCKED:     "r",
  IN_PROGRESS: "b",
  TODO:        "gr",
  DONE:        "g",
};
const FEAT_TAG: Record<string, { v: "r"|"b"|"n"|"g"; label: string }> = {
  BLOCKED:     { v: "r", label: "Blocked"     },
  IN_PROGRESS: { v: "b", label: "In progress" },
  TODO:        { v: "n", label: "Todo"        },
  DONE:        { v: "g", label: "Done"        },
};

function getPhaseRange(
  index: number,
  total: number,
  projectStart: Date,
  projectEnd: Date
): { start: Date; end: Date; progress: number } {
  const totalMs = projectEnd.getTime() - projectStart.getTime();
  const phaseMs = totalMs / total;
  const start = new Date(projectStart.getTime() + index * phaseMs);
  const end = new Date(projectStart.getTime() + (index + 1) * phaseMs);
  const now = Date.now();
  const progress = now < start.getTime() ? 0
    : now > end.getTime() ? 100
    : Math.round((now - start.getTime()) / phaseMs * 100);
  return { start, end, progress };
}

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit" });
}
function fmtCurrency(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}
function initials(name: string) {
  return name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
}

const MEMBER_COLORS = [
  { bg: "#111111",  color: "#fff"    },
  { bg: C.blueBg,   color: C.blueText   },
  { bg: C.tealBg,   color: C.tealText   },
  { bg: C.greenBg,  color: C.greenText  },
  { bg: C.purpleBg, color: C.purpleText },
];

const PROJECT_STATUS_META: Record<string, { label: string; color: string; bg: string; border: string }> = {
  NOT_STARTED: { label: "Planning",  color: "#2563EB", bg: "#EFF6FF", border: "#BFDBFE" },
  ACTIVE:      { label: "Active",    color: "#059669", bg: "#F0FDF4", border: "#BBF7D0" },
  PAUSED:      { label: "On Hold",   color: "#D97706", bg: "#FFFBEB", border: "#FDE68A" },
  COMPLETED:   { label: "Completed", color: "#006D6B", bg: "#EDFAF9", border: "#99F6E4" },
  CLOSED:      { label: "Cancelled", color: "#DC2626", bg: "#FEF2F2", border: "#FECACA" },
  ARCHIVED:    { label: "Archived",  color: "#9E9C93", bg: "#F8F7F3", border: "#E5E2D9" },
};

const STATUS_ORDER = ["NOT_STARTED","ACTIVE","PAUSED","COMPLETED","CLOSED","ARCHIVED"];

type ProjectTab = "overview" | "gantt" | "timeline" | "sprint-week";

export default function ProjectOverviewClient({ projectId, project, metrics, phases, activeSprint, risks, assignments, teamLead, allSprints = [] }: Props) {
  const [activeTab, setActiveTab] = useState<ProjectTab>("overview");
  const [showAddFeature, setShowAddFeature] = useState(false);
  const [showAddRisk, setShowAddRisk]       = useState(false);
  const [showScopeChange, setShowScopeChange] = useState(false);
  const [showEscalate, setShowEscalate]     = useState(false);
  const [showAiMitigation, setShowAiMitigation] = useState(false);
  const [ddOpen, setDdOpen]                 = useState(false);
  const [statusDropOpen, setStatusDropOpen] = useState(false);
  const [projectStatus, setProjectStatus]   = useState(project.status);
  const [chatOpen, setChatOpen]             = useState(false);
  const { show: toast, ToastContainer }     = useToast();

  const chatTeam = assignments.map(a => ({ id: a.id, name: a.name, role: a.role }));

  const changeStatus = async (newStatus: string) => {
    setProjectStatus(newStatus);
    setStatusDropOpen(false);
    await fetch(`/api/projects/${projectId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    toast("Status updated", "ok");
  };

  const healthTag = HEALTH_TAG[metrics.healthStatus] ?? HEALTH_TAG.NOT_STARTED;
  const scoreColor = metrics.healthScore >= 80 ? C.greenText : metrics.healthScore >= 60 ? C.amberText : C.redText;
  const statusMeta = PROJECT_STATUS_META[projectStatus] ?? PROJECT_STATUS_META.NOT_STARTED;

  const criticalAlert = metrics.alerts.find((a: any) => a.level === "critical");
  const warnAlert     = metrics.alerts.find((a: any) => a.level === "warning");
  const topRisk       = risks[0];

  return (
    <div style={{ padding: "24px 28px", fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <Breadcrumb items={[{ label: "Portfolio", href: "/portfolio" }, { label: project.name }]} />

      {/* ── View tabs ── */}
      <div style={{ display: "flex", gap: 2, marginBottom: 20, background: "#F4F2EC", border: "1px solid #E5E2D9", borderRadius: 10, padding: 3, width: "fit-content" }}>
        {([
          ["overview",    "Overview"],
          ["gantt",       "Gantt"],
          ["timeline",    "Timeline"],
          ["sprint-week", "Sprint Week"],
        ] as [ProjectTab, string][]).map(([t, l]) => (
          <button key={t} onClick={() => setActiveTab(t)} style={{
            fontSize: 11, fontWeight: 600, padding: "5px 14px", borderRadius: 7,
            border: "none", cursor: "pointer", fontFamily: "inherit",
            background: activeTab === t ? "#18170F" : "transparent",
            color: activeTab === t ? "#fff" : "#5C5A52",
          }}>
            {l}
          </button>
        ))}
      </div>

      {/* ── Gantt tab ── */}
      {activeTab === "gantt" && (
        <GanttView
          phases={phases.map(ph => ({ id: ph.id, name: ph.name, startDate: ph.startDate, endDate: ph.endDate, status: ph.status, pct: ph.pct }))}
          sprints={allSprints.map(s => ({ id: s.id, name: s.name, startDate: s.startDate, endDate: s.endDate, status: s.status, phaseId: s.phaseId, features: s.features }))}
          projectStart={new Date(project.startDate)}
          projectEnd={new Date(project.endDate)}
        />
      )}

      {/* ── Timeline tab ── */}
      {activeTab === "timeline" && (
        <TimelineView
          phases={phases.map(ph => ({ id: ph.id, name: ph.name, startDate: ph.startDate, endDate: ph.endDate, status: ph.status, pct: ph.pct }))}
          sprints={allSprints.map(s => ({ id: s.id, name: s.name, startDate: s.startDate, endDate: s.endDate, status: s.status, phaseId: s.phaseId }))}
          projectStart={new Date(project.startDate)}
          projectEnd={new Date(project.endDate)}
        />
      )}

      {/* ── Sprint Week tab ── */}
      {activeTab === "sprint-week" && (
        <SprintWeekView sprints={allSprints} />
      )}

      {/* ── Overview tab ── */}
      {activeTab !== "overview" ? null : (<>

      {/* ── Page header ── */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20, gap: 14, flexWrap: "wrap" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 4, flexWrap: "wrap" }}>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: C.text, letterSpacing: "-.4px", margin: 0 }}>{project.name}</h1>
            {/* Project status badge + dropdown */}
            <div style={{ position: "relative" }}>
              <button
                onClick={() => setStatusDropOpen(o => !o)}
                style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, cursor: "pointer", border: `1.5px solid ${statusMeta.border}`, background: statusMeta.bg, color: statusMeta.color, fontFamily: "inherit" }}
              >
                {statusMeta.label}
                <svg width="9" height="9" viewBox="0 0 10 10" fill="none"><path d="M2 3.5l3 3 3-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
              </button>
              {statusDropOpen && (
                <>
                  <div style={{ position: "fixed", inset: 0, zIndex: 49 }} onClick={() => setStatusDropOpen(false)} />
                  <div style={{ position: "absolute", top: "calc(100% + 5px)", left: 0, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, boxShadow: "0 4px 16px rgba(0,0,0,.08)", padding: 5, minWidth: 150, zIndex: 50 }}>
                    {STATUS_ORDER.map(s => {
                      const sm = PROJECT_STATUS_META[s];
                      return (
                        <button key={s} onClick={() => changeStatus(s)} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", fontSize: 12, cursor: "pointer", borderRadius: 7, border: "none", background: s === projectStatus ? C.surface2 : "none", width: "100%", textAlign: "left", fontFamily: "inherit", color: sm.color, fontWeight: s === projectStatus ? 700 : 500 }}>
                          <span style={{ width: 7, height: 7, borderRadius: "50%", background: sm.color, flexShrink: 0 }} />
                          {sm.label}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
            <Tag v={healthTag.v}>{healthTag.label}</Tag>
            <span style={{ fontSize: 11, color: C.text3, fontFamily: "'DM Mono', monospace" }}>
              score: <strong style={{ color: scoreColor }}>{metrics.healthScore}</strong>
            </span>
          </div>
          <p style={{ fontSize: 11, color: C.text2, margin: 0 }}>
            {fmtDate(project.startDate)} – {fmtDate(project.endDate)}
            {project.budgetTotal > 0 && ` · Budget ${fmtCurrency(project.budgetTotal)}`}
            {teamLead !== "—" && ` · Lead: ${teamLead}`}
            {activeSprint && ` · ${activeSprint.name} active`}
          </p>
        </div>
        <div style={{ display: "flex", gap: 7, alignItems: "center", flexWrap: "wrap" }}>
          <Link href={`/projects/${projectId}/board`}               style={{ ...BTN("sm"), textDecoration: "none" }}>Board</Link>
          <Link href={`/projects/${projectId}/risks`}               style={{ ...BTN("sm"), textDecoration: "none" }}>Risks</Link>
          <Link href={`/projects/${projectId}/financials`}          style={{ ...BTN("sm"), textDecoration: "none" }}>Financials</Link>
          <Link href={`/projects/${projectId}/governance`}          style={{ ...BTN("sm"), textDecoration: "none" }}>Governance</Link>
          <Link href={`/projects/${projectId}/functional-analysis`} style={{ ...BTN("sm"), textDecoration: "none" }}>FA</Link>
          <Link href={`/projects/${projectId}/documents`}           style={{ ...BTN("sm"), textDecoration: "none" }}>Docs</Link>
          <ChatButton onClick={() => setChatOpen(true)} />
          <button style={BTN("primary")}>Edit project</button>
          <div style={{ position: "relative" }}>
            <button style={BTN("default")} onClick={() => setDdOpen(o => !o)}>⋯</button>
            {ddOpen && (
              <>
                <div style={{ position: "fixed", inset: 0, zIndex: 49 }} onClick={() => setDdOpen(false)} />
                <div style={{ position: "absolute", top: "calc(100% + 5px)", right: 0, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, boxShadow: "0 4px 16px rgba(0,0,0,.08)", padding: 5, minWidth: 160, zIndex: 50 }}>
                  {([
                    ["+ Scope change", () => { setDdOpen(false); setShowScopeChange(true); }],
                    ["Snapshot",       () => { setDdOpen(false); toast("Snapshot created", "ok"); }],
                    ["Closure report", () => { setDdOpen(false); }],
                  ] as [string, () => void][]).map(([label, fn]) => (
                    <button key={label} onClick={fn} style={{ display: "flex", alignItems: "center", padding: "7px 10px", fontSize: 12, color: C.text2, cursor: "pointer", borderRadius: 7, border: "none", background: "none", width: "100%", textAlign: "left", fontFamily: "inherit" }}>
                      {label}
                    </button>
                  ))}
                  <div style={{ height: 1, background: C.border, margin: "4px 0" }} />
                  <button onClick={() => setDdOpen(false)} style={{ display: "flex", alignItems: "center", padding: "7px 10px", fontSize: 12, color: C.redText, cursor: "pointer", borderRadius: 7, border: "none", background: "none", width: "100%", textAlign: "left", fontFamily: "inherit" }}>
                    Archive project
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── KPI strip ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 16 }}>
        {[
          { label: "Progress",     value: `${metrics.progressNominal}%`,  sub: activeSprint ? `${activeSprint.name} · ${activeSprint.donePts}/${activeSprint.totalPts} pts` : "no active sprint", v: metrics.progressNominal >= 70 ? "ok" : "warn" },
          { label: "Budget spent", value: fmtCurrency(metrics.costActual), sub: project.budgetTotal > 0 ? `of ${fmtCurrency(project.budgetTotal)} BAC` : "no budget set",                       v: project.budgetTotal > 0 && metrics.costActual > project.budgetTotal * 0.9 ? "warn" : "ok" },
          { label: "CPI",          value: metrics.cpi.toFixed(2),          sub: metrics.cpi >= 1 ? "cost on track" : "over budget pacing",                                                      v: metrics.cpi >= 0.95 ? "ok" : "warn" },
          { label: "SPI",          value: metrics.spi.toFixed(2),          sub: metrics.spi >= 1 ? "ahead of schedule" : "behind schedule",                                                     v: metrics.spi >= 0.9 ? "ok" : "warn" },
        ].map(k => {
          const isOk = k.v === "ok";
          return (
            <div key={k.label} style={{ background: isOk ? C.greenBg : C.amberBg, border: `1px solid ${isOk ? C.greenBorder : C.amberBorder}`, borderRadius: 10, padding: "12px 14px" }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: C.text3, textTransform: "uppercase", letterSpacing: ".07em", marginBottom: 4 }}>{k.label}</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: isOk ? C.greenText : C.amberText, letterSpacing: "-.5px", marginBottom: 2, fontFamily: k.label === "CPI" || k.label === "SPI" ? "'DM Mono', monospace" : undefined }}>{k.value}</div>
              <div style={{ fontSize: 10, color: C.text3 }}>{k.sub}</div>
            </div>
          );
        })}
      </div>

      {/* ── Two-column main ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 12, alignItems: "start" }}>
        {/* Left */}
        <div>
          {/* Timeline / Phases */}
          {phases.length > 0 && (
            <div style={CARD}>
              <div style={CARD_H}>
                <span style={CARD_T}>Phases / Timeline</span>
                <span style={CARD_S}>{phases.length} phases</span>
              </div>
              <div style={{ padding: "10px 14px", display: "flex", flexDirection: "column", gap: 7 }}>
                {phases.map((ph, index) => {
                  const { start, end, progress } = getPhaseRange(index, phases.length, new Date(project.startDate), new Date(project.endDate));
                  const barColor = progress === 100 ? "#059669" : progress > 0 ? "#2563EB" : "#9CA3AF";
                  const dateRange = `${start.toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}–${end.toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}`;
                  return (
                    <div key={ph.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ fontSize: 11, color: C.text2, width: 110, flexShrink: 0 }}>{ph.name}</div>
                      <div style={{ flex: 1, height: 18, background: C.surface2, borderRadius: 4, overflow: "hidden" }}>
                        <div style={{ width: `${Math.max(progress, 2)}%`, height: "100%", background: barColor, display: "flex", alignItems: "center", paddingLeft: 7, fontSize: 9, color: "#fff", fontWeight: 700, borderRadius: 4, transition: "width 0.4s" }}>
                          {progress > 8 ? (progress === 100 ? "Done" : `${progress}%`) : ""}
                        </div>
                      </div>
                      <div style={{ fontSize: 10, color: C.text3, width: 100, textAlign: "right", flexShrink: 0 }}>
                        {dateRange} · {progress}%
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Active sprint */}
          {activeSprint && (
            <div style={CARD}>
              <div style={CARD_H}>
                <span style={CARD_T}>{activeSprint.name} — active</span>
                <span style={CARD_S}>
                  {fmtDate(activeSprint.startDate)}–{fmtDate(activeSprint.endDate)}
                  {activeSprint.totalPts > 0 && ` · ${activeSprint.donePts}/${activeSprint.totalPts} pts`}
                  {activeSprint.daysLeft > 0 && ` · ${activeSprint.daysLeft} days left`}
                </span>
              </div>
              {activeSprint.features.slice(0, 5).map(f => {
                const dotC = FEAT_DOT[f.status] ?? "gr";
                const tagInfo = FEAT_TAG[f.status] ?? { v: "n" as const, label: f.status };
                const isBlocked = f.status === "BLOCKED";
                return (
                  <div key={f.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 14px", borderBottom: `1px solid ${C.border}`, background: isBlocked ? "rgba(220,38,38,.04)" : undefined, borderLeft: isBlocked ? `3px solid ${C.red}` : undefined }}>
                    <div style={{ width: 7, height: 7, borderRadius: "50%", background: dotC === "r" ? C.red : dotC === "b" ? C.blue : dotC === "g" ? C.green : C.text3, flexShrink: 0 }} />
                    <div style={{ flex: 1, fontSize: 12, fontWeight: 500, color: C.text }}>{f.title}</div>
                    <Tag v={tagInfo.v}>{tagInfo.label}</Tag>
                    {f.source === "jira" && <span style={{ fontSize: 9, fontWeight: 700, padding: "1px 5px", borderRadius: 4, background: C.blueBg, color: C.blueText }}>Jira</span>}
                    {f.source === "native" && <span style={{ fontSize: 9, fontWeight: 700, padding: "1px 5px", borderRadius: 4, background: C.purpleBg, color: C.purpleText }}>Native</span>}
                  </div>
                );
              })}
              <div style={{ padding: "10px 14px", display: "flex", gap: 7 }}>
                <Link href={`/projects/${projectId}/board`} style={{ ...BTN("primary", { fontSize: 10, padding: "4px 9px" }), textDecoration: "none" }}>Open board ↗</Link>
                <button style={BTN("sm")} onClick={() => setShowAddFeature(true)}>+ Feature</button>
              </div>
              {criticalAlert && (
                <GuardianBar
                  text={criticalAlert.detail ?? criticalAlert.title}
                  action="Re-prioritise"
                  onAction={() => toast("Re-prioritisation noted", "ok")}
                />
              )}
            </div>
          )}

          {/* No sprint fallback */}
          {!activeSprint && phases.length === 0 && (
            <div style={{ ...CARD, padding: "32px", textAlign: "center" as const }}>
              <p style={{ fontSize: 13, color: C.text3, margin: 0, marginBottom: 12 }}>No active sprint or phases yet</p>
              <Link href={`/projects/${projectId}/board`} style={{ ...BTN("primary"), textDecoration: "none" }}>Go to Board</Link>
            </div>
          )}
        </div>

        {/* Right */}
        <div>
          {/* Top risks */}
          <div style={CARD}>
            <div style={CARD_H}>
              <span style={CARD_T}>Top risks</span>
              <Link href={`/projects/${projectId}/risks`} style={{ ...BTN("sm"), textDecoration: "none" }}>All →</Link>
            </div>
            {risks.length === 0 ? (
              <div style={{ padding: "20px 14px", fontSize: 12, color: C.text3, textAlign: "center" }}>No open risks</div>
            ) : risks.slice(0, 3).map(r => (
              <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderBottom: `1px solid ${C.border}`, background: r.score >= 15 ? "rgba(220,38,38,.04)" : undefined }}>
                <RiskScore score={r.score} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: C.text }}>{r.title}</div>
                  <div style={{ fontSize: 10, color: C.text3 }}>P:{r.probability} × I:{r.impact} · {r.owner}</div>
                </div>
                <Tag v={r.score >= 15 ? "r" : r.score >= 8 ? "a" : "n"}>
                  {r.score >= 15 ? "Critical" : r.score >= 8 ? "High" : "Medium"}
                </Tag>
                {r.score >= 10 && (
                  <button style={BTN("danger", { fontSize: 10, padding: "3px 8px" })} onClick={() => setShowAiMitigation(true)}>AI fix</button>
                )}
              </div>
            ))}
          </div>

          {/* Team */}
          <div style={CARD}>
            <div style={CARD_H}>
              <span style={CARD_T}>Assigned team</span>
              <button style={BTN("sm")} onClick={() => toast("Team management opened", "ok")}>Manage</button>
            </div>
            {assignments.length === 0 ? (
              <div style={{ padding: "20px 14px", fontSize: 12, color: C.text3, textAlign: "center" }}>No team members assigned</div>
            ) : assignments.slice(0, 5).map((m, i) => {
              const col = MEMBER_COLORS[i % MEMBER_COLORS.length];
              const util = m.capacityHours > 0 ? Math.round((m.actualHours / m.capacityHours) * 100) : 0;
              return (
                <MemberRow key={m.id} initials={initials(m.name)} avatarBg={col.bg} avatarColor={col.color} name={m.name} sub={`${m.role} · ${m.estimatedHours}h est`}>
                  <Tag v={util > 100 ? "r" : util > 80 ? "a" : "g"}>{m.role}</Tag>
                </MemberRow>
              );
            })}
          </div>

          {/* AI governance insights */}
          <div style={CARD}>
            <div style={CARD_H}><span style={CARD_T}>AI Governance insights</span></div>
            {!criticalAlert && !warnAlert ? (
              <div style={{ padding: "16px 14px" }}>
                <DecItem priority="good" text="All health indicators within normal range — monitor schedule weekly." />
              </div>
            ) : (
              <div style={{ padding: "6px 0" }}>
                {warnAlert && <DecItem priority="watch" text={warnAlert.detail ?? warnAlert.title} />}
                {criticalAlert && (
                  <DecItem
                    priority="urgent"
                    text={criticalAlert.detail ?? criticalAlert.title}
                    actions={<button style={BTN("danger", { fontSize: 10, padding: "3px 8px" })} onClick={() => setShowEscalate(true)}>Escalate</button>}
                  />
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      </>)}

      {/* ── Modals ── */}
      <ModalAddFeature   open={showAddFeature}    onClose={() => { setShowAddFeature(false);   toast("Feature added", "ok");         }} />
      <ModalAddRisk      open={showAddRisk}        onClose={() => { setShowAddRisk(false);       toast("Risk added", "ok");            }} />
      <ModalScopeChange  open={showScopeChange}    onClose={() => { setShowScopeChange(false);   toast("Scope change submitted", "ok");}} />
      <ModalEscalate     open={showEscalate}       onClose={() => { setShowEscalate(false);       toast("Escalation sent", "ok");       }} />
      <ModalAiMitigation open={showAiMitigation}   onClose={() => setShowAiMitigation(false)} onEscalate={() => setShowEscalate(true)} />
      <ToastContainer />
      <ProjectChat open={chatOpen} onClose={() => setChatOpen(false)} projectId={projectId} projectName={project.name} teamMembers={chatTeam} />
    </div>
  );
}
