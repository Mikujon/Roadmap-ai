"use client";
import { useState } from "react";
import Link from "next/link";
import { C, CARD, CARD_H, CARD_T, CARD_S, CARD_BODY, G4, G2, BTN, Tag, Dot, ProgBar, KpiCard, GuardianBar, DecItem, Row, RiskScore, MemberRow, Breadcrumb, useToast } from "@/components/ui/shared";
import { ModalAddFeature, ModalAddRisk, ModalScopeChange, ModalEscalate, ModalAiMitigation } from "@/components/ui/project-modals";

// ── This is a CLIENT component that renders project overview ──
// The server page.tsx should fetch project data and pass it as props.
// For now it renders with realistic placeholder data matching the reference UI.

export default function ProjectOverviewClient({ projectId }: { projectId: string }) {
  const [showAddFeature, setShowAddFeature] = useState(false);
  const [showAddRisk, setShowAddRisk] = useState(false);
  const [showScopeChange, setShowScopeChange] = useState(false);
  const [showEscalate, setShowEscalate] = useState(false);
  const [showAiMitigation, setShowAiMitigation] = useState(false);
  const [ddOpen, setDdOpen] = useState(false);
  const { show: toast, ToastContainer } = useToast();

  return (
    <div style={{ padding: "24px 28px", fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <Breadcrumb items={[{ label: "Portfolio", onClick: () => window.history.back() }, { label: "Customer Portal v2" }]} />

      {/* ── Page header ── */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20, gap: 14, flexWrap: "wrap" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 4 }}>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: C.text, letterSpacing: "-.4px", margin: 0 }}>Customer Portal v2</h1>
            <Tag v="a">At risk</Tag>
            <span style={{ fontSize: 11, color: C.text3, fontFamily: "'DM Mono', monospace" }}>score: <strong style={{ color: C.amberText }}>62</strong></span>
          </div>
          <p style={{ fontSize: 11, color: C.text2, margin: 0 }}>Apr 1 – Jul 31 2026 · Budget €380k · Lead: Laura P. · Sprint 3 active</p>
        </div>
        <div style={{ display: "flex", gap: 7, alignItems: "center", flexWrap: "wrap" }}>
          <Link href={`/projects/${projectId}/board`} style={{ ...BTN(), textDecoration: "none" }}>Board</Link>
          <Link href={`/projects/${projectId}/risks`} style={{ ...BTN(), textDecoration: "none" }}>Risks</Link>
          <Link href={`/projects/${projectId}/financials`} style={{ ...BTN(), textDecoration: "none" }}>Financials</Link>
          <Link href={`/projects/${projectId}/governance`} style={{ ...BTN(), textDecoration: "none" }}>Governance</Link>
          <button style={BTN("primary")}>Edit project</button>
          <div style={{ position: "relative" }}>
            <button style={BTN("default")} onClick={() => setDdOpen(o => !o)}>⋯</button>
            {ddOpen && (
              <>
                <div style={{ position: "fixed", inset: 0, zIndex: 49 }} onClick={() => setDdOpen(false)} />
                <div style={{ position: "absolute", top: "calc(100% + 5px)", right: 0, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, boxShadow: "0 4px 16px rgba(0,0,0,.08)", padding: 5, minWidth: 160, zIndex: 50 }}>
                  {[["+ Scope change", () => { setDdOpen(false); setShowScopeChange(true); }],["Snapshot", () => { setDdOpen(false); toast("Snapshot created","ok"); }],["Closure report", () => { setDdOpen(false); }]].map(([label, fn]) => (
                    <button key={label as string} onClick={fn as any} style={{ display: "flex", alignItems: "center", padding: "7px 10px", fontSize: 12, color: C.text2, cursor: "pointer", borderRadius: 7, border: "none", background: "none", width: "100%", textAlign: "left", fontFamily: "inherit" }}>{label}</button>
                  ))}
                  <div style={{ height: 1, background: C.border, margin: "4px 0" }} />
                  <button onClick={() => setDdOpen(false)} style={{ display: "flex", alignItems: "center", padding: "7px 10px", fontSize: 12, color: C.redText, cursor: "pointer", borderRadius: 7, border: "none", background: "none", width: "100%", textAlign: "left", fontFamily: "inherit" }}>Archive project</button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── KPI strip ── */}
      <div style={G4}>
        <KpiCard label="Progress" value="64%" sub="sprint 3 · 18/22 pts" variant="ok" />
        <KpiCard label="Budget spent" value="€180k" sub="of €380k BAC" variant="warn" />
        <KpiCard label="CPI" value="1.02" sub="cost on track" variant="ok" />
        <KpiCard label="SPI" value="0.91" sub="slight schedule delay" variant="warn" />
      </div>

      {/* ── Two-column main ── */}
      <div style={G2}>
        {/* Left */}
        <div>
          {/* Timeline */}
          <div style={CARD}>
            <div style={CARD_H}><span style={CARD_T}>Phases / Timeline</span><span style={CARD_S}>3 phases · 1 active</span></div>
            <div style={{ padding: "10px 14px", display: "flex", flexDirection: "column", gap: 7 }}>
              {[
                { name: "Planning",    pct: 100, color: C.green,  date: "Mar 1–14",  done: true  },
                { name: "Design",      pct: 100, color: C.green,  date: "Mar 15–28", done: true  },
                { name: "Development", pct: 58,  color: C.blue,   date: "Apr 1–30",  done: false },
                { name: "QA + Launch", pct: 0,   color: C.text3,  date: "May 1–12",  done: false },
              ].map(ph => (
                <div key={ph.name} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ fontSize: 11, color: C.text2, width: 100, flexShrink: 0 }}>{ph.name}</div>
                  <div style={{ flex: 1, height: 18, background: C.surface2, borderRadius: 4, overflow: "hidden" }}>
                    {ph.pct > 0 && (
                      <div style={{ width: `${ph.pct}%`, height: "100%", background: ph.color, display: "flex", alignItems: "center", paddingLeft: 7, fontSize: 9, color: "#fff", fontWeight: 700, borderRadius: 4 }}>
                        {ph.done ? "Done" : `${ph.pct}%`}
                      </div>
                    )}
                  </div>
                  <div style={{ fontSize: 10, color: C.text3, width: 60, textAlign: "right", flexShrink: 0 }}>{ph.date}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Sprint */}
          <div style={CARD}>
            <div style={CARD_H}><span style={CARD_T}>Sprint 3 — active</span><span style={CARD_S}>Apr 1–30 · 18/22 pts · 4 days left</span></div>
            <Row highlight="r">
              <Dot c="r" /><div style={{ flex: 1, fontSize: 12, fontWeight: 500 }}>OAuth login (CP-244)</div>
              <Tag v="r">Blocked</Tag><span style={{ fontSize: 9, fontWeight: 700, padding: "1px 5px", borderRadius: 4, background: C.blueBg, color: C.blueText }}>Jira</span>
            </Row>
            <Row>
              <Dot c="b" /><div style={{ flex: 1, fontSize: 12, fontWeight: 500 }}>User profile API GET/PATCH</div>
              <Tag v="b">In progress</Tag><span style={{ fontSize: 9, fontWeight: 700, padding: "1px 5px", borderRadius: 4, background: C.purpleBg, color: C.purpleText }}>Native</span>
            </Row>
            <Row>
              <Dot c="gr" /><div style={{ flex: 1, fontSize: 12, fontWeight: 500 }}>Password reset flow</div>
              <Tag v="n">Todo</Tag>
            </Row>
            <Row>
              <Dot c="g" /><div style={{ flex: 1, fontSize: 12, fontWeight: 500 }}>DB schema — users table</div>
              <Tag v="g">Done</Tag>
            </Row>
            <div style={{ padding: "10px 14px", display: "flex", gap: 7 }}>
              <Link href={`/projects/${projectId}/board`} style={{ ...BTN("primary", { fontSize: 10, padding: "4px 9px" }), textDecoration: "none" }}>Open board ↗</Link>
              <button style={BTN("sm")} onClick={() => setShowAddFeature(true)}>+ Feature</button>
            </div>
            <GuardianBar text="sprint at risk: 6 tasks, 4 days, OAuth is critical path · suggests re-prioritisation" action="Re-prioritise" onAction={() => toast("Re-prioritisation applied","ok")} />
          </div>
        </div>

        {/* Right */}
        <div>
          {/* Top risks */}
          <div style={CARD}>
            <div style={CARD_H}><span style={CARD_T}>Top risks</span><Link href={`/projects/${projectId}/risks`} style={{ ...BTN("sm"), textDecoration: "none" }}>All →</Link></div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderBottom: `1px solid ${C.border}`, background: "rgba(220,38,38,.04)" }}>
              <RiskScore score={20} />
              <div style={{ flex: 1 }}><div style={{ fontSize: 12, fontWeight: 600 }}>Auth dep (ERP) unresolved</div><div style={{ fontSize: 10, color: C.text3 }}>P:4 × I:5 · Laura P.</div></div>
              <Tag v="r">Critical</Tag>
              <button style={BTN("danger", { fontSize: 10, padding: "3px 8px" })} onClick={() => setShowAiMitigation(true)}>AI fix</button>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px" }}>
              <RiskScore score={12} />
              <div style={{ flex: 1 }}><div style={{ fontSize: 12, fontWeight: 600 }}>Test coverage below 60%</div><div style={{ fontSize: 10, color: C.text3 }}>P:3 × I:4 · Team B lead</div></div>
              <Tag v="a">High</Tag>
            </div>
          </div>

          {/* Team */}
          <div style={CARD}>
            <div style={CARD_H}><span style={CARD_T}>Assigned team</span><button style={BTN("sm")} onClick={() => toast("Team management opened","ok")}>Manage</button></div>
            <MemberRow initials="LP" avatarBg="#111" avatarColor="#fff" name="Laura Pinto" sub="PM · 8h/week allocated"><Tag v="p">PM</Tag></MemberRow>
            <MemberRow initials="AS" avatarBg={C.blueBg} avatarColor={C.blueText} name="Andrea Sanna" sub="Dev Lead · 40h/week"><Tag v="b">Dev</Tag></MemberRow>
            <MemberRow initials="CF" avatarBg={C.tealBg} avatarColor={C.tealText} name="Chiara Ferraro" sub="Designer · 20h/week"><Tag v="t">Design</Tag></MemberRow>
          </div>

          {/* AI governance insights */}
          <div style={CARD}>
            <div style={CARD_H}><span style={CARD_T}>AI Governance insights</span></div>
            <DecItem priority="watch" text="SPI 0.91 — if delay persists beyond May 1, EAC will exceed BAC." />
            <DecItem priority="urgent" text="ERP dependency unresolved for 8 days — escalation recommended."
              actions={<button style={BTN("danger", { fontSize: 10, padding: "3px 8px" })} onClick={() => setShowEscalate(true)}>Escalate</button>}
            />
          </div>
        </div>
      </div>

      {/* ── Modals ── */}
      <ModalAddFeature open={showAddFeature} onClose={() => { setShowAddFeature(false); toast("Feature added","ok"); }} />
      <ModalAddRisk    open={showAddRisk}    onClose={() => { setShowAddRisk(false);    toast("Risk added","ok"); }} />
      <ModalScopeChange open={showScopeChange} onClose={() => { setShowScopeChange(false); toast("Scope change submitted","ok"); }} />
      <ModalEscalate   open={showEscalate}   onClose={() => { setShowEscalate(false);   toast("Escalation sent","ok"); }} />
      <ModalAiMitigation open={showAiMitigation} onClose={() => setShowAiMitigation(false)} onEscalate={() => setShowEscalate(true)} />
      <ToastContainer />
    </div>
  );
}
