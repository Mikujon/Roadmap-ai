"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { C, CARD, CARD_H, CARD_T, CARD_S, CARD_BODY, BTN, GuardianBar, useToast, FG, FL, FI, FHINT, FROW, FROW3 } from "@/components/ui/shared";

type Step = 1 | 2 | 3 | 4;

function WizardSteps({ current }: { current: Step }) {
  const steps = [{ n: 1, label: "Details" }, { n: 2, label: "AI Structure" }, { n: 3, label: "Team & Budget" }, { n: 4, label: "Confirm" }];
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 0, marginBottom: 28, maxWidth: 440 }}>
      {steps.map((s, i) => {
        const done   = current > s.n;
        const active = current === s.n;
        return (
          <div key={s.n} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, flex: i < steps.length - 1 ? "1" : "0" }}>
            <div style={{ display: "flex", alignItems: "center", width: "100%" }}>
              <div style={{ width: 28, height: 28, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, flexShrink: 0, fontFamily: "'DM Mono', monospace",
                background: done ? C.green : active ? C.blue : C.surface2,
                color: done || active ? "#fff" : C.text3,
                border: done || active ? "none" : `1.5px solid ${C.border}`,
                boxShadow: active ? `0 0 0 4px rgba(37,99,235,.15)` : "none",
              }}>
                {done ? "✓" : s.n}
              </div>
              {i < steps.length - 1 && (
                <div style={{ flex: 1, height: 2, background: done ? C.green : C.border, marginLeft: 0 }} />
              )}
            </div>
            <div style={{ fontSize: 10, fontWeight: 600, color: active ? C.blue : done ? C.green : C.text3, whiteSpace: "nowrap", marginLeft: i === 0 ? 0 : undefined }}>{s.label}</div>
          </div>
        );
      })}
    </div>
  );
}

export default function NewProjectPage() {
  const [step, setStep] = useState<Step>(1);
  const [projName, setProjName] = useState("");
  const router = useRouter();
  const { show: toast, ToastContainer } = useToast();

  const next = () => setStep(s => Math.min(s + 1, 4) as Step);
  const prev = () => setStep(s => Math.max(s - 1, 1) as Step);

  const create = async () => {
    toast(`Project "${projName || "New Project"}" created 🚀`, "ok");
    setTimeout(() => router.push("/portfolio"), 600);
  };

  return (
    <div style={{ padding: "24px 28px", fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20, gap: 14 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: C.text, letterSpacing: "-.4px", margin: 0, marginBottom: 4 }}>New project</h1>
          <p style={{ fontSize: 11, color: C.text2, margin: 0 }}>Guardian AI generates phases, sprints and features from your brief</p>
        </div>
        <button style={BTN("sm")} onClick={() => router.back()}>Cancel</button>
      </div>

      <div style={{ maxWidth: 620 }}>
        <WizardSteps current={step} />

        {/* ── Step 1: Details ── */}
        {step === 1 && (
          <div style={CARD}>
            <div style={CARD_H}><span style={CARD_T}>Project details</span><span style={CARD_S}>step 1 of 4</span></div>
            <div style={CARD_BODY}>
              <div style={FG}>
                <label style={FL}>Project name <span style={{ color: C.red }}>*</span></label>
                <input style={FI} type="text" placeholder="e.g. Customer Portal v3" value={projName} onChange={e => setProjName(e.target.value)} />
              </div>
              <div style={FG}>
                <label style={FL}>Functional brief <span style={{ color: C.red }}>*</span></label>
                <textarea style={{ ...FI, minHeight: 110, resize: "vertical" }} placeholder={"Describe what needs to be built. Guardian AI generates phases, sprints and features automatically from this description.\n\nInclude: objectives, tech stack, main features, constraints."} />
                <span style={FHINT}>More detail → better AI-generated structure. Minimum 100 characters.</span>
              </div>
              <div style={{ ...FROW, marginBottom: 14 }}>
                <div style={FG}><label style={FL}>Start date</label><input style={FI} type="date" defaultValue="2026-04-15" /></div>
                <div style={FG}><label style={FL}>End date</label><input style={FI} type="date" defaultValue="2026-07-31" /></div>
              </div>
              <div style={{ ...FROW, marginBottom: 14 }}>
                <div style={FG}><label style={FL}>Budget (BAC)</label><input style={FI} type="text" placeholder="€0" /></div>
                <div style={FG}><label style={FL}>Expected revenue</label><input style={FI} type="text" placeholder="€0" /></div>
              </div>
              <div style={{ ...FROW, marginBottom: 14 }}>
                <div style={FG}><label style={FL}>Requested by</label><input style={FI} type="text" placeholder="Stakeholder name" /></div>
                <div style={FG}><label style={FL}>Department</label><select style={FI}><option>Engineering</option><option>Product</option><option>Operations</option><option>Sales</option><option>Finance</option></select></div>
              </div>
              <div style={FROW}>
                <div style={FG}><label style={FL}>Priority</label><select style={FI}><option>High</option><option>Medium</option><option>Low</option></select></div>
                <div style={{ ...FG, marginBottom: 0 }}><label style={FL}>Methodology</label><select style={FI}><option>Agile Scrum</option><option>Kanban</option><option>Waterfall</option><option>Hybrid</option></select></div>
              </div>
            </div>
            <div style={{ padding: "12px 16px", borderTop: `1px solid ${C.border}`, display: "flex", gap: 9, alignItems: "center" }}>
              <button style={BTN("primary", { fontSize: 12, padding: "8px 16px" })} onClick={next}>Generate with AI →</button>
              <button style={BTN("default", { fontSize: 12, padding: "8px 16px" })} onClick={next}>Create manually</button>
              <div style={{ marginLeft: "auto", fontSize: 10, color: C.text3 }}>10 AI generations/hour</div>
            </div>
            <GuardianBar text="will generate 3–5 phases, sprints and features · edit everything before saving" />
          </div>
        )}

        {/* ── Step 2: AI Structure ── */}
        {step === 2 && (
          <div style={CARD}>
            <div style={CARD_H}><span style={CARD_T}>AI-generated structure</span><span style={CARD_S}>step 2 of 4 · edit before proceeding</span></div>
            <div style={CARD_BODY}>
              <div style={{ background: C.guardianLight, border: `1px solid ${C.guardianBorder}`, borderRadius: 8, padding: 12, marginBottom: 14, display: "flex", gap: 8, alignItems: "flex-start" }}>
                <div style={{ width: 7, height: 7, borderRadius: "50%", background: C.guardian, flexShrink: 0, marginTop: 3 }} />
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: C.guardian }}>Guardian AI has generated the structure</div>
                  <div style={{ fontSize: 11, color: C.guardian, marginTop: 2 }}>3 phases · 6 sprints · 24 features · based on your brief</div>
                </div>
              </div>
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.text2, marginBottom: 8, textTransform: "uppercase", letterSpacing: ".06em" }}>Proposed phases</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                  {[
                    { title: "Phase 1 — Planning & Design", dur: "14 days",  desc: "System architecture, UI/UX design, infrastructure setup"  },
                    { title: "Phase 2 — Core development",  dur: "42 days",  desc: "Backend API, frontend components, auth, database"          },
                    { title: "Phase 3 — QA & Launch",       dur: "14 days",  desc: "Testing, bug fix, deployment, documentation"               },
                  ].map(ph => (
                    <div key={ph.title} style={{ background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 8, padding: 10 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                        <div style={{ fontSize: 12, fontWeight: 700 }}>{ph.title}</div>
                        <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 5, background: C.surface, color: C.text2, border: `1px solid ${C.border}` }}>{ph.dur}</span>
                      </div>
                      <div style={{ fontSize: 11, color: C.text2 }}>{ph.desc}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div style={{ padding: "12px 16px", borderTop: `1px solid ${C.border}`, display: "flex", gap: 9 }}>
              <button style={BTN("default")} onClick={prev}>← Back</button>
              <button style={BTN("primary", { fontSize: 12, padding: "8px 16px" })} onClick={next}>Accept structure →</button>
              <button style={BTN("default")} onClick={() => toast("Regenerating…","ok")}>Regenerate</button>
            </div>
          </div>
        )}

        {/* ── Step 3: Team & Budget ── */}
        {step === 3 && (
          <div style={CARD}>
            <div style={CARD_H}><span style={CARD_T}>Team & Budget</span><span style={CARD_S}>step 3 of 4</span></div>
            <div style={CARD_BODY}>
              <div style={FG}>
                <label style={FL}>Project Manager <span style={{ color: C.red }}>*</span></label>
                <select style={FI}><option>Laura Pinto</option><option>Marco Rossi</option><option>Giulia Ferri</option></select>
              </div>
              <div style={FG}>
                <label style={FL}>Team members</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, padding: 8, background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 8, minHeight: 42 }}>
                  {[["LP - Laura P.", true],["AS - Andrea S.", true],["MR - Marco R.", false],["GF - Giulia F.", false]].map(([name, on]) => (
                    <button key={name as string} style={{ display: "inline-flex", alignItems: "center", background: on ? C.text : C.surface2, border: `1px solid ${on ? C.text : C.border}`, borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 500, color: on ? "#fff" : C.text2, cursor: "pointer", fontFamily: "inherit" }}>{name}</button>
                  ))}
                </div>
              </div>
              <div style={FG}>
                <label style={FL}>Budget breakdown</label>
                <div style={FROW3}>
                  <div style={FG}><label style={{ ...FL, fontSize: 10 }}>Development</label><input style={FI} type="text" defaultValue="€220k" /></div>
                  <div style={FG}><label style={{ ...FL, fontSize: 10 }}>Design</label><input style={FI} type="text" defaultValue="€60k" /></div>
                  <div style={{ ...FG, marginBottom: 0 }}><label style={{ ...FL, fontSize: 10 }}>QA/Testing</label><input style={FI} type="text" defaultValue="€40k" /></div>
                </div>
                <div style={{ ...FROW3, marginTop: 8 }}>
                  <div style={FG}><label style={{ ...FL, fontSize: 10 }}>Infrastructure</label><input style={FI} type="text" defaultValue="€30k" /></div>
                  <div style={FG}><label style={{ ...FL, fontSize: 10 }}>Contingency</label><input style={FI} type="text" defaultValue="€30k" /></div>
                  <div style={{ ...FG, marginBottom: 0 }}><label style={{ ...FL, fontSize: 10 }}>Total BAC</label><input style={{ ...FI, fontWeight: 700 }} type="text" defaultValue="€380k" /></div>
                </div>
              </div>
              <div style={{ ...FG, marginBottom: 0 }}>
                <label style={FL}>Integrations to activate</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {[["Jira", true],["GitHub", false],["Slack", false],["Linear", false]].map(([name, on]) => (
                    <button key={name as string} style={{ display: "inline-flex", alignItems: "center", background: on ? C.text : C.surface2, border: `1px solid ${on ? C.text : C.border}`, borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 500, color: on ? "#fff" : C.text2, cursor: "pointer", fontFamily: "inherit" }}>{name}</button>
                  ))}
                </div>
              </div>
            </div>
            <div style={{ padding: "12px 16px", borderTop: `1px solid ${C.border}`, display: "flex", gap: 9 }}>
              <button style={BTN("default")} onClick={prev}>← Back</button>
              <button style={BTN("primary", { fontSize: 12, padding: "8px 16px" })} onClick={next}>Continue →</button>
            </div>
          </div>
        )}

        {/* ── Step 4: Confirm ── */}
        {step === 4 && (
          <div style={CARD}>
            <div style={CARD_H}><span style={CARD_T}>Summary & Confirm</span><span style={CARD_S}>step 4 of 4 · check before saving</span></div>
            <div style={CARD_BODY}>
              <div style={{ background: C.blueBg, border: `1px solid ${C.blueBorder}`, borderRadius: 8, padding: 14, marginBottom: 14 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.blueText, marginBottom: 10 }}>Project summary</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 12 }}>
                  {[["Name", projName || "New Project"],["Period","Apr 15 – Jul 31"],["Budget","€380k"],["Phases","3"],["Sprints","6"],["AI features","24"]].map(([k, v]) => (
                    <div key={k}><span style={{ color: C.text2 }}>{k}:</span> <strong>{v}</strong></div>
                  ))}
                </div>
              </div>
              <div style={{ ...FG, marginBottom: 0 }}>
                <label style={FL}>Additional notes (optional)</label>
                <textarea style={{ ...FI, minHeight: 70, resize: "vertical" }} placeholder="Any special notes or constraints..." />
              </div>
            </div>
            <div style={{ padding: "12px 16px", borderTop: `1px solid ${C.border}`, display: "flex", gap: 9 }}>
              <button style={BTN("default")} onClick={prev}>← Back</button>
              <button style={BTN("primary", { fontSize: 12, padding: "8px 16px" })} onClick={create}>🚀 Create project</button>
            </div>
            <GuardianBar text="will start automatic monitoring on save · EVM active from day 1" />
          </div>
        )}
      </div>

      <ToastContainer />
    </div>
  );
}
