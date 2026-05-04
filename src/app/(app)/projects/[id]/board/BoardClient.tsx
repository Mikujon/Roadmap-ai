"use client";
import { useState } from "react";
import Link from "next/link";
import { C, CARD, BTN, GuardianBar, SrcBadge, useToast } from "@/components/ui/shared";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { ModalAddFeature, ModalNewSprint } from "@/components/ui/project-modals";
import { ProjectChat, ChatButton } from "@/components/ui/project-chat";

type FeatureStatus = "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE" | "BLOCKED";

interface Feature {
  id: string; title: string; status: FeatureStatus;
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

const COL_HEADERS: { label: string; status: FeatureStatus }[] = [
  { label: "Todo",        status: "TODO"        },
  { label: "In Progress", status: "IN_PROGRESS" },
  { label: "In Review",   status: "IN_REVIEW"   },
  { label: "Done",        status: "DONE"        },
];

const STATUS_COLOR: Record<FeatureStatus, string> = {
  TODO:        C.text3,
  IN_PROGRESS: "#2563EB",
  IN_REVIEW:   "#D97706",
  DONE:        "#059669",
  BLOCKED:     "#DC2626",
};

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}

export default function ProjectBoardClient({
  projectId, projectName,
  sprints: initialSprints, activeSprintId,
  totalPts, donePts, daysLeft,
}: Props) {
  // ── Local state (server props are the initial snapshot only) ──────────────
  const [sprints,          setSprints]          = useState<SprintData[]>(initialSprints);
  const [currentSprintId,  setCurrentSprintId]  = useState<string | null>(activeSprintId);
  const [showAddFeature,   setShowAddFeature]   = useState(false);
  const [showNewSprint,    setShowNewSprint]     = useState(false);
  const [dragOverCol,      setDragOverCol]       = useState<FeatureStatus | null>(null);
  const [chatOpen,         setChatOpen]          = useState(false);
  const { show: toast, ToastContainer } = useToast();

  const activeSprint = sprints.find(s => s.id === currentSprintId) ?? sprints[sprints.length - 1] ?? null;
  const blockedCount = activeSprint?.features.filter(f => f.status === "BLOCKED").length ?? 0;

  // ── Optimistic update → PATCH ─────────────────────────────────────────────
  const updateFeature = async (featureId: string, newStatus: FeatureStatus) => {
    setSprints(prev =>
      prev.map(s => ({
        ...s,
        features: s.features.map(f =>
          f.id === featureId ? { ...f, status: newStatus } : f
        ),
      }))
    );
    try {
      const res = await fetch(`/api/features/${featureId}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error("update failed");
    } catch {
      // Revert on error
      setSprints(initialSprints);
      toast("Failed to update feature", "error" as any);
    }
  };

  // ── Drag-and-drop handlers ─────────────────────────────────────────────────
  const handleDragStart = (e: React.DragEvent, featureId: string) => {
    e.dataTransfer.setData("featureId", featureId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDrop = (e: React.DragEvent, col: FeatureStatus) => {
    e.preventDefault();
    const featureId = e.dataTransfer.getData("featureId");
    if (featureId) updateFeature(featureId, col);
    setDragOverCol(null);
  };

  return (
    <div style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <div style={{ padding: "24px 28px 0" }}>
        <Breadcrumb items={[
          { label: "Portfolio", href: "/portfolio" },
          { label: projectName, href: `/projects/${projectId}` },
          { label: "Board" },
        ]} />
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
            const cards   = activeSprint.features.filter(f => f.status === col.status);
            const isOver  = dragOverCol === col.status;
            return (
              <div
                key={col.status}
                onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; setDragOverCol(col.status); }}
                onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOverCol(null); }}
                onDrop={e => handleDrop(e, col.status)}
                style={{
                  background:   isOver ? "#EDFAF9" : C.surface2,
                  borderRadius: 12,
                  padding:      10,
                  border:       `1.5px solid ${isOver ? "#006D6B" : "transparent"}`,
                  transition:   "all 0.12s",
                  minHeight:    200,
                }}
              >
                <div style={{ fontSize: 9, fontWeight: 800, color: C.text2, letterSpacing: ".07em", textTransform: "uppercase", marginBottom: 9, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  {col.label}
                  <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 8, background: C.surface, color: C.text3, fontWeight: 700 }}>{cards.length}</span>
                </div>

                {isOver && cards.length === 0 && (
                  <div style={{ textAlign: "center", padding: "16px 0", fontSize: 11, color: "#006D6B", fontWeight: 600 }}>Drop here</div>
                )}

                {cards.map(card => {
                  const isBlocked = card.status === "BLOCKED";
                  const isDone    = card.status === "DONE";
                  return (
                    <div
                      key={card.id}
                      draggable
                      onDragStart={e => handleDragStart(e, card.id)}
                      style={{
                        background:   isBlocked ? C.redBg : C.surface,
                        border:       `1px solid ${isBlocked ? C.redBorder : C.border}`,
                        borderRadius: 8, padding: 10, marginBottom: 7,
                        cursor:       "grab",
                        opacity:      isDone ? 0.65 : 1,
                        transition:   ".12s",
                      }}
                    >
                      {isBlocked && (
                        <div style={{ fontSize: 9, fontWeight: 800, color: C.redText, marginBottom: 5 }}>⚠ BLOCKED</div>
                      )}
                      <div style={{ fontSize: 11, fontWeight: 600, color: C.text, marginBottom: 6, lineHeight: 1.35, textDecoration: isDone ? "line-through" : "none" }}>
                        {card.title}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap" }}>
                        <SrcBadge type={card.source} />
                        {card.externalId && <span style={{ fontSize: 9, color: C.text3 }}>{card.externalId}</span>}
                        {card.storyPoints > 0 && <span style={{ fontSize: 9, color: C.text3, marginLeft: "auto" }}>{card.storyPoints}pts</span>}
                      </div>
                      {/* Inline status changer */}
                      <select
                        value={card.status}
                        onChange={e => { e.stopPropagation(); updateFeature(card.id, e.target.value as FeatureStatus); }}
                        onClick={e => e.stopPropagation()}
                        style={{
                          marginTop: 8, width: "100%", fontSize: 9, padding: "2px 4px",
                          border: `1px solid ${C.border}`, borderRadius: 4,
                          background: C.surface, color: STATUS_COLOR[card.status],
                          fontFamily: "inherit", fontWeight: 700, cursor: "pointer", outline: "none",
                        }}
                      >
                        <option value="TODO">Todo</option>
                        <option value="IN_PROGRESS">In Progress</option>
                        <option value="IN_REVIEW">In Review</option>
                        <option value="DONE">Done</option>
                        <option value="BLOCKED">Blocked</option>
                      </select>
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
      <ModalAddFeature  open={showAddFeature} onClose={() => { setShowAddFeature(false); toast("Feature added", "ok"); }} />
      <ModalNewSprint   open={showNewSprint}  onClose={() => { setShowNewSprint(false);  toast("Sprint created", "ok"); }} />
      <ToastContainer />
      <ProjectChat open={chatOpen} onClose={() => setChatOpen(false)} projectId={projectId} projectName={projectName} teamMembers={[]} />
    </div>
  );
}
