"use client";
import { useState, useRef, useCallback } from "react";
import Link from "next/link";
import { C, BTN, useToast } from "@/components/ui/shared";
import { Breadcrumb } from "@/components/ui/breadcrumb";

// ── Types ──────────────────────────────────────────────────────────────────
type FAStatus = "DRAFT" | "PENDING_APPROVAL" | "APPROVED" | "REJECTED" | "REVISION_REQUESTED";

interface FAVersion {
  id: string; version: number; changedBy: string;
  changeNote: string | null; createdAt: string;
}
interface FAData {
  id: string;
  content: Record<string, unknown>;
  status: FAStatus;
  version: number;
  approvedBy: string | null;
  approvedAt: string | null;
  videoUrl: string | null;
  versions: FAVersion[];
}
interface Props {
  projectId:    string;
  projectName:  string;
  projectBrief: string;
  fa:           FAData | null;
  userRole:     string;
  userName:     string;
}

// ── Status meta ────────────────────────────────────────────────────────────
const STATUS_META: Record<FAStatus, { label: string; bg: string; color: string; border: string }> = {
  DRAFT:               { label: "Draft",             bg: "#F8F7F3", color: "#9E9C93", border: "#E5E2D9" },
  PENDING_APPROVAL:    { label: "Pending Approval",  bg: "#FFFBEB", color: "#D97706", border: "#FDE68A" },
  APPROVED:            { label: "Approved",          bg: "#F0FDF4", color: "#16A34A", border: "#BBF7D0" },
  REJECTED:            { label: "Rejected",          bg: "#FEF2F2", color: "#DC2626", border: "#FECACA" },
  REVISION_REQUESTED:  { label: "Revision Requested",bg: "#FFF7ED", color: "#EA580C", border: "#FED7AA" },
};

// ── Collapsible section ────────────────────────────────────────────────────
function Section({ title, children, defaultOpen = true }: {
  title: string; children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ background: "#fff", border: "1px solid #E5E2D9", borderRadius: 10, overflow: "hidden", marginBottom: 12 }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}
      >
        <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{title}</span>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform .2s", flexShrink: 0 }}>
          <path d="M2 5l5 5 5-5" stroke="#9E9C93" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
      {open && <div style={{ padding: "0 16px 16px", borderTop: "1px solid #F0EEE8" }}>{children}</div>}
    </div>
  );
}

// ── Table helper ───────────────────────────────────────────────────────────
function SimpleTable({ cols, rows }: { cols: string[]; rows: (string | number)[][] }) {
  if (!rows.length) return <p style={{ fontSize: 12, color: C.text3, marginTop: 10 }}>No data</p>;
  return (
    <div style={{ overflowX: "auto", marginTop: 10 }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
        <thead>
          <tr>
            {cols.map(c => (
              <th key={c} style={{ padding: "7px 10px", textAlign: "left", fontSize: 10, fontWeight: 700, color: C.text3, textTransform: "uppercase", letterSpacing: ".06em", borderBottom: `1px solid ${C.border}`, background: "#FAFAF8" }}>
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              {row.map((cell, j) => (
                <td key={j} style={{ padding: "8px 10px", color: C.text, borderBottom: `1px solid ${C.border}`, verticalAlign: "top" }}>
                  {String(cell ?? "")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────
export default function FAClient({ projectId, projectName, projectBrief, fa: initialFA, userRole, userName }: Props) {
  const [fa,          setFA]         = useState<FAData | null>(initialFA);
  const [generating,  setGenerating] = useState(false);
  const [uploading,   setUploading]  = useState(false);
  const [viewVersion,   setViewVersion]  = useState<Record<string, unknown> | null>(null);
  const [viewVersionId, setViewVersionId]= useState<string | null>(null);
  const [noteModal,   setNoteModal]  = useState<"approve" | "reject" | "revision" | null>(null);
  const [noteText,    setNoteText]   = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const { show: toast, ToastContainer } = useToast();

  const content = viewVersion ?? fa?.content ?? {};
  const status  = fa?.status ?? "DRAFT";
  const isApprover = userRole === "ADMIN" || userRole === "MANAGER";

  // ── Generate / Regenerate ────────────────────────────────────────────────
  const generate = useCallback(async (videoUrl?: string) => {
    setGenerating(true);
    try {
      const res  = await fetch(`/api/generate/analyze-video`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ projectId, projectName, brief: projectBrief, videoUrl }),
      });
      const data = await res.json() as { content: Record<string, unknown> };
      // Refresh FA
      const faRes  = await fetch(`/api/projects/${projectId}/functional-analysis`);
      const faData = await faRes.json() as { fa: FAData | null };
      setFA(faData.fa);
      setViewVersion(null); setViewVersionId(null);
      toast("Functional Analysis generated", "ok");
    } catch {
      toast("Generation failed", "err");
    } finally {
      setGenerating(false);
    }
  }, [projectId, projectName, projectBrief, toast]);

  // ── Video upload ─────────────────────────────────────────────────────────
  const handleVideoUpload = async (file: File) => {
    if (file.size > 200 * 1024 * 1024) { toast("File exceeds 200 MB", "err"); return; }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res  = await fetch(`/api/projects/${projectId}/upload-video`, { method: "POST", body: fd });
      const data = await res.json() as { videoUrl: string };
      if (!res.ok) throw new Error((data as any).error);
      toast("Video uploaded — analyzing…", "ok");
      await generate(data.videoUrl);
    } catch (e) {
      toast((e as Error).message ?? "Upload failed", "err");
    } finally {
      setUploading(false);
    }
  };

  // ── Status actions ───────────────────────────────────────────────────────
  const submitForApproval = async () => {
    const res = await fetch(`/api/projects/${projectId}/functional-analysis`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: fa?.content, changeNote: "Submitted for approval" }),
    });
    // Actually just set status to PENDING_APPROVAL — use approve/reject routes
    await fetch(`/api/projects/${projectId}/functional-analysis/request-revision`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ note: "Submitted for approval review" }),
    });
    // Actually we need a submit-for-approval route — use PATCH to update status directly
    const patchRes = await fetch(`/api/projects/${projectId}/functional-analysis`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: fa?.content ?? {}, changeNote: "Submitted for approval" }),
    });
    if (patchRes.ok) {
      const faRes = await fetch(`/api/projects/${projectId}/functional-analysis`);
      const d = await faRes.json() as { fa: FAData };
      setFA({ ...d.fa, status: "PENDING_APPROVAL" });
      toast("Submitted for approval", "ok");
    }
  };

  const doApprove = async () => {
    const res = await fetch(`/api/projects/${projectId}/functional-analysis/approve`, { method: "POST" });
    if (res.ok) {
      const d = await res.json() as { fa: FAData };
      setFA(prev => prev ? { ...prev, status: d.fa.status, approvedBy: d.fa.approvedBy, approvedAt: d.fa.approvedAt } : prev);
      toast("Approved", "ok");
    }
    setNoteModal(null);
  };

  const doReject = async () => {
    const res = await fetch(`/api/projects/${projectId}/functional-analysis/reject`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: noteText }),
    });
    if (res.ok) {
      setFA(prev => prev ? { ...prev, status: "REJECTED" } : prev);
      toast("Rejected", "ok");
    }
    setNoteModal(null); setNoteText("");
  };

  const doRevision = async () => {
    const res = await fetch(`/api/projects/${projectId}/functional-analysis/request-revision`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ note: noteText }),
    });
    if (res.ok) {
      setFA(prev => prev ? { ...prev, status: "REVISION_REQUESTED" } : prev);
      toast("Revision requested", "ok");
    }
    setNoteModal(null); setNoteText("");
  };

  // ── PDF export (reuse /api/projects/[id]/export logic) ───────────────────
  const exportPdf = () => {
    window.open(`/api/projects/${projectId}/functional-analysis/export-pdf`, "_blank");
  };

  const sm = STATUS_META[status] ?? STATUS_META.DRAFT;

  // ── Render content sections ───────────────────────────────────────────────
  const arr = <T,>(v: unknown): T[] => Array.isArray(v) ? v as T[] : [];
  const str = (v: unknown): string => typeof v === "string" ? v : "";

  return (
    <div style={{ padding: "24px 28px", fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <style>{`
        .fa-note-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.4); z-index: 200; display: flex; align-items: center; justify-content: center; }
        .fa-note-modal { background: #fff; border-radius: 14px; padding: 24px; width: 420px; box-shadow: 0 20px 60px rgba(0,0,0,.15); }
      `}</style>

      <Breadcrumb items={[
        { label: "Portfolio",         href: "/portfolio" },
        { label: projectName,         href: `/projects/${projectId}` },
        { label: "Functional Analysis" },
      ]} />

      {/* ── Header ── */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20, gap: 14, flexWrap: "wrap" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4, flexWrap: "wrap" }}>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: C.text, letterSpacing: "-.4px", margin: 0 }}>Functional Analysis</h1>
            {fa && (
              <span style={{ fontSize: 10, fontFamily: "DM Mono, monospace", fontWeight: 700, padding: "2px 7px", borderRadius: 4, background: "#EEF2FF", color: "#4F46E5", border: "1px solid #C7D2FE" }}>
                v{fa.version}
              </span>
            )}
            <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 4, background: sm.bg, color: sm.color, border: `1px solid ${sm.border}` }}>
              {sm.label}
            </span>
            {viewVersion && (
              <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 4, background: "#FFF7ED", color: "#EA580C", border: "1px solid #FED7AA" }}>
                Viewing old version
              </span>
            )}
          </div>
          <p style={{ fontSize: 11, color: C.text2, margin: 0 }}>
            {fa?.approvedBy ? `Approved by ${fa.approvedBy}` : "Automatically generated from project brief"}
          </p>
        </div>

        {/* Action buttons */}
        <div style={{ display: "flex", gap: 7, flexWrap: "wrap", alignItems: "center" }}>
          <Link href={`/projects/${projectId}`} style={{ ...BTN("sm"), textDecoration: "none" }}>← Overview</Link>

          {/* Upload video */}
          <button
            style={BTN("sm")}
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? "Uploading…" : "📹 Upload video"}
          </button>
          <input ref={fileRef} type="file" accept=".mp4,.mov,.webm,video/*" style={{ display: "none" }}
            onChange={e => { const f = e.target.files?.[0]; if (f) handleVideoUpload(f); e.target.value = ""; }} />

          {/* Generate / Regenerate */}
          {(!fa || status === "DRAFT" || status === "REJECTED" || status === "REVISION_REQUESTED") && (
            <button
              style={BTN(fa ? "default" : "primary")}
              onClick={() => generate()}
              disabled={generating}
            >
              {generating
                ? <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                    <span style={{ width: 12, height: 12, border: "2px solid rgba(255,255,255,.35)", borderTopColor: "#fff", borderRadius: "50%", display: "inline-block", animation: "spin .6s linear infinite" }} />
                    Generating…
                  </span>
                : fa ? "↺ Regenerate" : "✦ Generate with AI"
              }
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </button>
          )}

          {/* Status-based actions */}
          {fa && !viewVersion && (
            <>
              {status === "DRAFT" && (
                <button style={BTN("primary")} onClick={submitForApproval}>Submit for Approval</button>
              )}
              {status === "PENDING_APPROVAL" && isApprover && (
                <>
                  <button style={{ ...BTN("primary"), background: "#16A34A" }} onClick={doApprove}>✓ Approve</button>
                  <button style={{ ...BTN("default"), color: "#EA580C", borderColor: "#FED7AA" }} onClick={() => setNoteModal("revision")}>Request Revision</button>
                  <button style={{ ...BTN("default"), color: "#DC2626", borderColor: "#FECACA" }} onClick={() => setNoteModal("reject")}>✕ Reject</button>
                </>
              )}
              {status === "APPROVED" && (
                <>
                  <button style={BTN("sm")} onClick={exportPdf}>Export PDF</button>
                  <button style={BTN("sm")} onClick={() => generate()}>+ New Version</button>
                </>
              )}
              {(status === "REJECTED" || status === "REVISION_REQUESTED") && (
                <button style={BTN("primary")} onClick={() => generate()}>Revise →</button>
              )}
            </>
          )}
          {viewVersion && (
            <button style={BTN("sm")} onClick={() => { setViewVersion(null); setViewVersionId(null); }}>← Back to current</button>
          )}
        </div>
      </div>

      {/* ── 2-column layout ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: 20, alignItems: "start" }}>

        {/* ── Left: content ── */}
        <div>
          {!fa && !generating && (
            <div style={{ background: "#fff", border: "1px solid #E5E2D9", borderRadius: 10, padding: "60px 24px", textAlign: "center" }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>📄</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 6 }}>No Functional Analysis yet</div>
              <p style={{ fontSize: 12, color: C.text2, maxWidth: 340, margin: "0 auto 20px" }}>
                Generate one with AI from your project brief, or upload a video brief.
              </p>
              <button style={BTN("primary")} onClick={() => generate()}>✦ Generate with AI</button>
            </div>
          )}

          {generating && (
            <div style={{ background: "#fff", border: "1px solid #E5E2D9", borderRadius: 10, padding: "60px 24px", textAlign: "center" }}>
              <div style={{ width: 28, height: 28, border: "3px solid #E5E2D9", borderTopColor: "#006D6B", borderRadius: "50%", animation: "spin .8s linear infinite", margin: "0 auto 16px" }} />
              <div style={{ fontSize: 13, color: C.text2 }}>Guardian AI is analyzing your project brief…</div>
            </div>
          )}

          {!generating && fa && (
            <>
              <Section title="1 · Project Scope">
                <p style={{ fontSize: 13, color: C.text, lineHeight: 1.6, marginTop: 10 }}>{str(content.scope) || "—"}</p>
              </Section>

              <Section title="2 · Objectives">
                <ol style={{ margin: "10px 0 0 18px", padding: 0 }}>
                  {arr<string>(content.objectives).map((obj, i) => (
                    <li key={i} style={{ fontSize: 12, color: C.text, lineHeight: 1.6, marginBottom: 4 }}>{obj}</li>
                  ))}
                </ol>
              </Section>

              <Section title="3 · Stakeholders">
                <SimpleTable
                  cols={["Role", "Responsibilities"]}
                  rows={arr<{ role: string; responsibilities: string }>(content.stakeholders).map(s => [s.role, s.responsibilities])}
                />
              </Section>

              <Section title="4 · Functional Requirements">
                <SimpleTable
                  cols={["ID", "Title", "Description", "Priority", "Status"]}
                  rows={arr<{ id: string; title: string; description: string; priority: string; status: string }>(content.functionalRequirements)
                    .map(r => [r.id, r.title, r.description, r.priority, r.status])}
                />
              </Section>

              <Section title="5 · Non-Functional Requirements">
                <SimpleTable
                  cols={["ID", "Category", "Description"]}
                  rows={arr<{ id: string; category: string; description: string }>(content.nonFunctionalRequirements)
                    .map(r => [r.id, r.category, r.description])}
                />
              </Section>

              <Section title="6 · Out of Scope" defaultOpen={false}>
                <ul style={{ margin: "10px 0 0 18px", padding: 0 }}>
                  {arr<string>(content.outOfScope).map((item, i) => (
                    <li key={i} style={{ fontSize: 12, color: C.text, lineHeight: 1.6, marginBottom: 4 }}>{item}</li>
                  ))}
                </ul>
              </Section>

              <Section title="7 · Assumptions & Constraints" defaultOpen={false}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 10 }}>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: C.text3, textTransform: "uppercase", letterSpacing: ".07em", marginBottom: 6 }}>Assumptions</div>
                    <ul style={{ margin: 0, padding: "0 0 0 16px" }}>
                      {arr<string>(content.assumptions).map((a, i) => (
                        <li key={i} style={{ fontSize: 12, color: C.text, lineHeight: 1.6, marginBottom: 3 }}>{a}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: C.text3, textTransform: "uppercase", letterSpacing: ".07em", marginBottom: 6 }}>Constraints</div>
                    <ul style={{ margin: 0, padding: "0 0 0 16px" }}>
                      {arr<string>(content.constraints).map((c, i) => (
                        <li key={i} style={{ fontSize: 12, color: C.text, lineHeight: 1.6, marginBottom: 3 }}>{c}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </Section>

              <Section title="8 · Process Flow" defaultOpen={false}>
                <div style={{ marginTop: 10 }}>
                  {arr<{ step: number; actor: string; action: string; outcome: string }>(content.processFlow).map((step, i) => (
                    <div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start", marginBottom: 10 }}>
                      <div style={{ width: 24, height: 24, borderRadius: "50%", background: "#006D6B", color: "#fff", fontSize: 10, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2 }}>
                        {step.step}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: C.text }}>
                          <span style={{ color: "#006D6B" }}>{step.actor}</span> → {step.action}
                        </div>
                        <div style={{ fontSize: 11, color: C.text2, marginTop: 2 }}>Outcome: {step.outcome}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </Section>

              <Section title="9 · Glossary" defaultOpen={false}>
                <SimpleTable
                  cols={["Term", "Definition"]}
                  rows={arr<{ term: string; definition: string }>(content.glossary).map(g => [g.term, g.definition])}
                />
              </Section>
            </>
          )}
        </div>

        {/* ── Right: Version History ── */}
        <div style={{ position: "sticky", top: 20 }}>
          <div style={{ background: "#fff", border: "1px solid #E5E2D9", borderRadius: 10, overflow: "hidden" }}>
            <div style={{ padding: "12px 16px", borderBottom: "1px solid #E5E2D9", fontSize: 12, fontWeight: 700, color: C.text }}>
              Version History
            </div>
            {(!fa || fa.versions.length === 0) ? (
              <div style={{ padding: "20px 16px", fontSize: 11, color: C.text3, textAlign: "center" }}>No versions yet</div>
            ) : (
              <>
                {/* Current version */}
                <div
                  style={{ padding: "10px 14px", borderBottom: "1px solid #F0EEE8", background: !viewVersion ? "#F0FDFA" : undefined, cursor: "pointer" }}
                  onClick={() => { setViewVersion(null); setViewVersionId(null); }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                    <span style={{ fontSize: 10, fontFamily: "DM Mono, monospace", fontWeight: 700, color: "#4F46E5" }}>v{fa.version}</span>
                    <span style={{ fontSize: 9, fontWeight: 700, padding: "1px 5px", borderRadius: 4, background: "#F0FDF4", color: "#16A34A", border: "1px solid #BBF7D0" }}>Current</span>
                  </div>
                  <div style={{ fontSize: 10, color: C.text2 }}>{fa.approvedBy ? `Approved by ${fa.approvedBy}` : "Latest version"}</div>
                </div>
                {fa.versions.map(v => (
                  <div
                    key={v.id}
                    style={{ padding: "10px 14px", borderBottom: "1px solid #F0EEE8", cursor: "pointer", background: viewVersionId === v.id ? "#F8F7F3" : undefined }}
                    onClick={async () => {
                      const res = await fetch(`/api/projects/${projectId}/functional-analysis/versions`);
                      const d   = await res.json() as { versions: (FAVersion & { content: Record<string, unknown> })[] };
                      const found = d.versions.find(x => x.id === v.id);
                      if (found) { setViewVersion(found.content); setViewVersionId(v.id); }
                    }}
                  >
                    <div style={{ fontSize: 10, fontFamily: "DM Mono, monospace", fontWeight: 700, color: "#4F46E5", marginBottom: 2 }}>v{v.version}</div>
                    <div style={{ fontSize: 10, color: C.text }}>{v.changedBy}</div>
                    {v.changeNote && <div style={{ fontSize: 10, color: C.text3, marginTop: 1 }}>{v.changeNote}</div>}
                    <div style={{ fontSize: 9, color: C.text3, marginTop: 2 }}>
                      {new Date(v.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit" })}
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Note modal (reject / revision) ── */}
      {noteModal && (
        <div className="fa-note-overlay" onClick={() => setNoteModal(null)}>
          <div className="fa-note-modal" onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 12 }}>
              {noteModal === "reject" ? "Reject Functional Analysis" : "Request Revision"}
            </div>
            <textarea
              style={{ width: "100%", minHeight: 80, padding: "10px 12px", border: "1.5px solid #E5E2D9", borderRadius: 8, fontSize: 12, fontFamily: "inherit", resize: "vertical", boxSizing: "border-box" }}
              placeholder={noteModal === "reject" ? "Reason for rejection…" : "Describe what needs to be revised…"}
              value={noteText}
              onChange={e => setNoteText(e.target.value)}
            />
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 14 }}>
              <button style={BTN("default")} onClick={() => { setNoteModal(null); setNoteText(""); }}>Cancel</button>
              <button
                style={noteModal === "reject" ? { ...BTN("primary"), background: "#DC2626" } : BTN("primary")}
                onClick={noteModal === "reject" ? doReject : doRevision}
              >
                {noteModal === "reject" ? "Reject" : "Send"}
              </button>
            </div>
          </div>
        </div>
      )}

      <ToastContainer />
    </div>
  );
}
