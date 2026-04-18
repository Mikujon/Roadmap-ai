"use client";
import { useState } from "react";
import Link from "next/link";
import { C, CARD, CARD_H, CARD_T, CARD_S, BTN, Tag, GuardianBar, SyncBar, SrcBadge, useToast } from "@/components/ui/shared";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { ModalAddFeature, ModalNewSprint, ModalFeatureDetail } from "@/components/ui/project-modals";
import { ProjectChat, ChatButton } from "@/components/ui/project-chat";

interface Feature {
  id: string; title: string; status: string;
  source: "jira" | "native"; storyPoints: number;
  externalId: string | null; description: string;
}
interface SprintData {
  id: string; name: string; status: string;
  startDate: string | null; endDate: string | null;
  totalPts: number; donePts: number;
  features: Feature[];
}
interface Props {
  projectId: string; projectName: string;
  sprints: SprintData[]; activeSprintId: string | null;
  totalPts: number; donePts: number; daysLeft: number;
}

const COL_HEADERS = [
  { label: "Todo",        status: "TODO"        },
  { label: "In Progress", status: "IN_PROGRESS" },
  { label: "In Review",   status: "IN_REVIEW"   },
  { label: "Done",        status: "DONE"        },
];

const PRIORITY_TAG: Record<string, { v: "r"|"a"|"g"|"n"; label: string }> = {
  BLOCKED:     { v: "r", label: "Blocked"  },
  IN_PROGRESS: { v: "b" as any, label: "Active"   },
  TODO:        { v: "n", label: "Todo"    },
  DONE:        { v: "g", label: "Done"    },
  IN_REVIEW:   { v: "a", label: "Review"  },
};

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}

export default function ProjectBoardClient({ projectId, projectName, sprints, activeSprintId, totalPts, donePts, daysLeft }: Props) {
  const [currentSprintId, setCurrentSprintId] = useState<string | null>(activeSprintId);
  const [showAddFeature,  setShowAddFeature]  = useState(false);
  const [showNewSprint,   setShowNewSprint]   = useState(false);
  const [showFeatureDetail, setShowFeatureDetail] = useState(false);
  const [selectedFeature, setSelectedFeature] = useState<Feature | null>(null);
  const [chatOpen,        setChatOpen]        = useState(false);
  const { show: toast, ToastContainer } = useToast();

  const activeSprint = sprints.find(s => s.id === currentSprintId) ?? sprints[sprints.length - 1] ?? null;
  const blockedCount = activeSprint?.features.filter(f => f.status === "BLOCKED").length ?? 0;

  return (
    <div style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <div style={{ padding: "24px 28px 0" }}>
        <Breadcrumb items={[{ label: "Portfolio", href: "/portfolio" }, { label: projectName, href: `/projects/${projectId}` }, { label: "Board" }]} />
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16, gap: 14, flexWrap: "wrap" }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: C.text, letterSpacing: "-.4px", margin: 0, marginBottom: 4 }}>
              Board{activeSprint ? ` — ${activeSprint.name}` : ""}
            </h1>
            <p style={{ fontSize: 11, color: C.text2, margin: 0 }}>
              {activeSprint ? `${fmtDate(activeSprint.startDate)}–${fmtDate(activeSprint.endDate)}` : "No active sprint"}
              {activeSprint && activeSprint.totalPts > 0 && ` · ${activeSprint.donePts}/${activeSprint.totalPts} pts`}
              {daysLeft > 0 && ` · ${daysLeft} days left`}
            </p>
          </div>
          <div style={{ display: "flex", gap: 7, alignItems: "center", flexWrap: "wrap" }}>
            <Link href={`/projects/${projectId}`} style={{ ...BTN("sm"), textDecoration: "none" }}>← Overview</Link>
            {/* Sprint selector */}
            {sprints.length > 1 && (
              <select
                value={currentSprintId ?? ""}
                onChange={e => setCurrentSprintId(e.target.value)}
                style={{ fontSize: 11, padding: "4px 8px", border: `1px solid ${C.border}`, borderRadius: 6, background: C.surface, color: C.text, fontFamily: "inherit", cursor: "pointer" }}
              >
                {sprints.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            )}
            <button style={BTN("sm")} onClick={() => setShowAddFeature(true)}>+ Feature</button>
            <ChatButton onClick={() => setChatOpen(true)} />
            <button style={BTN("primary", { fontSize: 10, padding: "4px 9px" })} onClick={() => setShowNewSprint(true)}>New sprint</button>
          </div>
        </div>
      </div>

      {/* ── Kanban ── */}
      {!activeSprint ? (
        <div style={{ padding: "60px 28px", textAlign: "center" }}>
          <p style={{ fontSize: 13, color: C.text3, marginBottom: 12 }}>No sprints yet. Create your first sprint.</p>
          <button style={BTN("primary")} onClick={() => setShowNewSprint(true)}>New sprint</button>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, padding: "0 14px 14px" }}>
          {COL_HEADERS.map(col => {
            const cards = activeSprint.features.filter(f => f.status === col.status);
            return (
              <div key={col.status} style={{ background: C.surface2, borderRadius: 12, padding: 10 }}>
                <div style={{ fontSize: 9, fontWeight: 800, color: C.text2, letterSpacing: ".07em", textTransform: "uppercase", marginBottom: 9, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  {col.label}
                  <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 8, background: C.surface, color: C.text3, fontWeight: 700 }}>{cards.length}</span>
                </div>

                {cards.map(card => {
                  const isBlocked = card.status === "BLOCKED";
                  const isDone    = card.status === "DONE";
                  return (
                    <div
                      key={card.id}
                      onClick={() => { if (!isDone) { setSelectedFeature(card); setShowFeatureDetail(true); }}}
                      style={{
                        background:  isBlocked ? C.redBg : C.surface,
                        border:      `1px solid ${isBlocked ? C.redBorder : C.border}`,
                        borderRadius: 8, padding: 10, marginBottom: 7,
                        cursor:      isDone ? "default" : "pointer",
                        opacity:     isDone ? 0.6 : 1,
                        transition:  ".12s",
                      }}
                    >
                      {isBlocked && (
                        <div style={{ fontSize: 9, fontWeight: 800, color: C.redText, marginBottom: 5 }}>⚠ BLOCKED</div>
                      )}
                      <div style={{ fontSize: 11, fontWeight: 600, color: C.text, marginBottom: 6, lineHeight: 1.35 }}>{card.title}</div>
                      <div style={{ display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap" }}>
                        <SrcBadge type={card.source} />
                        {card.externalId && <span style={{ fontSize: 9, color: C.text3 }}>{card.externalId}</span>}
                        {card.storyPoints > 0 && <span style={{ fontSize: 9, color: C.text3, marginLeft: "auto" }}>{card.storyPoints}pts</span>}
                      </div>
                    </div>
                  );
                })}

                <button
                  onClick={() => setShowAddFeature(true)}
                  style={{ ...BTN("sm"), width: "100%", justifyContent: "center", marginTop: 5 }}
                >
                  + Add task
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Guardian bar ── */}
      {activeSprint && blockedCount > 0 && (
        <div style={{ ...CARD, margin: "0 14px 14px" }}>
          <GuardianBar
            text={`${blockedCount} blocked task${blockedCount > 1 ? "s" : ""} in active sprint${daysLeft > 0 && daysLeft <= 7 ? ` · only ${daysLeft} days remaining` : ""} · consider re-prioritisation`}
            action="Re-prioritise ↗"
            onAction={() => toast("Re-prioritisation noted", "ok")}
          />
        </div>
      )}

      {/* ── Modals ── */}
      <ModalAddFeature    open={showAddFeature}    onClose={() => { setShowAddFeature(false);    toast("Feature added", "ok");   }} />
      <ModalNewSprint     open={showNewSprint}      onClose={() => { setShowNewSprint(false);      toast("Sprint created", "ok"); }} />
      <ModalFeatureDetail open={showFeatureDetail}  onClose={() => { setShowFeatureDetail(false);  toast("Feature updated", "ok");}} />
      <ToastContainer />
      <ProjectChat open={chatOpen} onClose={() => setChatOpen(false)} projectId={projectId} projectName={projectName} teamMembers={[]} />
    </div>
  );
}
