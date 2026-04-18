"use client";
import { useState } from "react";
import Link from "next/link";
import { C, CARD, CARD_H, CARD_T, CARD_S, G2, BTN, Tag, Dot, GuardianBar, Row, Breadcrumb, useToast } from "@/components/ui/shared";
import { ModalSnapshot, ModalScopeChange, ModalEscalate, ModalRaci } from "@/components/ui/project-modals";

export default function ProjectGovernanceClient({ projectId }: { projectId: string }) {
  const [showSnapshot, setShowSnapshot] = useState(false);
  const [showScopeChange, setShowScopeChange] = useState(false);
  const [showEscalate, setShowEscalate] = useState(false);
  const [showRaci, setShowRaci] = useState(false);
  const { show: toast, ToastContainer } = useToast();

  return (
    <div style={{ padding: "24px 28px", fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <Breadcrumb items={[{ label: "Customer Portal v2", onClick: () => window.history.back() }, { label: "Governance" }]} />

      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20, gap: 14, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: C.text, letterSpacing: "-.4px", margin: 0, marginBottom: 4 }}>Governance & Audit</h1>
          <p style={{ fontSize: 11, color: C.text2, margin: 0 }}>Dependencies · snapshots · scope log · audit trail · RACI</p>
        </div>
        <div style={{ display: "flex", gap: 7, alignItems: "center" }}>
          <Link href={`/projects/${projectId}`} style={{ ...BTN("sm"), textDecoration: "none" }}>← Overview</Link>
          <button style={BTN("primary", { fontSize: 10, padding: "4px 9px" })} onClick={() => setShowSnapshot(true)}>📸 Snapshot</button>
        </div>
      </div>

      <div style={G2}>
        {/* Left */}
        <div>
          {/* Dependencies */}
          <div style={CARD}>
            <div style={CARD_H}><span style={CARD_T}>Project dependencies</span><button style={BTN("sm")} onClick={() => toast("Add dependency","ok")}>+ Add</button></div>
            <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "9px 14px", borderBottom: `1px solid ${C.border}`, background: "rgba(220,38,38,.04)" }}>
              <Dot c="r" />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 500, color: C.text }}>ERP Migration (blocked by)</div>
                <div style={{ fontSize: 10, color: C.text3 }}>auth module · blocked for 8 days</div>
              </div>
              <Tag v="r">Critical</Tag>
              <button style={BTN("danger", { fontSize: 10, padding: "3px 8px" })} onClick={() => setShowEscalate(true)}>Escalate</button>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "9px 14px" }}>
              <Dot c="g" />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 500, color: C.text }}>Mobile App iOS (independent)</div>
              </div>
              <Tag v="g">OK</Tag>
            </div>
            <GuardianBar text="critical path: ERP auth → Portal OAuth → Portal launch" />
          </div>

          {/* Scope log */}
          <div style={CARD}>
            <div style={CARD_H}><span style={CARD_T}>Scope change log</span><button style={BTN("sm")} onClick={() => setShowScopeChange(true)}>+ Change scope</button></div>
            {[
              { dot: C.green,  title: "OAuth SSO integration added (+12d, +€15k)", meta: "Apr 3 · Laura P. · approved by stakeholder", statusV: "g" as const, status: "Approved"  },
              { dot: C.red,    title: "Analytics dashboard moved to v2.1 (−8d)",    meta: "Apr 8 · removed by stakeholder",            statusV: "g" as const, status: "Done"      },
              { dot: C.amber,  title: "Login flow redesigned (UX 3rd party)",        meta: "Mar 30 · no schedule impact",               statusV: "g" as const, status: "Done"      },
            ].map((item, i) => (
              <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 14px", borderBottom: `1px solid ${C.border}` }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: item.dot, flexShrink: 0, marginTop: 4 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, color: C.text, fontWeight: 500, lineHeight: 1.35 }}>{item.title}</div>
                  <div style={{ fontSize: 10, color: C.text3, marginTop: 2 }}>{item.meta}</div>
                </div>
                <Tag v={item.statusV}>{item.status}</Tag>
              </div>
            ))}
          </div>

          {/* RACI */}
          <div style={CARD}>
            <div style={CARD_H}><span style={CARD_T}>RACI Matrix</span><button style={BTN("sm")} onClick={() => setShowRaci(true)}>Edit RACI</button></div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr style={{ background: C.surface2 }}>
                    {["Activity","Responsible","Accountable","Consulted","Informed"].map(h => (
                      <th key={h} style={{ padding: "8px 12px", textAlign: "left", fontSize: 9, fontWeight: 800, color: C.text3, textTransform: "uppercase", letterSpacing: ".06em", borderBottom: `1px solid ${C.border}` }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["Sprint planning","Laura P.","Laura P.","Andrea S.","Stakeholder"],
                    ["Code review","Andrea S.","Andrea S.","Team B","Laura P."],
                    ["Budget approval","Laura P.","CFO","PMO","CEO"],
                    ["Scope change","PMO","Sponsor","Laura P.","Team"],
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
        </div>

        {/* Right */}
        <div>
          {/* Snapshots */}
          <div style={CARD}>
            <div style={CARD_H}><span style={CARD_T}>Snapshots</span><span style={CARD_S}>project state version control</span></div>
            {[
              { ver: "v4", label: "Apr 12 · scope change approved",  sub: "Auto · OAuth SSO approval",   current: true  },
              { ver: "v3", label: "Apr 8 · budget change",           sub: "Auto · €365k → €380k",        current: false },
              { ver: "v2", label: "Mar 30 · OAuth scope added",      sub: "Manual",                      current: false },
              { ver: "v1", label: "Mar 1 · initial baseline",        sub: "Auto · project creation",     current: false },
            ].map((snap, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 14px", borderBottom: `1px solid ${C.border}` }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 500, color: C.text }}>{snap.label}</div>
                  <div style={{ fontSize: 10, color: C.text3, marginTop: 2 }}>{snap.sub}</div>
                </div>
                {snap.current ? <Tag v="g">Current</Tag> : <Tag v="n">{snap.ver}</Tag>}
                <button style={BTN("sm")} onClick={() => toast(snap.current ? "Already current" : `Restored to ${snap.ver}`,"ok")}>
                  {snap.current ? "View" : "Restore"}
                </button>
              </div>
            ))}
          </div>

          {/* Audit log */}
          <div style={CARD}>
            <div style={CARD_H}><span style={CARD_T}>Audit log</span><span style={CARD_S}>all changes · all actors</span></div>
            {[
              { dot: C.red,   label: "Feature BLOCKED: OAuth login (CP-244)", meta: "System · 4h ago"     },
              { dot: C.green, label: "Scope added: OAuth SSO integration",    meta: "Laura P. · Apr 3"     },
              { dot: C.amber, label: "Budget updated: €365k → €380k",        meta: "Laura P. · Apr 3"     },
              { dot: C.blue,  label: "Status: Not started → Active",          meta: "Laura P. · Apr 1"     },
              { dot: C.text3, label: "Project created with AI",               meta: "Laura P. · Mar 1"     },
            ].map((entry, i) => (
              <Row key={i}>
                <div style={{ width: 7, height: 7, borderRadius: "50%", background: entry.dot, flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 500, color: C.text }}>{entry.label}</div>
                </div>
                <div style={{ fontSize: 10, color: C.text3, whiteSpace: "nowrap" }}>{entry.meta}</div>
              </Row>
            ))}
            <div style={{ padding: "8px 14px" }}>
              <button style={BTN("sm")} onClick={() => toast("Exporting audit log…","ok")}>Download full audit log</button>
            </div>
          </div>
        </div>
      </div>

      <ModalSnapshot    open={showSnapshot}    onClose={() => { setShowSnapshot(false);    toast("Snapshot created — v5","ok"); }} />
      <ModalScopeChange open={showScopeChange} onClose={() => { setShowScopeChange(false); toast("Scope change submitted","ok"); }} />
      <ModalEscalate    open={showEscalate}    onClose={() => { setShowEscalate(false);    toast("Escalation sent","ok"); }} />
      <ModalRaci        open={showRaci}        onClose={() => { setShowRaci(false);        toast("RACI updated","ok"); }} />
      <ToastContainer />
    </div>
  );
}
