"use client";
import { useState } from "react";
import Link from "next/link";
import { C, CARD, CARD_H, CARD_T, CARD_S, BTN, Tag, GuardianBar, SyncBar, Breadcrumb, SrcBadge, useToast } from "@/components/ui/shared";
import { ModalAddFeature, ModalNewSprint, ModalFeatureDetail } from "@/components/ui/project-modals";

const COL_HEADERS = ["Todo", "In Progress", "In Review", "Done"];
type KanbanCard = { id: string; title: string; src: "jira"|"native"; priority?: "high"|"medium"|"low"|"blocked"; pts?: number; assignee?: string; assigneeBg?: string; assigneeColor?: string; blocked?: boolean; opacity?: number; };
const KANBAN_DATA: KanbanCard[][] = [
  [
    { id: "c1", title: "Password reset flow", src: "native", priority: "high", pts: 3, assignee: "AS", assigneeBg: C.blueBg, assigneeColor: C.blueText },
    { id: "c2", title: "CP-247 Email verification endpoint", src: "jira", priority: "medium", assignee: "CF", assigneeBg: C.greenBg, assigneeColor: C.greenText },
    { id: "c3", title: "CP-251 Session timeout config", src: "jira", priority: "low" },
  ],
  [
    { id: "c4", title: "OAuth login integration (CP-244)", src: "jira", priority: "blocked", pts: 8, assignee: "AS", assigneeBg: C.blueBg, assigneeColor: C.blueText, blocked: true },
    { id: "c5", title: "User profile API GET/PATCH", src: "native", priority: "high", assignee: "CF", assigneeBg: C.tealBg, assigneeColor: C.tealText },
  ],
  [
    { id: "c6", title: "CP-238 Auth middleware setup", src: "jira", pts: 5, assignee: "AS", assigneeBg: C.blueBg, assigneeColor: C.blueText },
  ],
  [
    { id: "c7", title: "Database schema — users table", src: "native", opacity: 0.55 },
    { id: "c8", title: "CP-231 API health check", src: "jira", opacity: 0.55 },
    { id: "c9", title: "Docker config + CI pipeline", src: "native", opacity: 0.55 },
  ],
];

const PRIORITY_TAG: Record<string, { v: "r"|"a"|"g"|"n"; label: string }> = {
  high: { v: "a", label: "High" }, medium: { v: "g", label: "Med" },
  low: { v: "n", label: "Low" }, blocked: { v: "r", label: "Blocked" },
};

export default function ProjectBoardClient({ projectId }: { projectId: string }) {
  const [showAddFeature, setShowAddFeature] = useState(false);
  const [showNewSprint, setShowNewSprint] = useState(false);
  const [showFeatureDetail, setShowFeatureDetail] = useState(false);
  const { show: toast, ToastContainer } = useToast();

  return (
    <div style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <div style={{ padding: "24px 28px 0" }}>
        <Breadcrumb items={[{ label: "Customer Portal v2", onClick: () => window.history.back() }, { label: "Board" }]} />
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16, gap: 14, flexWrap: "wrap" }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: C.text, letterSpacing: "-.4px", margin: 0, marginBottom: 4 }}>Board — Sprint 3</h1>
            <p style={{ fontSize: 11, color: C.text2, margin: 0 }}>Apr 1–30 · 18/22 pts · 4 days left</p>
          </div>
          <div style={{ display: "flex", gap: 7, alignItems: "center", flexWrap: "wrap" }}>
            <Link href={`/projects/${projectId}`} style={{ ...BTN("sm"), textDecoration: "none" }}>← Overview</Link>
            <button style={BTN("sm")} onClick={() => setShowAddFeature(true)}>+ Feature</button>
            <button style={BTN("sm")}>Filter</button>
            <button style={BTN("primary", { fontSize: 10, padding: "4px 9px" })} onClick={() => setShowNewSprint(true)}>New sprint</button>
          </div>
        </div>

        <SyncBar text="Jira synced — 8 issues · last sync 4 min ago · status changes reflect in both directions" action="Sync settings ↗" onAction={() => toast("Opening sync settings…","ok")} />
      </div>

      {/* ── Kanban ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, padding: "0 14px 14px" }}>
        {COL_HEADERS.map((colName, colIdx) => (
          <div key={colName} style={{ background: C.surface2, borderRadius: 12, padding: 10 }}>
            <div style={{ fontSize: 9, fontWeight: 800, color: C.text2, letterSpacing: ".07em", textTransform: "uppercase", marginBottom: 9, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              {colName}
              <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 8, background: C.surface, color: C.text3, fontWeight: 700 }}>{KANBAN_DATA[colIdx].length}</span>
            </div>

            {KANBAN_DATA[colIdx].map(card => (
              <div key={card.id}
                onClick={() => !card.opacity && setShowFeatureDetail(true)}
                style={{
                  background: card.blocked ? C.redBg : C.surface,
                  border: `1px solid ${card.blocked ? C.redBorder : C.border}`,
                  borderRadius: 8, padding: 10, marginBottom: 7,
                  cursor: card.opacity ? "default" : "pointer",
                  transition: ".12s", opacity: card.opacity ?? 1,
                }}
              >
                {card.blocked && (
                  <div style={{ fontSize: 9, fontWeight: 800, color: C.redText, marginBottom: 5, display: "flex", alignItems: "center", gap: 4 }}>
                    ⚠ BLOCKED — auth dep
                  </div>
                )}
                <div style={{ fontSize: 11, fontWeight: 600, color: C.text, marginBottom: 6, lineHeight: 1.35 }}>{card.title}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap" }}>
                  <SrcBadge type={card.src} />
                  {card.priority && PRIORITY_TAG[card.priority] && (
                    <Tag v={PRIORITY_TAG[card.priority].v} style={{ fontSize: 9 }}>{PRIORITY_TAG[card.priority].label}</Tag>
                  )}
                  {card.pts && <span style={{ fontSize: 9, color: C.text3, marginLeft: "auto" }}>{card.pts}pts</span>}
                </div>
                {card.assignee && (
                  <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 6, paddingTop: 6, borderTop: `1px solid ${C.border}` }}>
                    <div style={{ width: 20, height: 20, borderRadius: "50%", fontSize: 8, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, background: card.assigneeBg, color: card.assigneeColor }}>{card.assignee}</div>
                  </div>
                )}
              </div>
            ))}

            <button
              onClick={() => setShowAddFeature(true)}
              style={{ ...BTN("sm"), width: "100%", justifyContent: "center", marginTop: 5 }}
            >
              + Add task
            </button>
          </div>
        ))}
      </div>

      {/* ── Guardian bar ── */}
      <div style={{ ...CARD, margin: "0 14px 14px" }}>
        <GuardianBar text="sprint at risk: 6 tasks, 4 days, OAuth is critical path · suggests re-prioritising the todo queue" action="Re-prioritise ↗" onAction={() => toast("Re-prioritisation applied","ok")} />
      </div>

      {/* ── Modals ── */}
      <ModalAddFeature   open={showAddFeature}    onClose={() => { setShowAddFeature(false);    toast("Feature added","ok"); }} />
      <ModalNewSprint    open={showNewSprint}      onClose={() => { setShowNewSprint(false);      toast("Sprint 4 created","ok"); }} />
      <ModalFeatureDetail open={showFeatureDetail} onClose={() => { setShowFeatureDetail(false);  toast("Feature updated","ok"); }} />
      <ToastContainer />
    </div>
  );
}
