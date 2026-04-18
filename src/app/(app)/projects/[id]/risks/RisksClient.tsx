"use client";
import { useState } from "react";
import Link from "next/link";
import { C, CARD, CARD_H, CARD_T, CARD_S, BTN, Tag, GuardianBar, RiskScore, ChipGroup, useToast } from "@/components/ui/shared";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { ModalAddRisk, ModalAiMitigation, ModalEscalate } from "@/components/ui/project-modals";
import { ProjectChat, ChatButton } from "@/components/ui/project-chat";

interface RiskData {
  id: string; title: string; description: string;
  probability: number; impact: number; score: number;
  status: string; owner: string; category: string;
  mitigation: string; createdAt: string;
}
interface Props {
  projectId: string;
  projectName: string;
  risks: RiskData[];
}

const STATUS_TAG: Record<string, { v: "r"|"a"|"g"|"n"; label: string }> = {
  OPEN:       { v: "r", label: "Open"      },
  MITIGATED:  { v: "g", label: "Mitigated" },
  CLOSED:     { v: "n", label: "Closed"    },
  MONITORING: { v: "a", label: "Monitoring"},
};

export default function ProjectRisksClient({ projectId, projectName, risks }: Props) {
  const [filter, setFilter]             = useState("All");
  const [showAddRisk, setShowAddRisk]   = useState(false);
  const [showAiMitigation, setShowAiMitigation] = useState(false);
  const [showEscalate, setShowEscalate] = useState(false);
  const [chatOpen, setChatOpen]         = useState(false);
  const { show: toast, ToastContainer } = useToast();

  const openCount = risks.filter(r => r.status === "OPEN").length;
  const maxScore  = risks.reduce((m, r) => Math.max(m, r.score), 0);

  const filtered = (() => {
    switch (filter) {
      case "Critical": return risks.filter(r => r.score >= 15);
      case "High":     return risks.filter(r => r.score >= 9 && r.score < 15);
      case "Open":     return risks.filter(r => r.status === "OPEN");
      default:         return risks;
    }
  })();

  return (
    <div style={{ padding: "24px 28px", fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <Breadcrumb items={[{ label: "Portfolio", href: "/portfolio" }, { label: projectName, href: `/projects/${projectId}` }, { label: "Risks" }]} />

      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16, gap: 14, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: C.text, letterSpacing: "-.4px", margin: 0, marginBottom: 4 }}>Risk Register</h1>
          <p style={{ fontSize: 11, color: C.text2, margin: 0 }}>
            {openCount} open · {risks.length} total · sorted by severity (P × I)
          </p>
        </div>
        <div style={{ display: "flex", gap: 7, alignItems: "center", flexWrap: "wrap" }}>
          <Link href={`/projects/${projectId}`} style={{ ...BTN("sm"), textDecoration: "none" }}>← Overview</Link>
          <ChatButton onClick={() => setChatOpen(true)} />
          <button style={BTN("primary", { fontSize: 10, padding: "4px 9px" })} onClick={() => setShowAddRisk(true)}>+ Add risk</button>
        </div>
      </div>

      <ChipGroup chips={["All", "Critical", "High", "Open"]} active={filter} onChange={setFilter} />

      <div style={CARD}>
        <div style={CARD_H}>
          <span style={CARD_T}>Risk register</span>
          <span style={CARD_S}>probability × impact · scale 1–5 · max 25</span>
        </div>

        {filtered.length === 0 ? (
          <div style={{ padding: "32px", textAlign: "center", fontSize: 12, color: C.text3 }}>
            No risks in this filter
          </div>
        ) : filtered.map(risk => {
          const isCritical = risk.score >= 15;
          const isOpen     = risk.status === "OPEN";
          const tagInfo    = STATUS_TAG[risk.status] ?? STATUS_TAG.OPEN;
          return (
            <div key={risk.id} style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "10px 14px", borderBottom: `1px solid ${C.border}`,
              background: isCritical && isOpen ? "rgba(220,38,38,.04)" : undefined,
              opacity: risk.status === "CLOSED" ? .6 : 1,
            }}>
              <RiskScore score={risk.score} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: C.text }}>{risk.title}</div>
                <div style={{ fontSize: 10, color: C.text3, marginTop: 2 }}>
                  {risk.owner !== "—" ? `Owner: ${risk.owner} · ` : ""}
                  {risk.category} · P:{risk.probability} × I:{risk.impact}
                  {risk.mitigation && ` · ${risk.mitigation.slice(0, 60)}…`}
                </div>
              </div>
              <Tag v={tagInfo.v}>{tagInfo.label}</Tag>
              {risk.score >= 10 && isOpen && (
                <button style={BTN("danger", { fontSize: 10, padding: "3px 8px" })} onClick={() => setShowAiMitigation(true)}>AI fix</button>
              )}
              <button style={BTN("sm")} onClick={() => toast("Risk updated", "ok")}>
                {risk.status !== "OPEN" ? "Reopen" : "Edit"}
              </button>
            </div>
          );
        })}

        {maxScore >= 15 && (
          <GuardianBar text={`Risk score ${maxScore} exceeds critical threshold · AI mitigation available · monitor escalation`} />
        )}
        {maxScore < 15 && risks.length > 0 && (
          <GuardianBar text={`${openCount} open risks · highest score ${maxScore} · within acceptable range`} />
        )}
      </div>

      <ModalAddRisk      open={showAddRisk}      onClose={() => { setShowAddRisk(false);      toast("Risk added", "ok");      }} />
      <ModalAiMitigation open={showAiMitigation} onClose={() => setShowAiMitigation(false)} onEscalate={() => setShowEscalate(true)} />
      <ModalEscalate     open={showEscalate}     onClose={() => { setShowEscalate(false);     toast("Escalation sent", "ok"); }} />
      <ToastContainer />
      <ProjectChat open={chatOpen} onClose={() => setChatOpen(false)} projectId={projectId} projectName={projectName} teamMembers={[]} />
    </div>
  );
}
