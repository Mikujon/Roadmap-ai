"use client";
import { useState } from "react";
import Link from "next/link";
import { C, CARD, CARD_H, CARD_T, CARD_S, BTN, Tag, GuardianBar, RiskScore, Breadcrumb, ChipGroup, useToast } from "@/components/ui/shared";
import { ModalAddRisk, ModalAiMitigation, ModalEscalate } from "@/components/ui/project-modals";

const RISKS = [
  { score: 20, title: "Auth dependency — ERP module unresolved",     detail: "Owner: Laura P. · dependency · P:4 × I:5 · open 8 days", status: "Open",      statusV: "r" as const, critical: true  },
  { score: 12, title: "Test coverage below 60% at launch",           detail: "Owner: Team B lead · quality · P:3 × I:4 · due: Apr 20", status: "Open",      statusV: "r" as const, critical: false },
  { score: 6,  title: "Single resource on OAuth feature",            detail: "Owner: PM · resources · P:2 × I:3",                     status: "Open",      statusV: "a" as const, critical: false },
  { score: 4,  title: "3rd party UX review may require rework",      detail: "Owner: Design lead · scope · P:2 × I:2",               status: "Mitigated",  statusV: "g" as const, critical: false },
];

export default function ProjectRisksClient({ projectId }: { projectId: string }) {
  const [filter, setFilter] = useState("All");
  const [showAddRisk, setShowAddRisk] = useState(false);
  const [showAiMitigation, setShowAiMitigation] = useState(false);
  const [showEscalate, setShowEscalate] = useState(false);
  const { show: toast, ToastContainer } = useToast();

  const filtered = filter === "All" ? RISKS
    : filter === "Critical" ? RISKS.filter(r => r.score >= 15)
    : filter === "High"     ? RISKS.filter(r => r.score >= 10 && r.score < 15)
    : filter === "Open"     ? RISKS.filter(r => r.status === "Open")
    : RISKS;

  return (
    <div style={{ padding: "24px 28px", fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <Breadcrumb items={[{ label: "Customer Portal v2", onClick: () => window.history.back() }, { label: "Risks" }]} />

      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16, gap: 14, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: C.text, letterSpacing: "-.4px", margin: 0, marginBottom: 4 }}>Risk Register</h1>
          <p style={{ fontSize: 11, color: C.text2, margin: 0 }}>5 open · sorted by severity (P × I)</p>
        </div>
        <div style={{ display: "flex", gap: 7, alignItems: "center", flexWrap: "wrap" }}>
          <Link href={`/projects/${projectId}`} style={{ ...BTN("sm"), textDecoration: "none" }}>← Overview</Link>
          <button style={BTN("primary", { fontSize: 10, padding: "4px 9px" })} onClick={() => setShowAddRisk(true)}>+ Add risk</button>
        </div>
      </div>

      <ChipGroup chips={["All","Critical","High","Open"]} active={filter} onChange={setFilter} />

      <div style={CARD}>
        <div style={CARD_H}>
          <span style={CARD_T}>Risk register</span>
          <span style={CARD_S}>probability × impact · scale 1–5 · max 25</span>
        </div>

        {filtered.map((risk, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderBottom: `1px solid ${C.border}`, background: risk.critical ? "rgba(220,38,38,.04)" : undefined, opacity: risk.status === "Mitigated" ? .65 : 1 }}>
            <RiskScore score={risk.score} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.text }}>{risk.title}</div>
              <div style={{ fontSize: 10, color: C.text3, marginTop: 2 }}>{risk.detail}</div>
            </div>
            <Tag v={risk.statusV}>{risk.status}</Tag>
            {risk.score >= 10 && risk.status === "Open" && (
              <button style={BTN("danger", { fontSize: 10, padding: "3px 8px" })} onClick={() => setShowAiMitigation(true)}>AI mitigation ↗</button>
            )}
            <button style={BTN("sm")} onClick={() => toast("Risk updated","ok")}>
              {risk.status === "Mitigated" ? "Reopen" : "Edit"}
            </button>
          </div>
        ))}

        <GuardianBar text="risk score 20 exceeds critical threshold · AI mitigation available · risk register updated automatically" />
      </div>

      <ModalAddRisk      open={showAddRisk}      onClose={() => { setShowAddRisk(false);      toast("Risk added","ok"); }} />
      <ModalAiMitigation open={showAiMitigation} onClose={() => setShowAiMitigation(false)} onEscalate={() => setShowEscalate(true)} />
      <ModalEscalate     open={showEscalate}     onClose={() => { setShowEscalate(false);     toast("Escalation sent","ok"); }} />
      <ToastContainer />
    </div>
  );
}
