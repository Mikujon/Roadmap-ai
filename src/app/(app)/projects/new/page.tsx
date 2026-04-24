"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { C, BTN, GuardianBar, useToast, FG, FL, FI, FHINT } from "@/components/ui/shared";
import { Breadcrumb } from "@/components/ui/breadcrumb";

type Step = 1 | 2 | 3 | 4 | 5;

const STEPS = [
  { n: 1, label: "Details"      },
  { n: 2, label: "Documents"    },
  { n: 3, label: "AI Structure" },
  { n: 4, label: "Team & Budget"},
  { n: 5, label: "Confirm"      },
];

const FIELD_STYLE: React.CSSProperties = {
  width: "100%", background: "#F8FAFC", border: "1.5px solid #E5E2D9",
  borderRadius: 8, padding: "9px 12px", fontSize: 13, outline: "none",
  fontFamily: "inherit", color: "#18170F",
};

const LABEL_STYLE: React.CSSProperties = {
  fontSize: 10, fontWeight: 700, color: "#9E9C93",
  textTransform: "uppercase", letterSpacing: "0.07em",
  display: "block", marginBottom: 5,
};

const CARD: React.CSSProperties = {
  background: "#fff", border: "1px solid #E5E2D9",
  borderRadius: 12, overflow: "hidden",
};

interface Phase {
  title: string;
  duration: string;
  desc: string;
}

const DEFAULT_PHASES: Phase[] = [
  { title: "Phase 1 — Planning & Design",  duration: "14 days", desc: "System architecture, UI/UX design, infrastructure setup"  },
  { title: "Phase 2 — Core Development",   duration: "42 days", desc: "Backend API, frontend components, auth, database"           },
  { title: "Phase 3 — QA & Launch",         duration: "14 days", desc: "Testing, bug fix, deployment, documentation"               },
];

const TEAM_OPTIONS = ["LP — Laura P.", "AS — Andrea S.", "MR — Marco R.", "GF — Giulia F.", "DP — Dario P."];

// ── Progress Steps ────────────────────────────────────────────────────────────
function WizardProgress({ current }: { current: Step }) {
  return (
    <div style={{ display: "flex", alignItems: "center", padding: "18px 28px", background: "#fff", borderBottom: "1px solid #E5E2D9", gap: 0 }}>
      {STEPS.map((s, i) => {
        const done   = current > s.n;
        const active = current === s.n;
        return (
          <div key={s.n} style={{ display: "flex", alignItems: "center", flex: i < STEPS.length - 1 ? 1 : "none" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, flexShrink: 0 }}>
              <div style={{
                width: 30, height: 30, borderRadius: "50%",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 12, fontWeight: 700, fontFamily: "'DM Mono', monospace",
                background: done ? "#059669" : active ? "#006D6B" : "#F4F2EC",
                color: done || active ? "#fff" : "#9E9C93",
                border: active ? "none" : done ? "none" : "1.5px solid #E5E2D9",
                boxShadow: active ? "0 0 0 4px rgba(0,109,107,.12)" : "none",
              }}>
                {done ? "✓" : s.n}
              </div>
              <div style={{ fontSize: 10, fontWeight: 600, color: active ? "#006D6B" : done ? "#059669" : "#9E9C93", whiteSpace: "nowrap" }}>
                {s.label}
              </div>
            </div>
            {i < STEPS.length - 1 && (
              <div style={{ flex: 1, height: 2, background: done ? "#059669" : "#E5E2D9", margin: "0 8px", marginBottom: 20 }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Live Preview Panel ────────────────────────────────────────────────────────
function PreviewPanel({
  name, startDate, endDate, budget, methodology,
  step, phases, team,
}: {
  name: string; startDate: string; endDate: string; budget: string;
  methodology: string; step: Step; phases: Phase[]; team: string[];
}) {
  const score = Math.min(100,
    (name.trim().length > 2 ? 20 : 0) +
    (startDate && endDate ? 20 : 0) +
    (budget ? 15 : 0) +
    (methodology ? 10 : 0) +
    (step >= 4 ? 20 : step >= 3 ? 10 : 0) +
    (team.length >= 2 ? 15 : team.length >= 1 ? 7 : 0)
  );
  const scoreColor = score >= 80 ? "#059669" : score >= 50 ? "#D97706" : "#DC2626";

  const fmtDate = (d: string) => {
    if (!d) return "—";
    try { return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }); }
    catch { return d; }
  };

  return (
    <div style={{
      background: "#F8F7F3", border: "1px solid #E5E2D9", borderRadius: 12,
      padding: 24, position: "sticky", top: 24,
    }}>
      <div style={{ fontSize: 9, fontWeight: 800, color: "#9E9C93", letterSpacing: ".1em", textTransform: "uppercase", marginBottom: 16 }}>
        Live Preview
      </div>

      {/* Project name */}
      <div style={{ fontSize: 22, fontWeight: 700, color: "#18170F", marginBottom: 8, lineHeight: 1.2, minHeight: 28, wordBreak: "break-word" }}>
        {name.trim() || <span style={{ color: "#CCC9BF" }}>Project name…</span>}
      </div>

      {/* Pills row */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
        {(startDate || endDate) && (
          <span style={{ fontSize: 10, fontWeight: 600, background: "#EFF6FF", color: "#2563EB", border: "1px solid #BFDBFE", padding: "3px 9px", borderRadius: 20 }}>
            {fmtDate(startDate)} → {fmtDate(endDate)}
          </span>
        )}
        {budget && (
          <span style={{ fontSize: 10, fontWeight: 600, background: "#F0FDF4", color: "#059669", border: "1px solid #BBF7D0", padding: "3px 9px", borderRadius: 20 }}>
            {budget}
          </span>
        )}
        {methodology && (
          <span style={{ fontSize: 10, fontWeight: 600, background: "#F5F3FF", color: "#7C3AED", border: "1px solid #C4B5FD", padding: "3px 9px", borderRadius: 20 }}>
            {methodology}
          </span>
        )}
      </div>

      {/* Phases (after step 2) */}
      {step >= 3 && phases.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#9E9C93", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 8 }}>
            Phases
          </div>
          {phases.map((ph, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
              <div style={{ width: 18, height: 18, borderRadius: "50%", background: "#006D6B", color: "#fff", fontSize: 9, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                {i + 1}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: "#18170F" }}>{ph.title || `Phase ${i + 1}`}</div>
                <div style={{ fontSize: 10, color: "#9E9C93" }}>{ph.duration}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Team (after step 3) */}
      {step >= 4 && team.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#9E9C93", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 8 }}>
            Team
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
            {team.map(m => (
              <span key={m} style={{ fontSize: 10, fontWeight: 600, background: "#fff", border: "1px solid #E5E2D9", padding: "3px 9px", borderRadius: 20, color: "#5C5A52" }}>
                {m.split("—")[0].trim()}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Readiness score */}
      <div style={{ borderTop: "1px solid #E5E2D9", paddingTop: 14, marginTop: 4 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#9E9C93", textTransform: "uppercase", letterSpacing: ".06em" }}>
            Guardian AI Readiness
          </div>
          <span style={{ fontSize: 14, fontWeight: 800, color: scoreColor, fontFamily: "'DM Mono', monospace" }}>
            {score}%
          </span>
        </div>
        <div style={{ height: 5, background: "#E5E2D9", borderRadius: 99, overflow: "hidden" }}>
          <div style={{
            height: "100%", borderRadius: 99,
            width: `${score}%`,
            background: scoreColor,
            transition: "width 0.4s ease, background 0.4s ease",
          }} />
        </div>
        <div style={{ fontSize: 10, color: "#9E9C93", marginTop: 5 }}>
          {score >= 80 ? "Ready to create project" :
           score >= 50 ? "Add more details to improve accuracy" :
           "Fill in project name and dates to start"}
        </div>
      </div>
    </div>
  );
}

// ── Main wizard ───────────────────────────────────────────────────────────────
export default function NewProjectPage() {
  const [step, setStep]             = useState<Step>(1);
  const [projName, setProjName]     = useState("");
  const [startDate, setStartDate]   = useState("2026-04-15");
  const [endDate, setEndDate]       = useState("2026-07-31");
  const [budget, setBudget]         = useState("");
  const [revenue, setRevenue]       = useState("");
  const [priority, setPriority]     = useState("High");
  const [methodology, setMethodology] = useState("Agile Scrum");
  const [requestedBy, setRequestedBy] = useState("");
  const [department, setDepartment] = useState("Engineering");
  const [brief, setBrief]           = useState("");

  // Step 2 — Documents state
  type DocStatus = "idle" | "generating" | "done" | "skipped";
  const [faStatus, setFaStatus]   = useState<DocStatus>("idle");
  const [tdStatus, setTdStatus]   = useState<DocStatus>("idle");
  const [faContent, setFaContent] = useState<Record<string, unknown> | null>(null);
  const [faApproved, setFaApproved] = useState(false);

  // Step 3 state
  const [generating, setGenerating] = useState(false);
  const [phases, setPhases]         = useState<Phase[]>([]);
  const regenerateRef               = useRef(false);

  // Step 3 state
  const [team, setTeam]             = useState<string[]>(["LP — Laura P."]);
  const [budgetBreakdown, setBudgetBreakdown] = useState({
    dev: "220000", design: "60000", qa: "40000", infra: "30000", contingency: "30000",
  });

  const router = useRouter();
  const { show: toast, ToastContainer } = useToast();

  const fmtBudget = (v: string) => {
    const n = parseFloat(v.replace(/[^0-9.]/g, ""));
    if (isNaN(n)) return "—";
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
  };

  const budgetTotal = Object.values(budgetBreakdown).reduce((s, v) => {
    const n = parseFloat(v.replace(/[^0-9.]/g, ""));
    return s + (isNaN(n) ? 0 : n);
  }, 0);

  const runGenerate = () => {
    setGenerating(true);
    setPhases([]);
    regenerateRef.current = true;
    setTimeout(() => {
      setPhases(DEFAULT_PHASES.map(p => ({ ...p })));
      setGenerating(false);
      regenerateRef.current = false;
    }, 1500);
  };

  const goNext = (from: Step) => {
    if (from === 1) {
      if (!projName.trim()) { toast("Project name is required", "warn"); return; }
    }
    if (from === 2) {
      // coming from Documents → trigger AI structure generation
      runGenerate();
    }
    setStep(s => Math.min(s + 1, 5) as Step);
  };

  const goPrev = (from: Step) => setStep(s => Math.max(s - 1, 1) as Step);

  const [creating, setCreating] = useState(false);

  const create = async () => {
    if (!projName.trim()) { toast("Project name is required", "warn"); return; }
    setCreating(true);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name:            projName,
          brief:           brief,
          startDate:       startDate,
          endDate:         endDate,
          budgetTotal:     budgetTotal || budget,
          revenueExpected: revenue,
          phases:          phases,
        }),
      });

      const text = await res.text();
      console.log("API response:", res.status, text);

      if (!text || text.trim() === "") {
        console.error("Empty response from API");
        toast("Server returned empty response — check console", "err");
        return;
      }

      let data: any;
      try {
        data = JSON.parse(text);
      } catch (e) {
        console.error("Invalid JSON:", text);
        toast("Invalid response: " + text.slice(0, 100), "err");
        return;
      }

      if (!res.ok) {
        toast("Failed to create project: " + (data.error ?? "Unknown error"), "err");
        return;
      }

      toast(`Project "${data.project.name}" created`, "ok");
      setTimeout(() => router.push(`/projects/${data.project.id}`), 600);
    } catch (err) {
      toast("Network error — please try again", "err");
      console.error(err);
    } finally {
      setCreating(false);
    }
  };

  const toggleTeam = (m: string) =>
    setTeam(t => t.includes(m) ? t.filter(x => x !== m) : [...t, m]);

  const updatePhase = (i: number, key: keyof Phase, val: string) =>
    setPhases(ps => ps.map((p, idx) => idx === i ? { ...p, [key]: val } : p));

  const addPhase = () =>
    setPhases(ps => [...ps, { title: `Phase ${ps.length + 1}`, duration: "14 days", desc: "" }]);

  const removePhase = (i: number) =>
    setPhases(ps => ps.filter((_, idx) => idx !== i));

  return (
    <div style={{ fontFamily: "'DM Sans', system-ui, sans-serif", background: "#F8F7F3", minHeight: "100vh" }}>
      <WizardProgress current={step} />

      <div style={{ padding: "24px 28px" }}>
        <Breadcrumb items={[{ label: "Portfolio", href: "/portfolio" }, { label: "New Project" }]} />

        {/* Page header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24, gap: 14 }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: C.text, letterSpacing: "-.4px", margin: 0, marginBottom: 4 }}>New project</h1>
            <p style={{ fontSize: 11, color: C.text2, margin: 0 }}>Guardian AI generates phases, sprints and features from your brief</p>
          </div>
          <button style={BTN("sm")} onClick={() => router.back()}>Cancel</button>
        </div>

        {/* 2-column layout */}
        <div style={{ display: "grid", gridTemplateColumns: "60% 40%", gap: 24, alignItems: "start" }}>

          {/* ── LEFT COLUMN ── */}
          <div>

            {/* ── STEP 1 ── */}
            {step === 1 && (
              <div style={CARD}>
                <div style={{ padding: "13px 16px", borderBottom: "1px solid #E5E2D9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>Project details</span>
                  <span style={{ fontSize: 11, color: C.text3 }}>step 1 of 4</span>
                </div>
                <div style={{ padding: "16px 16px 4px" }}>

                  {/* Row 1: project name full width */}
                  <div style={FG}>
                    <label style={LABEL_STYLE}>Project name <span style={{ color: C.red }}>*</span></label>
                    <input style={FIELD_STYLE} type="text" placeholder="e.g. Customer Portal v3"
                      value={projName} onChange={e => setProjName(e.target.value)} />
                  </div>

                  {/* Row 2: start | end */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
                    <div>
                      <label style={LABEL_STYLE}>Start date</label>
                      <input style={FIELD_STYLE} type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
                    </div>
                    <div>
                      <label style={LABEL_STYLE}>End date</label>
                      <input style={FIELD_STYLE} type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
                    </div>
                  </div>

                  {/* Row 3: budget | revenue */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
                    <div>
                      <label style={LABEL_STYLE}>Budget (BAC)</label>
                      <input style={FIELD_STYLE} type="text" placeholder="$0"
                        value={budget} onChange={e => setBudget(e.target.value)} />
                    </div>
                    <div>
                      <label style={LABEL_STYLE}>Expected revenue</label>
                      <input style={FIELD_STYLE} type="text" placeholder="$0"
                        value={revenue} onChange={e => setRevenue(e.target.value)} />
                    </div>
                  </div>

                  {/* Row 4: priority | methodology */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
                    <div>
                      <label style={LABEL_STYLE}>Priority</label>
                      <select style={FIELD_STYLE} value={priority} onChange={e => setPriority(e.target.value)}>
                        <option>High</option><option>Medium</option><option>Low</option>
                      </select>
                    </div>
                    <div>
                      <label style={LABEL_STYLE}>Methodology</label>
                      <select style={FIELD_STYLE} value={methodology} onChange={e => setMethodology(e.target.value)}>
                        <option>Agile Scrum</option><option>Kanban</option><option>Waterfall</option><option>Hybrid</option>
                      </select>
                    </div>
                  </div>

                  {/* Row 5: requested by | department */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
                    <div>
                      <label style={LABEL_STYLE}>Requested by</label>
                      <input style={FIELD_STYLE} type="text" placeholder="Stakeholder name"
                        value={requestedBy} onChange={e => setRequestedBy(e.target.value)} />
                    </div>
                    <div>
                      <label style={LABEL_STYLE}>Department</label>
                      <select style={FIELD_STYLE} value={department} onChange={e => setDepartment(e.target.value)}>
                        <option>Engineering</option><option>Product</option><option>Operations</option><option>Sales</option><option>Finance</option>
                      </select>
                    </div>
                  </div>

                  {/* Row 6: brief full width */}
                  <div style={{ marginBottom: 14 }}>
                    <label style={LABEL_STYLE}>Functional brief <span style={{ color: C.red }}>*</span></label>
                    <textarea
                      style={{ ...FIELD_STYLE, minHeight: 140, resize: "vertical" }}
                      placeholder={"Describe what needs to be built. Guardian AI generates phases, sprints and features automatically.\n\nInclude: objectives, tech stack, main features, constraints."}
                      value={brief}
                      onChange={e => setBrief(e.target.value)}
                    />
                    <div style={{ fontSize: 10, color: C.text3, marginTop: 4 }}>
                      More detail → better AI-generated structure. Minimum 100 characters.
                      {brief.length > 0 && <span style={{ marginLeft: 6, color: brief.length >= 100 ? "#059669" : "#D97706", fontWeight: 600 }}>{brief.length} chars</span>}
                    </div>
                  </div>
                </div>

                <div style={{ padding: "12px 16px", borderTop: `1px solid ${C.border}`, display: "flex", gap: 9, alignItems: "center" }}>
                  <button style={BTN("primary", { fontSize: 12, padding: "8px 16px" })} onClick={() => goNext(1)}>
                    Next: Documents →
                  </button>
                  <div style={{ marginLeft: "auto", fontSize: 10, color: C.text3 }}>step 1 of 5</div>
                </div>
                <GuardianBar text="optionally add documents before AI generates your project structure" />
              </div>
            )}

            {/* ── STEP 2 — Documents ── */}
            {step === 2 && (
              <div style={CARD}>
                <div style={{ padding: "13px 16px", borderBottom: "1px solid #E5E2D9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>Documents</span>
                  <span style={{ fontSize: 11, color: C.text3 }}>step 2 of 5 · optional</span>
                </div>
                <div style={{ padding: "16px 16px 4px" }}>
                  <div style={{ fontSize: 12, color: C.text2, marginBottom: 16 }}>
                    Generate project documents now or skip — you can always create them later from the project page.
                  </div>

                  {/* Card A — Functional Analysis */}
                  <div style={{ background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 10, padding: 16, marginBottom: 12 }}>
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 8 }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 3 }}>Functional Analysis</div>
                        <div style={{ fontSize: 11, color: C.text2 }}>AI generates functional requirements, scope, process flow and stakeholder matrix</div>
                      </div>
                      {faStatus === "done" && (
                        <span style={{ fontSize: 10, fontWeight: 700, background: faApproved ? "#F0FDF4" : "#FFFBEB", color: faApproved ? "#14532D" : "#92400E", border: `1px solid ${faApproved ? "#BBF7D0" : "#FDE68A"}`, padding: "3px 9px", borderRadius: 20, whiteSpace: "nowrap" }}>
                          {faApproved ? "APPROVED" : "DRAFT"}
                        </span>
                      )}
                    </div>
                    {faStatus === "idle" && (
                      <div style={{ display: "flex", gap: 8 }}>
                        <button
                          style={BTN("primary", { fontSize: 11, padding: "6px 12px" })}
                          onClick={async () => {
                            if (!projName.trim()) { toast("Enter a project name first", "warn"); return; }
                            setFaStatus("generating");
                            try {
                              // Generate a preview FA without saving (no projectId yet)
                              const res = await fetch("/api/generate/route", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ brief, projectName: projName }),
                              });
                              if (res.ok) {
                                const data = await res.json();
                                setFaContent(data.phases ?? data);
                              }
                              setFaStatus("done");
                            } catch {
                              setFaStatus("done");
                            }
                          }}
                        >
                          Generate with AI
                        </button>
                        <button style={BTN("default", { fontSize: 11, padding: "6px 12px" })} onClick={() => setFaStatus("skipped")}>
                          Skip for now
                        </button>
                      </div>
                    )}
                    {faStatus === "generating" && (
                      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0" }}>
                        <div style={{ width: 18, height: 18, borderRadius: "50%", border: "2px solid #E5E2D9", borderTopColor: "#006D6B", animation: "spin 0.8s linear infinite" }} />
                        <span style={{ fontSize: 11, color: C.text2 }}>Guardian AI is analyzing your brief…</span>
                      </div>
                    )}
                    {faStatus === "done" && (
                      <div>
                        <div style={{ fontSize: 11, color: C.text2, marginBottom: 10 }}>
                          Functional Analysis generated. Review before approving.
                        </div>
                        <div style={{ display: "flex", gap: 8 }}>
                          <button style={BTN("primary", { fontSize: 11, padding: "6px 12px" })} onClick={() => setFaApproved(true)}>
                            {faApproved ? "✓ Approved" : "Approve"}
                          </button>
                          <button style={BTN("default", { fontSize: 11, padding: "6px 12px" })} onClick={() => setFaStatus("idle")}>
                            Regenerate
                          </button>
                        </div>
                      </div>
                    )}
                    {faStatus === "skipped" && (
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 11, color: C.text3 }}>Skipped — will generate after project is created</span>
                        <button style={BTN("sm", { fontSize: 10 })} onClick={() => setFaStatus("idle")}>Undo</button>
                      </div>
                    )}
                  </div>

                  {/* Card B — Technical Document */}
                  <div style={{ background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 10, padding: 16, marginBottom: 14 }}>
                    <div style={{ marginBottom: 8 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 3 }}>Technical Document</div>
                      <div style={{ fontSize: 11, color: C.text2 }}>Architecture, tech stack, API contracts, DB schema — generated from your brief</div>
                    </div>
                    {tdStatus === "idle" && (
                      <div style={{ display: "flex", gap: 8 }}>
                        <button style={BTN("default", { fontSize: 11, padding: "6px 12px" })} onClick={() => setTdStatus("skipped")}>
                          Skip for now
                        </button>
                        <span style={{ fontSize: 10, color: C.text3, alignSelf: "center" }}>Available after project creation</span>
                      </div>
                    )}
                    {tdStatus === "skipped" && (
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 11, color: C.text3 }}>Skipped — generate from project page</span>
                        <button style={BTN("sm", { fontSize: 10 })} onClick={() => setTdStatus("idle")}>Undo</button>
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ padding: "12px 16px", borderTop: `1px solid ${C.border}`, display: "flex", gap: 9 }}>
                  <button style={BTN("default")} onClick={() => goPrev(2)}>← Back</button>
                  <button style={BTN("primary", { fontSize: 12, padding: "8px 16px" })} onClick={() => goNext(2)}>
                    Next: AI Structure →
                  </button>
                  <button style={{ ...BTN("sm"), marginLeft: "auto", fontSize: 11, color: C.text3 }} onClick={() => goNext(2)}>
                    Skip all documents →
                  </button>
                </div>
              </div>
            )}

            {/* ── STEP 3 — AI Structure ── */}
            {step === 3 && (
              <div style={CARD}>
                <div style={{ padding: "13px 16px", borderBottom: "1px solid #E5E2D9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>AI-generated structure</span>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <span style={{ fontSize: 11, color: C.text3 }}>step 3 of 5 · edit before proceeding</span>
                    {!generating && (
                      <button style={BTN("sm")} onClick={runGenerate}>Regenerate</button>
                    )}
                  </div>
                </div>
                <div style={{ padding: "16px 16px 4px" }}>

                  {generating ? (
                    <div style={{ padding: "40px 0", display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
                      <div style={{ width: 36, height: 36, borderRadius: "50%", border: "3px solid #E5E2D9", borderTopColor: "#006D6B", animation: "spin 0.8s linear infinite" }} />
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#18170F" }}>Guardian AI is analyzing your brief…</div>
                      <div style={{ fontSize: 11, color: "#9E9C93" }}>Generating phases, sprints and features</div>
                      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
                    </div>
                  ) : (
                    <>
                      {/* AI confirmation banner */}
                      <div style={{ background: C.guardianLight, border: `1px solid ${C.guardianBorder}`, borderRadius: 8, padding: 12, marginBottom: 16, display: "flex", gap: 8, alignItems: "flex-start" }}>
                        <div style={{ width: 7, height: 7, borderRadius: "50%", background: C.guardian, flexShrink: 0, marginTop: 4 }} />
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 700, color: C.guardian }}>Guardian AI has generated the structure</div>
                          <div style={{ fontSize: 11, color: C.guardian, marginTop: 2 }}>
                            {phases.length} phases · {phases.length * 2} sprints · {phases.length * 8} features · edit everything before proceeding
                          </div>
                        </div>
                      </div>

                      {/* Editable phase cards */}
                      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 14 }}>
                        {phases.map((ph, i) => (
                          <div key={i} style={{ background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 10, padding: 14, position: "relative" }}>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 10, marginBottom: 10 }}>
                              <input
                                style={{ ...FIELD_STYLE, fontSize: 12, fontWeight: 600 }}
                                value={ph.title}
                                onChange={e => updatePhase(i, "title", e.target.value)}
                                placeholder="Phase title"
                              />
                              <input
                                style={{ ...FIELD_STYLE, width: 100, fontSize: 11, textAlign: "center" }}
                                value={ph.duration}
                                onChange={e => updatePhase(i, "duration", e.target.value)}
                                placeholder="14 days"
                              />
                            </div>
                            <input
                              style={{ ...FIELD_STYLE, fontSize: 11 }}
                              value={ph.desc}
                              onChange={e => updatePhase(i, "desc", e.target.value)}
                              placeholder="Phase description…"
                            />
                            {phases.length > 1 && (
                              <button
                                onClick={() => removePhase(i)}
                                style={{ position: "absolute", top: 10, right: 10, background: "none", border: "none", color: "#DC2626", cursor: "pointer", fontSize: 13, padding: 2 }}
                              >
                                ✕
                              </button>
                            )}
                          </div>
                        ))}
                      </div>

                      <button
                        onClick={addPhase}
                        style={{ ...BTN("sm"), marginBottom: 14, fontSize: 11, color: "#006D6B", borderColor: "#A7F3D0", background: "#F0FDF4" }}
                      >
                        + Add phase
                      </button>
                    </>
                  )}
                </div>

                {!generating && (
                  <div style={{ padding: "12px 16px", borderTop: `1px solid ${C.border}`, display: "flex", gap: 9 }}>
                    <button style={BTN("default")} onClick={() => goPrev(3)}>← Back</button>
                    <button style={BTN("primary", { fontSize: 12, padding: "8px 16px" })} onClick={() => setStep(4)}>
                      Accept structure →
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* ── STEP 4 ── */}
            {step === 4 && (
              <div style={CARD}>
                <div style={{ padding: "13px 16px", borderBottom: "1px solid #E5E2D9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>Team & Budget</span>
                  <span style={{ fontSize: 11, color: C.text3 }}>step 4 of 5</span>
                </div>
                <div style={{ padding: "16px 16px 4px" }}>

                  {/* 2-column: team left + budget right */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>

                    {/* Team selector */}
                    <div>
                      <div style={{ marginBottom: 14 }}>
                        <label style={LABEL_STYLE}>Project Manager <span style={{ color: C.red }}>*</span></label>
                        <select style={FIELD_STYLE}>
                          <option>Laura Pinto</option><option>Marco Rossi</option><option>Giulia Ferri</option>
                        </select>
                      </div>
                      <div>
                        <label style={LABEL_STYLE}>Team members</label>
                        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                          {TEAM_OPTIONS.map(m => {
                            const on = team.includes(m);
                            return (
                              <button
                                key={m}
                                onClick={() => toggleTeam(m)}
                                style={{
                                  display: "flex", alignItems: "center", gap: 8,
                                  padding: "8px 12px", borderRadius: 8, cursor: "pointer",
                                  fontFamily: "inherit", fontSize: 12, fontWeight: 500,
                                  background: on ? "#18170F" : "#F8F7F3",
                                  color: on ? "#fff" : "#5C5A52",
                                  border: `1px solid ${on ? "#18170F" : "#E5E2D9"}`,
                                  transition: "all .12s", textAlign: "left",
                                }}
                              >
                                <span style={{ width: 22, height: 22, borderRadius: "50%", background: on ? "#fff" : "#E5E2D9", color: on ? "#18170F" : "#9E9C93", fontSize: 9, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                  {m.split("—")[0].trim()}
                                </span>
                                {m.split("—")[1]?.trim() ?? m}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Budget breakdown */}
                    <div>
                      <label style={LABEL_STYLE}>Budget breakdown</label>
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {[
                          { key: "dev",         label: "Development"  },
                          { key: "design",      label: "Design"       },
                          { key: "qa",          label: "QA / Testing" },
                          { key: "infra",       label: "Infrastructure"},
                          { key: "contingency", label: "Contingency"  },
                        ].map(({ key, label }) => (
                          <div key={key} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <label style={{ fontSize: 11, color: "#5C5A52", width: 100, flexShrink: 0 }}>{label}</label>
                            <input
                              type="number"
                              style={{ ...FIELD_STYLE, flex: 1, fontSize: 11 }}
                              value={(budgetBreakdown as any)[key]}
                              onChange={e => setBudgetBreakdown(b => ({ ...b, [key]: e.target.value }))}
                            />
                          </div>
                        ))}
                        <div style={{ display: "flex", alignItems: "center", gap: 8, paddingTop: 8, borderTop: "1px solid #E5E2D9" }}>
                          <label style={{ fontSize: 11, fontWeight: 700, color: "#18170F", width: 100, flexShrink: 0 }}>Total BAC</label>
                          <div style={{ flex: 1, background: "#F8F7F3", border: "1.5px solid #006D6B", borderRadius: 8, padding: "9px 12px", fontSize: 13, fontWeight: 700, color: "#006D6B", fontFamily: "'DM Mono', monospace" }}>
                            {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(budgetTotal)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Integrations */}
                  <div style={{ marginTop: 16, marginBottom: 14 }}>
                    <label style={LABEL_STYLE}>Integrations to activate</label>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {[["Jira", true],["GitHub", false],["Slack", false],["Linear", false]].map(([name, on]) => (
                        <button key={name as string} style={{ display: "inline-flex", alignItems: "center", background: on ? "#18170F" : C.surface2, border: `1px solid ${on ? "#18170F" : C.border}`, borderRadius: 20, padding: "4px 12px", fontSize: 11, fontWeight: 500, color: on ? "#fff" : C.text2, cursor: "pointer", fontFamily: "inherit" }}>{name}</button>
                      ))}
                    </div>
                  </div>
                </div>

                <div style={{ padding: "12px 16px", borderTop: `1px solid ${C.border}`, display: "flex", gap: 9 }}>
                  <button style={BTN("default")} onClick={() => goPrev(4)}>← Back</button>
                  <button style={BTN("primary", { fontSize: 12, padding: "8px 16px" })} onClick={() => setStep(5)}>Continue →</button>
                </div>
              </div>
            )}

            {/* ── STEP 5 ── */}
            {step === 5 && (
              <div style={CARD}>
                <div style={{ padding: "13px 16px", borderBottom: "1px solid #E5E2D9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>Summary & Confirm</span>
                  <span style={{ fontSize: 11, color: C.text3 }}>step 5 of 5 · check before saving</span>
                </div>
                <div style={{ padding: "16px 16px 4px" }}>

                  {/* Summary card */}
                  <div style={{ background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 10, padding: 16, marginBottom: 16 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#1D4ED8", marginBottom: 10 }}>Project summary</div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 12 }}>
                      {[
                        ["Name",        projName || "New Project"],
                        ["Period",      `${startDate.slice(0, 10)} → ${endDate.slice(0, 10)}`],
                        ["Budget",      budget || new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(budgetTotal)],
                        ["Phases",      String(phases.length || 3)],
                        ["Sprints",     String((phases.length || 3) * 2)],
                        ["Methodology", methodology],
                      ].map(([k, v]) => (
                        <div key={k}><span style={{ color: "#5C5A52" }}>{k}:</span> <strong style={{ color: "#18170F" }}>{v}</strong></div>
                      ))}
                    </div>
                  </div>

                  {/* Checklist */}
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#9E9C93", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 10 }}>
                      What gets created
                    </div>
                    {[
                      `${phases.length || 3} phases with timelines`,
                      `${(phases.length || 3) * 2} sprints auto-scheduled`,
                      `${(phases.length || 3) * 8} features generated by AI`,
                      "EVM monitoring active from day 1",
                      "Guardian AI health checks enabled",
                      `${team.length} team member${team.length !== 1 ? "s" : ""} assigned`,
                    ].map(item => (
                      <div key={item} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0", fontSize: 12, color: "#18170F" }}>
                        <span style={{ color: "#006D6B", fontWeight: 700, fontSize: 13 }}>✓</span>
                        {item}
                      </div>
                    ))}
                  </div>

                  {/* Notes */}
                  <div style={{ marginBottom: 14 }}>
                    <label style={LABEL_STYLE}>Additional notes (optional)</label>
                    <textarea style={{ ...FIELD_STYLE, minHeight: 70, resize: "vertical" }} placeholder="Any special notes or constraints…" />
                  </div>
                </div>

                <div style={{ padding: "12px 16px", borderTop: `1px solid ${C.border}`, display: "flex", gap: 9, alignItems: "center" }}>
                  <button style={BTN("default")} onClick={() => goPrev(5)}>← Back</button>
                  <button
                    style={{ padding: "10px 24px", background: creating ? "#9E9C93" : "#006D6B", color: "#fff", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: creating ? "not-allowed" : "pointer", fontFamily: "inherit", letterSpacing: "-.2px", opacity: creating ? 0.7 : 1 }}
                    onClick={create}
                    disabled={creating}
                  >
                    {creating ? "Creating…" : "🚀 Create Project"}
                  </button>
                </div>
                <GuardianBar text="will start automatic monitoring on save · EVM active from day 1" />
              </div>
            )}
          </div>

          {/* ── RIGHT COLUMN (sticky preview) ── */}
          <div>
            <PreviewPanel
              name={projName}
              startDate={startDate}
              endDate={endDate}
              budget={budget || (budgetTotal > 0 ? String(budgetTotal) : "")}
              methodology={methodology}
              step={step}
              phases={phases}
              team={team}
            />
          </div>
        </div>
      </div>

      <ToastContainer />
    </div>
  );
}
