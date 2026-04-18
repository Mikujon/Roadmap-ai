"use client";
import { useState, useRef } from "react";
import Link from "next/link";
import { C, BTN, useToast } from "@/components/ui/shared";
import { Breadcrumb } from "@/components/ui/breadcrumb";

// ── Types ──────────────────────────────────────────────────────────────────
type DocType =
  | "PROJECT_CHARTER"
  | "FUNCTIONAL_ANALYSIS"
  | "RISK_REGISTER"
  | "RACI_MATRIX"
  | "CLOSURE_REPORT"
  | "MEETING_NOTES"
  | "CUSTOM";

interface DocItem {
  id:        string;
  type:      string;
  title:     string;
  version:   number;
  status:    string;
  createdBy: string;
  fileUrl:   string | null;
  createdAt: string;
  updatedAt: string;
}

interface Props {
  projectId:        string;
  projectName:      string;
  userRole:         string;
  userName:         string;
  initialDocuments: DocItem[];
}

// ── Metadata ──────────────────────────────────────────────────────────────
const TYPE_META: Record<string, { label: string; bg: string; color: string; border: string }> = {
  PROJECT_CHARTER:     { label: "Project Charter",    bg: "#EFF6FF", color: "#2563EB", border: "#BFDBFE" },
  FUNCTIONAL_ANALYSIS: { label: "Functional Analysis",bg: "#F5F3FF", color: "#7C3AED", border: "#DDD6FE" },
  RISK_REGISTER:       { label: "Risk Register",      bg: "#FEF2F2", color: "#DC2626", border: "#FECACA" },
  RACI_MATRIX:         { label: "RACI Matrix",        bg: "#F0FDFA", color: "#006D6B", border: "#99F6E4" },
  CLOSURE_REPORT:      { label: "Closure Report",     bg: "#F8F7F3", color: "#9E9C93", border: "#E5E2D9" },
  MEETING_NOTES:       { label: "Meeting Notes",      bg: "#FFFBEB", color: "#D97706", border: "#FDE68A" },
  CUSTOM:              { label: "Custom",             bg: "#F0FDF4", color: "#16A34A", border: "#BBF7D0" },
};

const STATUS_META: Record<string, { label: string; color: string }> = {
  DRAFT:     { label: "Draft",     color: "#9E9C93" },
  REVIEW:    { label: "In Review", color: "#D97706" },
  APPROVED:  { label: "Approved",  color: "#16A34A" },
  ARCHIVED:  { label: "Archived",  color: "#9E9C93" },
};

const DOC_TYPE_OPTIONS: { value: DocType; label: string }[] = [
  { value: "PROJECT_CHARTER",     label: "Project Charter"     },
  { value: "FUNCTIONAL_ANALYSIS", label: "Functional Analysis" },
  { value: "RISK_REGISTER",       label: "Risk Register"       },
  { value: "RACI_MATRIX",         label: "RACI Matrix"         },
  { value: "CLOSURE_REPORT",      label: "Closure Report"      },
  { value: "MEETING_NOTES",       label: "Meeting Notes"       },
  { value: "CUSTOM",              label: "Custom"              },
];

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit" });
}

// ── New Document Modal ────────────────────────────────────────────────────
function NewDocModal({
  onClose, onCreate,
}: {
  onClose:  () => void;
  onCreate: (type: DocType, title: string) => Promise<void>;
}) {
  const [type,    setType]    = useState<DocType>("PROJECT_CHARTER");
  const [title,   setTitle]   = useState("");
  const [saving,  setSaving]  = useState(false);

  const submit = async () => {
    if (!title.trim()) return;
    setSaving(true);
    await onCreate(type, title.trim());
    setSaving(false);
  };

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "9px 12px", border: "1.5px solid #E5E2D9",
    borderRadius: 8, fontSize: 13, fontFamily: "inherit", outline: "none",
    color: C.text, boxSizing: "border-box",
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.4)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "#fff", borderRadius: 14, padding: 24, width: 420, boxShadow: "0 20px 60px rgba(0,0,0,.15)" }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, color: C.text, margin: "0 0 18px" }}>New Document</h3>

        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 10, fontWeight: 700, color: C.text3, textTransform: "uppercase", letterSpacing: ".07em", display: "block", marginBottom: 5 }}>
            Document Type
          </label>
          <select value={type} onChange={e => setType(e.target.value as DocType)} style={inputStyle}>
            {DOC_TYPE_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 10, fontWeight: 700, color: C.text3, textTransform: "uppercase", letterSpacing: ".07em", display: "block", marginBottom: 5 }}>
            Title
          </label>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            onKeyDown={e => e.key === "Enter" && submit()}
            placeholder="e.g. Project Charter v1"
            style={inputStyle}
            autoFocus
          />
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button style={BTN("sm")} onClick={onClose}>Cancel</button>
          <button style={{ ...BTN("primary"), opacity: !title.trim() || saving ? 0.6 : 1 }} onClick={submit} disabled={!title.trim() || saving}>
            {saving ? "Creating…" : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Upload Modal ──────────────────────────────────────────────────────────
function UploadModal({
  doc, onClose, onUploaded,
}: {
  doc:        DocItem;
  onClose:    () => void;
  onUploaded: (docId: string, fileUrl: string) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [err,       setErr]       = useState("");

  const handleFile = async (file: File) => {
    setUploading(true); setErr("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("docId", doc.id);
      const res = await fetch(`/api/projects/${doc.id}/documents/upload`, { method: "POST", body: fd });
      const data = await res.json() as { fileUrl?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Upload failed");
      onUploaded(doc.id, data.fileUrl!);
      onClose();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.4)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "#fff", borderRadius: 14, padding: 24, width: 380, boxShadow: "0 20px 60px rgba(0,0,0,.15)" }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, color: C.text, margin: "0 0 6px" }}>Upload File</h3>
        <p style={{ fontSize: 12, color: C.text2, margin: "0 0 18px" }}>Attach a file to "{doc.title}"</p>

        <div
          style={{ border: "2px dashed #E5E2D9", borderRadius: 10, padding: "28px 16px", textAlign: "center", cursor: "pointer", marginBottom: 16 }}
          onClick={() => fileRef.current?.click()}
        >
          <div style={{ fontSize: 24, marginBottom: 8 }}>📎</div>
          <div style={{ fontSize: 12, color: C.text2 }}>
            {uploading ? "Uploading…" : "Click to select a file (PDF, DOCX, XLSX, etc.)"}
          </div>
          <input ref={fileRef} type="file" style={{ display: "none" }} onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
        </div>

        {err && <p style={{ fontSize: 11, color: "#DC2626", marginBottom: 12 }}>{err}</p>}

        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button style={BTN("sm")} onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────
export default function DocumentsClient({
  projectId, projectName, userRole, userName, initialDocuments,
}: Props) {
  const [docs,       setDocs]       = useState<DocItem[]>(initialDocuments);
  const [showNew,    setShowNew]    = useState(false);
  const [uploadDoc,  setUploadDoc]  = useState<DocItem | null>(null);
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const { show: toast, ToastContainer } = useToast();

  const canEdit = userRole !== "VIEWER";

  const createDoc = async (type: DocType, title: string) => {
    const res  = await fetch(`/api/projects/${projectId}/documents`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ type, title }),
    });
    const data = await res.json() as { document: any };
    if (!res.ok) { toast("Failed to create document", "err"); return; }
    const d = data.document;
    setDocs(prev => [{
      id: d.id, type: d.type, title: d.title, version: d.version,
      status: d.status, createdBy: d.createdBy, fileUrl: d.fileUrl ?? null,
      createdAt: d.createdAt, updatedAt: d.updatedAt,
    }, ...prev]);
    toast("Document created", "ok");
    setShowNew(false);
  };

  const deleteDoc = async (docId: string) => {
    if (!window.confirm("Delete this document?")) return;
    await fetch(`/api/projects/${projectId}/documents/${docId}`, { method: "DELETE" });
    setDocs(prev => prev.filter(d => d.id !== docId));
    toast("Document deleted", "ok");
  };

  const allTypes = ["ALL", ...Object.keys(TYPE_META)];
  const filtered = typeFilter === "ALL" ? docs : docs.filter(d => d.type === typeFilter);

  return (
    <div style={{ padding: "24px 28px", fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <ToastContainer />

      {showNew && (
        <NewDocModal
          onClose={() => setShowNew(false)}
          onCreate={createDoc}
        />
      )}

      {uploadDoc && (
        <UploadModal
          doc={uploadDoc}
          onClose={() => setUploadDoc(null)}
          onUploaded={(id, fileUrl) => {
            setDocs(prev => prev.map(d => d.id === id ? { ...d, fileUrl } : d));
            toast("File uploaded", "ok");
          }}
        />
      )}

      <Breadcrumb items={[
        { label: "Portfolio",  href: "/portfolio" },
        { label: projectName,  href: `/projects/${projectId}` },
        { label: "Documents" },
      ]} />

      {/* ── Header ── */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20, gap: 14, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: C.text, letterSpacing: "-.4px", margin: 0, marginBottom: 4 }}>Documents</h1>
          <p style={{ fontSize: 11, color: C.text2, margin: 0 }}>
            {docs.length} document{docs.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <Link href={`/projects/${projectId}`} style={{ ...BTN("sm"), textDecoration: "none" }}>← Overview</Link>
          <Link href={`/projects/${projectId}/functional-analysis`} style={{ ...BTN("sm"), textDecoration: "none" }}>Functional Analysis</Link>
          {canEdit && (
            <button style={BTN("primary")} onClick={() => setShowNew(true)}>+ New Document</button>
          )}
        </div>
      </div>

      {/* ── Type filter chips ── */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 18 }}>
        {allTypes.map(t => {
          const active = typeFilter === t;
          const meta   = TYPE_META[t];
          return (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              style={{
                padding: "4px 12px", borderRadius: 20, fontSize: 11, fontWeight: 600,
                cursor: "pointer", fontFamily: "inherit", transition: "all .15s",
                border: active ? `1.5px solid ${meta?.border ?? C.teal}` : `1px solid ${C.border}`,
                background: active ? (meta?.bg ?? C.tealBg) : "#fff",
                color: active ? (meta?.color ?? C.teal) : C.text2,
              }}
            >
              {t === "ALL" ? "All types" : (meta?.label ?? t)}
              {t !== "ALL" && (
                <span style={{ marginLeft: 5, fontSize: 10, color: C.text3 }}>
                  {docs.filter(d => d.type === t).length}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Table ── */}
      <div style={{ background: "#fff", border: "1px solid #E5E2D9", borderRadius: 12, overflow: "hidden" }}>
        {/* Table header */}
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 60px 90px 110px 110px 100px", gap: 0, padding: "9px 16px", background: "#FAFAF8", borderBottom: "1px solid #E5E2D9" }}>
          {["Title", "Type", "Ver.", "Status", "Updated", "Created by", ""].map(h => (
            <div key={h} style={{ fontSize: 10, fontWeight: 700, color: C.text3, textTransform: "uppercase", letterSpacing: ".06em" }}>{h}</div>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div style={{ padding: "48px 24px", textAlign: "center" }}>
            <div style={{ fontSize: 28, marginBottom: 10 }}>📁</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 6 }}>No documents yet</div>
            <p style={{ fontSize: 12, color: C.text2, maxWidth: 320, margin: "0 auto 18px" }}>
              Create project documents like charters, risk registers, RACI matrices and more.
            </p>
            {canEdit && (
              <button style={BTN("primary")} onClick={() => setShowNew(true)}>+ New Document</button>
            )}
          </div>
        ) : (
          filtered.map((doc, idx) => {
            const tm = TYPE_META[doc.type] ?? TYPE_META.CUSTOM;
            const sm = STATUS_META[doc.status] ?? STATUS_META.DRAFT;
            return (
              <div
                key={doc.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "2fr 1fr 60px 90px 110px 110px 100px",
                  gap: 0,
                  padding: "12px 16px",
                  borderBottom: idx < filtered.length - 1 ? "1px solid #F0EEE8" : "none",
                  alignItems: "center",
                }}
              >
                {/* Title */}
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{doc.title}</div>
                  {doc.fileUrl && (
                    <div style={{ fontSize: 10, color: C.teal, marginTop: 2 }}>📎 File attached</div>
                  )}
                </div>

                {/* Type badge */}
                <div>
                  <span style={{
                    display: "inline-block", padding: "2px 8px", borderRadius: 4,
                    fontSize: 10, fontWeight: 700,
                    background: tm.bg, color: tm.color, border: `1px solid ${tm.border}`,
                  }}>
                    {tm.label}
                  </span>
                </div>

                {/* Version */}
                <div style={{ fontSize: 11, color: C.text2, fontFamily: "'DM Mono', monospace" }}>
                  v{doc.version}
                </div>

                {/* Status */}
                <div>
                  <span style={{ fontSize: 11, fontWeight: 600, color: sm.color }}>{sm.label}</span>
                </div>

                {/* Updated */}
                <div style={{ fontSize: 11, color: C.text2 }}>{fmtDate(doc.updatedAt)}</div>

                {/* Created by */}
                <div style={{ fontSize: 11, color: C.text2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {doc.createdBy}
                </div>

                {/* Actions */}
                <div style={{ display: "flex", gap: 5, justifyContent: "flex-end" }}>
                  {doc.fileUrl ? (
                    <a
                      href={doc.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ ...BTN("sm"), textDecoration: "none", fontSize: 10, padding: "4px 10px" }}
                    >
                      Download
                    </a>
                  ) : canEdit ? (
                    <button
                      style={{ ...BTN("sm"), fontSize: 10, padding: "4px 10px" }}
                      onClick={() => setUploadDoc(doc)}
                    >
                      Upload
                    </button>
                  ) : null}
                  {canEdit && (
                    <button
                      style={{ ...BTN("sm"), fontSize: 10, padding: "4px 10px", color: "#DC2626", borderColor: "#FECACA" }}
                      onClick={() => deleteDoc(doc.id)}
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer count */}
      {filtered.length > 0 && (
        <div style={{ marginTop: 10, fontSize: 11, color: C.text3, textAlign: "right" }}>
          {filtered.length} of {docs.length} document{docs.length !== 1 ? "s" : ""}
        </div>
      )}
    </div>
  );
}
