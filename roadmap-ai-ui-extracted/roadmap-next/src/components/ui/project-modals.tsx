"use client";
import { useState } from "react";
import { Modal, C, FG, FL, FI, FHINT, FROW, FROW3, BTN, Tag, GuardianBar, DecItem } from "./shared";

// ─────────────────────────────────────────────
// ALL PROJECT MODALS
// src/components/ui/project-modals.tsx
// ─────────────────────────────────────────────

// ── Add Feature/Task ──
export function ModalAddFeature({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal id="modal-add-feature" title="Add feature / task" open={open} onClose={onClose}
      footer={<><button style={BTN("default")} onClick={onClose}>Cancel</button><button style={BTN("primary")} onClick={onClose}>Save feature</button></>}>
      <div style={FG}><label style={FL}>Title <span style={{ color: C.red }}>*</span></label><input style={FI} type="text" placeholder="Brief task description" /></div>
      <div style={FROW}>
        <div style={FG}><label style={FL}>Sprint</label><select style={FI}><option>Sprint 3 (active)</option><option>Sprint 4</option><option>Backlog</option></select></div>
        <div style={FG}><label style={FL}>Priority</label><select style={FI}><option>High</option><option>Medium</option><option>Low</option><option>Critical</option></select></div>
      </div>
      <div style={FG}><label style={FL}>Assign to</label><select style={FI}><option>-- Nobody --</option><option>Laura Pinto</option><option>Andrea Sanna</option><option>Chiara Ferraro</option></select></div>
      <div style={FROW}>
        <div style={FG}><label style={FL}>Story points</label><input style={FI} type="number" defaultValue={3} min={1} max={13} /></div>
        <div style={FG}><label style={FL}>Due date</label><input style={FI} type="date" /></div>
      </div>
      <div style={FG}><label style={FL}>Description</label><textarea style={{ ...FI, minHeight: 70, resize: "vertical" }} placeholder="Additional details..." /></div>
      <div style={{ ...FG, marginBottom: 0 }}><label style={FL}>Jira link (optional)</label><input style={FI} type="text" placeholder="CP-XXX or issue URL" /></div>
    </Modal>
  );
}

// ── Add Risk ──
export function ModalAddRisk({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [p, setP] = useState(3);
  const [i, setI] = useState(4);
  const score = p * i;
  const scoreVariant = score >= 15 ? C.redText : score >= 10 ? C.amberText : score >= 5 ? C.blueText : C.greenText;
  const scoreBg = score >= 15 ? C.redBg : score >= 10 ? C.amberBg : score >= 5 ? C.blueBg : C.greenBg;
  const scoreBorder = score >= 15 ? C.redBorder : score >= 10 ? C.amberBorder : score >= 5 ? C.blueBorder : C.greenBorder;
  const scoreLabel = score >= 15 ? "CRITICAL" : score >= 10 ? "HIGH" : score >= 5 ? "MEDIUM" : "LOW";
  return (
    <Modal id="modal-add-risk" title="Add risk" open={open} onClose={onClose}
      footer={<><button style={BTN("default")} onClick={onClose}>Cancel</button><button style={BTN("primary")} onClick={onClose}>Add risk</button></>}>
      <div style={FG}><label style={FL}>Risk description <span style={{ color: C.red }}>*</span></label><input style={FI} type="text" placeholder="Describe the identified risk" /></div>
      <div style={FROW}>
        <div style={FG}><label style={FL}>Probability (1–5)</label>
          <select style={FI} value={p} onChange={e => setP(Number(e.target.value))}>
            {["1 — Unlikely","2 — Possible","3 — Likely","4 — Very likely","5 — Almost certain"].map((o,idx) => <option key={idx} value={idx+1}>{o}</option>)}
          </select>
        </div>
        <div style={FG}><label style={FL}>Impact (1–5)</label>
          <select style={FI} value={i} onChange={e => setI(Number(e.target.value))}>
            {["1 — Minimal","2 — Minor","3 — Moderate","4 — Significant","5 — Catastrophic"].map((o,idx) => <option key={idx} value={idx+1}>{o}</option>)}
          </select>
        </div>
      </div>
      <div style={{ padding: "10px", background: scoreBg, border: `1px solid ${scoreBorder}`, borderRadius: 8, margin: "0 0 14px", fontSize: 12, fontWeight: 600, color: scoreVariant, textAlign: "center" }}>
        Score P×I = <span style={{ fontSize: 16, fontFamily: "'DM Mono', monospace" }}>{score}</span> — {scoreLabel}
      </div>
      <div style={FG}><label style={FL}>Category</label><select style={FI}><option>Technical</option><option>Resources</option><option>Dependency</option><option>Quality</option><option>Scope</option><option>Financial</option></select></div>
      <div style={FG}><label style={FL}>Owner</label><select style={FI}><option>Laura Pinto (PM)</option><option>Andrea Sanna (Dev Lead)</option><option>Chiara Ferraro (Designer)</option></select></div>
      <div style={FG}><label style={FL}>Mitigation plan</label><textarea style={{ ...FI, minHeight: 70, resize: "vertical" }} placeholder="Describe planned mitigation actions..." /></div>
      <div style={{ ...FG, marginBottom: 0 }}><label style={FL}>Review date</label><input style={FI} type="date" /></div>
    </Modal>
  );
}

// ── Scope Change ──
export function ModalScopeChange({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal id="modal-scope-change" title="Scope change request" open={open} onClose={onClose}
      footer={<><button style={BTN("default")} onClick={onClose}>Cancel</button><button style={BTN("primary")} onClick={onClose}>Submit for approval</button></>}>
      <div style={FG}><label style={FL}>Change title <span style={{ color: C.red }}>*</span></label><input style={FI} type="text" placeholder="Brief description of the change" /></div>
      <div style={FG}><label style={FL}>Change type</label><select style={FI}><option>Scope addition</option><option>Scope removal</option><option>Requirement change</option><option>Technology change</option></select></div>
      <div style={FG}><label style={FL}>Justification <span style={{ color: C.red }}>*</span></label><textarea style={{ ...FI, minHeight: 70, resize: "vertical" }} placeholder="Why is this change needed?" /></div>
      <div style={FROW}>
        <div style={FG}><label style={FL}>Schedule impact (days)</label><input style={FI} type="number" placeholder="+/- days" /></div>
        <div style={FG}><label style={FL}>Budget impact (€)</label><input style={FI} type="text" placeholder="+/- €" /></div>
      </div>
      <div style={FG}><label style={FL}>Requested by</label><select style={FI}><option>Stakeholder</option><option>PMO</option><option>Tech Lead</option><option>Client</option></select></div>
      <div style={{ ...FG, marginBottom: 0 }}><label style={FL}>Approval routing</label><select style={FI}><option>PMO (standard)</option><option>PMO + CEO (&gt;€20k)</option><option>Stakeholder sponsor</option></select></div>
    </Modal>
  );
}

// ── Budget Update ──
export function ModalBudgetUpdate({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal id="modal-budget-update" title="Budget update" open={open} onClose={onClose}
      footer={<><button style={BTN("default")} onClick={onClose}>Cancel</button><button style={BTN("primary")} onClick={onClose}>Submit for approval</button></>}>
      <div style={{ background: C.surface2, borderRadius: 8, padding: 12, marginBottom: 14, fontSize: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: C.text2 }}>Current budget (BAC):</span><strong style={{ fontFamily: "'DM Mono', monospace" }}>€380,000</strong></div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}><span style={{ color: C.text2 }}>Spent to date (ACWP):</span><strong style={{ fontFamily: "'DM Mono', monospace" }}>€180,000</strong></div>
      </div>
      <div style={FG}><label style={FL}>New budget (BAC) <span style={{ color: C.red }}>*</span></label><input style={FI} type="text" placeholder="€" defaultValue="€380,000" /></div>
      <div style={FG}><label style={FL}>Justification <span style={{ color: C.red }}>*</span></label><textarea style={{ ...FI, minHeight: 70, resize: "vertical" }} placeholder="Reason for budget change..." /></div>
      <div style={FG}><label style={FL}>Approval level</label><select style={FI}><option>PMO (up to +10%)</option><option>CFO (+10% to +25%)</option><option>CEO + Board (&gt;+25%)</option></select></div>
      <div style={{ ...FG, marginBottom: 0 }}><label style={FL}>Supporting document</label><input style={FI} type="file" /></div>
    </Modal>
  );
}

// ── Invite Member ──
export function ModalInvite({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal id="modal-invite" title="Invite team member" open={open} onClose={onClose}
      footer={<><button style={BTN("default")} onClick={onClose}>Cancel</button><button style={BTN("primary")} onClick={onClose}>Send invitation</button></>}>
      <div style={FG}><label style={FL}>Email <span style={{ color: C.red }}>*</span></label><input style={FI} type="email" placeholder="name@company.com" /></div>
      <div style={FG}><label style={FL}>Role</label><select style={FI}><option>Admin</option><option>Manager</option><option>Viewer</option></select></div>
      <div style={FG}><label style={FL}>Message (optional)</label><textarea style={{ ...FI, minHeight: 55, resize: "vertical" }} placeholder="Personal message in the invite email..." /></div>
      <div style={{ ...FG, marginBottom: 0 }}><label style={FL}>Invitation expires</label><select style={FI}><option>7 days</option><option>14 days</option><option>30 days</option></select></div>
    </Modal>
  );
}

// ── AI Mitigation ──
export function ModalAiMitigation({ open, onClose, onEscalate }: { open: boolean; onClose: () => void; onEscalate: () => void }) {
  return (
    <Modal id="modal-ai-mitigation" title="🤖 AI Mitigation — Auth Dependency Risk" open={open} onClose={onClose} wide
      footer={<><button style={BTN("default")} onClick={onClose}>Close</button><button style={BTN("warn")} onClick={() => { onClose(); onEscalate(); }}>Escalate CTO</button><button style={BTN("primary")} onClick={onClose}>Apply AI plan</button></>}>
      <div style={{ background: C.guardianLight, border: `1px solid ${C.guardianBorder}`, borderRadius: 8, padding: 14, marginBottom: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: C.guardian, marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: C.guardian, display: "inline-block" }} />Guardian AI — Analysis complete
        </div>
        <div style={{ fontSize: 12, color: C.text, lineHeight: 1.6 }}>Auth dependency from ERP (score 20) is the main blocker for Customer Portal v2. Without resolution by Apr 16, launch slips to <strong>August 2026</strong> with an estimated budget impact of <strong>+€34k</strong>.</div>
      </div>
      <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 10 }}>AI-recommended mitigation actions:</div>
      {[
        { title: "1. Immediate escalation to CTO", tag: "Urgent" as const, tagV: "r" as const, desc: "Involve the CTO to unblock the ERP team. Alignment meeting within 24h. Estimated resolution: 3–5 days." },
        { title: "2. Implement temporary mock OAuth", tag: "Recommended" as const, tagV: "a" as const, desc: "Build a mock OAuth layer to continue development. Cost: 2 dev days. Unblocks 3 other dependent tasks." },
        { title: "3. Re-prioritise sprint with non-blocked tasks", tag: "Optimization" as const, tagV: "b" as const, desc: "3 backlog tasks don't depend on OAuth. Re-assign them to Sprint 3 to maximize velocity." },
      ].map((action, i) => (
        <div key={i} style={{ background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 8, padding: 12, marginBottom: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
            <div style={{ fontSize: 12, fontWeight: 700 }}>{action.title}</div>
            <Tag v={action.tagV as any}>{action.tag}</Tag>
          </div>
          <div style={{ fontSize: 11, color: C.text2 }}>{action.desc}</div>
        </div>
      ))}
    </Modal>
  );
}

// ── Snapshot ──
export function ModalSnapshot({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal id="modal-snapshot" title="📸 Create snapshot" open={open} onClose={onClose}
      footer={<><button style={BTN("default")} onClick={onClose}>Cancel</button><button style={BTN("primary")} onClick={onClose}>Create snapshot</button></>}>
      <div style={FG}><label style={FL}>Snapshot label</label><input style={FI} type="text" placeholder="e.g. Pre-scope change · Apr 12" /></div>
      <div style={FG}><label style={FL}>Type</label><select style={FI}><option>Manual</option><option>Pre-scope change</option><option>Pre-budget change</option><option>End of sprint</option></select></div>
      <div style={FG}><label style={FL}>Notes</label><textarea style={{ ...FI, minHeight: 55, resize: "vertical" }} placeholder="Reason for snapshot..." /></div>
      <div style={{ background: C.surface2, borderRadius: 8, padding: 12, fontSize: 11, color: C.text2, marginBottom: 0 }}>
        Snapshot saves: all feature statuses, current EVM, team, budget, risks and dependencies.
      </div>
    </Modal>
  );
}

// ── Escalate ──
export function ModalEscalate({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal id="modal-escalate" title="🚨 Escalation" open={open} onClose={onClose}
      footer={<><button style={BTN("default")} onClick={onClose}>Cancel</button><button style={BTN("danger")} onClick={onClose}>🚨 Send escalation</button></>}>
      <div style={{ background: C.redBg, border: `1px solid ${C.redBorder}`, borderRadius: 8, padding: 12, marginBottom: 14, fontSize: 12, color: C.redText }}>
        <strong>Critical issue:</strong> Auth ERP dependency blocked for 8 days — direct impact on Customer Portal v2 and Q2 deadline.
      </div>
      <div style={FG}><label style={FL}>Escalate to <span style={{ color: C.red }}>*</span></label><select style={FI}><option>CTO — Paolo Neri</option><option>CEO — Giorgio Baldi</option><option>PMO Director</option><option>Project sponsor</option></select></div>
      <div style={FG}><label style={FL}>Urgency</label><select style={FI}><option>🔴 Critical — response within 24h</option><option>🟡 High — response within 48h</option></select></div>
      <div style={{ ...FG, marginBottom: 0 }}>
        <label style={FL}>Message <span style={{ color: C.red }}>*</span></label>
        <textarea style={{ ...FI, minHeight: 90, resize: "vertical" }} defaultValue="The Customer Portal v2 team is blocked on OAuth integration waiting for the auth module from ERP Migration. The 8-day delay puts Milestone M2 at risk. Requesting urgent action to unblock the dependency." />
      </div>
    </Modal>
  );
}

// ── New Sprint ──
export function ModalNewSprint({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal id="modal-new-sprint" title="New sprint" open={open} onClose={onClose}
      footer={<><button style={BTN("default")} onClick={onClose}>Cancel</button><button style={BTN("primary")} onClick={onClose}>Create sprint</button></>}>
      <div style={FG}><label style={FL}>Sprint name</label><input style={FI} type="text" defaultValue="Sprint 4" /></div>
      <div style={FROW}>
        <div style={FG}><label style={FL}>Start date</label><input style={FI} type="date" defaultValue="2026-05-01" /></div>
        <div style={FG}><label style={FL}>End date</label><input style={FI} type="date" defaultValue="2026-05-28" /></div>
      </div>
      <div style={FG}><label style={FL}>Sprint goal</label><textarea style={{ ...FI, minHeight: 55, resize: "vertical" }} placeholder="What must be completed in this sprint?" /></div>
      <div style={{ ...FG, marginBottom: 0 }}><label style={FL}>Estimated velocity (story points)</label><input style={FI} type="number" defaultValue={22} min={1} /></div>
    </Modal>
  );
}

// ── Export ──
export function ModalExport({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal id="modal-export" title="Export data" open={open} onClose={onClose}
      footer={<><button style={BTN("default")} onClick={onClose}>Cancel</button><button style={BTN("primary")} onClick={onClose}>Export</button></>}>
      <div style={FG}><label style={FL}>Format</label><select style={FI}><option>Excel (.xlsx)</option><option>CSV</option><option>PDF</option><option>JSON</option></select></div>
      <div style={{ ...FG, marginBottom: 0 }}>
        <label style={FL}>Include</label>
        <div style={{ display: "flex", flexDirection: "column", gap: 6, padding: 10, background: C.surface2, borderRadius: 8 }}>
          {["EVM data & KPIs", "Tasks & sprints", "Risk register", "Audit log"].map((item, i) => (
            <label key={item} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, cursor: "pointer" }}>
              <input type="checkbox" defaultChecked={i < 2} /> {item}
            </label>
          ))}
        </div>
      </div>
    </Modal>
  );
}

// ── Run Agents ──
export function ModalRunAgents({ open, onClose }: { open: boolean; onClose: () => void }) {
  const agents = [
    { dot: C.guardian, name: "Guardian AI",       desc: "Health analysis, SPI/CPI, alerts, reports"       },
    { dot: C.blue,     name: "Financial Analyst",  desc: "Recalculates EVM, updates forecasts"              },
    { dot: C.amber,    name: "Risk Monitor",       desc: "Re-evaluates open risks, suggests mitigations"   },
    { dot: C.purple,   name: "Dependency Monitor", desc: "Updates critical path, dependency blocks"         },
  ];
  return (
    <Modal id="modal-run-agents" title="⚡ Run all AI agents" open={open} onClose={onClose}
      footer={<><button style={BTN("default")} onClick={onClose}>Cancel</button><button style={BTN("primary")} onClick={onClose}>⚡ Run all agents</button></>}>
      <div style={{ fontSize: 12, color: C.text2, marginBottom: 14 }}>Will run the following agents on all active projects:</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {agents.map(a => (
          <div key={a.name} style={{ background: C.surface2, borderRadius: 8, padding: 10, display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: a.dot, flexShrink: 0 }} />
            <div><div style={{ fontSize: 12, fontWeight: 600 }}>{a.name}</div><div style={{ fontSize: 10, color: C.text3 }}>{a.desc}</div></div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 14, fontSize: 11, color: C.text3 }}>Estimated: ~45 seconds · 14 projects · no work interruption</div>
    </Modal>
  );
}

// ── Closure Report ──
export function ModalClosureReport({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal id="modal-closure-report" title="📄 Closure Report — Legacy CRM Migration" open={open} onClose={onClose} wide
      footer={<><button style={BTN("default")} onClick={onClose}>Close</button><button style={BTN("sm")}>Export PDF</button><button style={BTN("primary", { fontSize: 11, padding: "5px 12px" })}>Share with stakeholders</button></>}>
      <div style={{ background: C.guardianLight, border: `1px solid ${C.guardianBorder}`, borderRadius: 8, padding: 12, marginBottom: 14, display: "flex", gap: 8 }}>
        <div style={{ width: 7, height: 7, borderRadius: "50%", background: C.guardian, flexShrink: 0, marginTop: 3 }} />
        <div style={{ fontSize: 11, color: C.guardian }}><strong>Report generated by Guardian AI</strong> · Dec 2025 · Final score: 84/100</div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.text2, marginBottom: 8, textTransform: "uppercase", letterSpacing: ".06em" }}>Final metrics</div>
          {[["Duration","9 months (vs 8 planned)"],["Final budget","€842k / €900k"],["Final CPI","1.02"],["Features completed","47/48"]].map(([k,v]) => (
            <div key={k} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 6 }}>
              <span style={{ color: C.text2 }}>{k}</span><strong style={{ color: k === "Final budget" || k === "Final CPI" ? C.greenText : C.text }}>{v}</strong>
            </div>
          ))}
        </div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.text2, marginBottom: 8, textTransform: "uppercase", letterSpacing: ".06em" }}>Risks at closure</div>
          <div style={{ fontSize: 12, color: C.text2, lineHeight: 1.6 }}>2 minor risks resolved automatically. 0 critical risks open. Overall performance: <strong style={{ color: C.greenText }}>Excellent</strong>.</div>
        </div>
      </div>
      <div style={{ fontSize: 11, fontWeight: 700, color: C.text2, marginBottom: 8, textTransform: "uppercase", letterSpacing: ".06em" }}>Lessons learned (AI generated)</div>
      <div style={{ background: C.surface2, borderRadius: 8, padding: 12, fontSize: 12, color: C.text2, lineHeight: 1.7 }}>
        The project demonstrated excellent budget management with a final CPI of 1.02. The 1-month delay was caused by the complexity of the legacy COBOL integration. Recommendation: allocate +15% contingency for future enterprise data migration projects. The bi-weekly sprint strategy worked well for this type of project.
      </div>
    </Modal>
  );
}

// ── Feature Detail ──
export function ModalFeatureDetail({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal id="modal-feature-detail" title="CP-247 — Email verification endpoint" open={open} onClose={onClose} wide
      footer={<><button style={BTN("danger", { fontSize: 10, padding: "4px 9px" })} onClick={onClose}>Delete</button><div style={{ flex: 1 }} /><button style={BTN("default")} onClick={onClose}>Cancel</button><button style={BTN("primary")} onClick={onClose}>Save</button></>}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
        <div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
            <Tag v="n">Todo</Tag><span style={{ fontSize: 9, fontWeight: 700, padding: "1px 5px", borderRadius: 4, background: "#EFF6FF", color: "#1D4ED8" }}>Jira</span><Tag v="g">Medium</Tag><Tag v="n">Sprint 3</Tag>
          </div>
          <div style={FG}><label style={FL}>Title</label><input style={FI} type="text" defaultValue="Email verification endpoint" /></div>
          <div style={{ ...FG, marginBottom: 0 }}><label style={FL}>Description</label><textarea style={{ ...FI, minHeight: 80, resize: "vertical" }} defaultValue="Implement POST /auth/verify-email endpoint that accepts a JWT token and verifies the user's email address." /></div>
        </div>
        <div>
          <div style={FG}><label style={FL}>Assigned to</label><select style={FI}><option>Chiara Ferraro</option><option>Andrea Sanna</option></select></div>
          <div style={FG}><label style={FL}>Story points</label><input style={FI} type="number" defaultValue={3} /></div>
          <div style={FG}><label style={FL}>Priority</label><select style={FI}><option>Medium</option><option>High</option><option>Low</option></select></div>
          <div style={{ ...FG, marginBottom: 0 }}><label style={FL}>Status</label><select style={FI}><option>Todo</option><option>In progress</option><option>In review</option><option>Done</option><option>Blocked</option></select></div>
        </div>
      </div>
      <div style={{ ...FG, marginBottom: 0 }}><label style={FL}>Comments</label><textarea style={{ ...FI, minHeight: 55, resize: "vertical" }} placeholder="Add a comment..." /></div>
    </Modal>
  );
}

// ── RACI Edit ──
export function ModalRaci({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal id="modal-raci" title="Edit RACI Matrix" open={open} onClose={onClose} wide
      footer={<><button style={BTN("default")} onClick={onClose}>Cancel</button><button style={BTN("primary")} onClick={onClose}>Save RACI</button></>}>
      <div style={{ fontSize: 11, color: C.text2, marginBottom: 14, lineHeight: 1.5 }}>
        <strong>R</strong>esponsible · <strong>A</strong>ccountable · <strong>C</strong>onsulted · <strong>I</strong>nformed
      </div>
      <div style={FG}><label style={FL}>Activity</label><input style={FI} type="text" defaultValue="Sprint planning" /></div>
      <div style={FROW}>
        <div style={FG}><label style={FL}>Responsible</label><select style={FI}><option>Laura Pinto</option><option>Andrea Sanna</option><option>Chiara Ferraro</option></select></div>
        <div style={FG}><label style={FL}>Accountable</label><select style={FI}><option>Laura Pinto</option><option>PMO Director</option><option>CFO</option></select></div>
      </div>
      <div style={FROW}>
        <div style={FG}><label style={FL}>Consulted</label><input style={FI} type="text" defaultValue="Andrea Sanna, Team B" /></div>
        <div style={{ ...FG, marginBottom: 0 }}><label style={FL}>Informed</label><input style={FI} type="text" defaultValue="Stakeholder, CEO" /></div>
      </div>
    </Modal>
  );
}

// ── Delete Org ──
export function ModalDeleteOrg({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal id="modal-delete-org" title="⚠ Delete organisation" open={open} onClose={onClose}
      footer={<><button style={BTN("default")} onClick={onClose}>Cancel</button><button style={BTN("danger")} onClick={onClose}>Delete permanently</button></>}>
      <div style={{ background: C.redBg, border: `1px solid ${C.redBorder}`, borderRadius: 8, padding: 12, marginBottom: 14, fontSize: 12, color: C.redText }}>
        This action is <strong>irreversible</strong>. All projects, EVM data, reports and audit logs will be permanently deleted.
      </div>
      <div style={{ ...FG, marginBottom: 0 }}><label style={FL}>Type <strong>DELETE ACME CORP</strong> to confirm</label><input style={FI} type="text" placeholder="DELETE ACME CORP" /></div>
    </Modal>
  );
}

// ── Edit Role ──
export function ModalEditRole({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal id="modal-edit-role" title="Edit role — Marco Rossi" open={open} onClose={onClose}
      footer={<><button style={BTN("default")} onClick={onClose}>Cancel</button><button style={BTN("primary")} onClick={onClose}>Save role</button></>}>
      <div style={FG}><label style={FL}>Role</label><select style={FI}><option>Admin</option><option>Manager</option><option>Viewer</option></select></div>
      <div style={{ ...FG, marginBottom: 0 }}>
        <label style={FL}>Project access</label>
        <div style={{ display: "flex", flexDirection: "column", gap: 6, padding: 10, background: C.surface2, borderRadius: 8 }}>
          {[["Customer Portal v2", true], ["ERP Migration", true], ["Data Warehouse", false]].map(([p, checked]) => (
            <label key={p as string} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, cursor: "pointer" }}>
              <input type="checkbox" defaultChecked={checked as boolean} /> {p}
            </label>
          ))}
        </div>
      </div>
    </Modal>
  );
}
