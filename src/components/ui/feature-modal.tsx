"use client";
import { useState, useEffect } from "react";
import { useToast } from "./toast";

type Status   = "TODO" | "IN_PROGRESS" | "DONE" | "BLOCKED";
type Priority = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

interface Feature {
  id: string;
  title: string;
  status: Status;
  priority: Priority;
  module?: string;
  notes?: string;
  estimatedHours?: number;
  actualHours?: number;
}

interface FeatureModalProps {
  feature: Feature | null;
  onClose: () => void;
  onSave: (id: string, patch: Partial<Feature>) => Promise<void>;
  canEdit: boolean;
}

const STATUS_META: Record<Status, { label: string; color: string; bg: string }> = {
  TODO:        { label: "To Do",       color: "#5C5A52", bg: "#F8F7F3" },
  IN_PROGRESS: { label: "In Progress", color: "#2563EB", bg: "#EFF6FF" },
  DONE:        { label: "Done",        color: "#059669", bg: "#ECFDF5" },
  BLOCKED:     { label: "Blocked",     color: "#DC2626", bg: "#FEF2F2" },
};
const PRIORITY_META: Record<Priority, { label: string; color: string }> = {
  CRITICAL: { label: "Critical", color: "#DC2626" },
  HIGH:     { label: "High",     color: "#EA580C" },
  MEDIUM:   { label: "Medium",   color: "#D97706" },
  LOW:      { label: "Low",      color: "#059669" },
};

export function FeatureModal({ feature, onClose, onSave, canEdit }: FeatureModalProps) {
  const { toast } = useToast();
  const [title, setTitle]   = useState("");
  const [status, setStatus] = useState<Status>("TODO");
  const [priority, setPriority] = useState<Priority>("MEDIUM");
  const [notes, setNotes]   = useState("");
  const [estHours, setEst]  = useState(0);
  const [actHours, setAct]  = useState(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (feature) {
      setTitle(feature.title);
      setStatus(feature.status);
      setPriority(feature.priority);
      setNotes(feature.notes ?? "");
      setEst(feature.estimatedHours ?? 0);
      setAct(feature.actualHours ?? 0);
    }
  }, [feature]);

  if (!feature) return null;

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(feature.id, { title, status, priority, notes, estimatedHours: estHours, actualHours: actHours });
      toast("Feature updated", "success");
      onClose();
    } catch {
      toast("Failed to save feature", "error");
    } finally {
      setSaving(false);
    }
  };

  const sm = STATUS_META[status];
  const pm = PRIORITY_META[priority];

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 8000, background: "rgba(15,23,42,0.45)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
      onClick={onClose}
    >
      <div
        style={{ background: "#fff", borderRadius: 14, width: "100%", maxWidth: 540, boxShadow: "0 24px 64px rgba(0,0,0,0.18)", border: "1px solid #E5E2D9", overflow: "hidden" }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ padding: "18px 22px 14px", borderBottom: "1px solid #F4F2EC", display: "flex", alignItems: "flex-start", gap: 12 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#006D6B", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 6 }}>Feature Detail</div>
            {canEdit ? (
              <input
                value={title}
                onChange={e => setTitle(e.target.value)}
                style={{ fontSize: 16, fontWeight: 700, color: "#18170F", border: "none", outline: "none", width: "100%", fontFamily: "inherit", background: "transparent" }}
              />
            ) : (
              <h2 style={{ fontSize: 16, fontWeight: 700, color: "#18170F", margin: 0 }}>{title}</h2>
            )}
            {feature.module && (
              <span style={{ fontSize: 10, color: "#5C5A52", background: "#F4F2EC", padding: "2px 8px", borderRadius: 4, fontWeight: 600, marginTop: 6, display: "inline-block" }}>{feature.module}</span>
            )}
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#9E9C93", fontSize: 20, lineHeight: 1, padding: 0 }}>✕</button>
        </div>

        {/* Body */}
        <div style={{ padding: "18px 22px", display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Status + Priority row */}
          <div style={{ display: "flex", gap: 16 }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: "#9E9C93", display: "block", marginBottom: 6 }}>Status</label>
              {canEdit ? (
                <select
                  value={status}
                  onChange={e => setStatus(e.target.value as Status)}
                  style={{ width: "100%", padding: "8px 10px", border: "1.5px solid #E5E2D9", borderRadius: 8, fontSize: 13, fontFamily: "inherit", outline: "none", background: sm.bg, color: sm.color, fontWeight: 600 }}
                >
                  {Object.entries(STATUS_META).map(([v, m]) => <option key={v} value={v}>{m.label}</option>)}
                </select>
              ) : (
                <span style={{ fontSize: 13, fontWeight: 600, color: sm.color, background: sm.bg, padding: "6px 12px", borderRadius: 8, display: "inline-block" }}>{sm.label}</span>
              )}
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: "#9E9C93", display: "block", marginBottom: 6 }}>Priority</label>
              {canEdit ? (
                <select
                  value={priority}
                  onChange={e => setPriority(e.target.value as Priority)}
                  style={{ width: "100%", padding: "8px 10px", border: "1.5px solid #E5E2D9", borderRadius: 8, fontSize: 13, fontFamily: "inherit", outline: "none", color: pm.color, fontWeight: 600 }}
                >
                  {Object.entries(PRIORITY_META).map(([v, m]) => <option key={v} value={v}>{m.label}</option>)}
                </select>
              ) : (
                <span style={{ fontSize: 13, fontWeight: 700, color: pm.color }}>{pm.label}</span>
              )}
            </div>
          </div>

          {/* Hours */}
          <div style={{ display: "flex", gap: 16 }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: "#9E9C93", display: "block", marginBottom: 6 }}>Estimated Hours</label>
              {canEdit ? (
                <input type="number" min={0} value={estHours} onChange={e => setEst(Number(e.target.value))}
                  style={{ width: "100%", padding: "8px 10px", border: "1.5px solid #E5E2D9", borderRadius: 8, fontSize: 13, fontFamily: "inherit", outline: "none", boxSizing: "border-box" }} />
              ) : (
                <span style={{ fontSize: 13, color: "#18170F" }}>{estHours}h</span>
              )}
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: "#9E9C93", display: "block", marginBottom: 6 }}>Actual Hours</label>
              {canEdit ? (
                <input type="number" min={0} value={actHours} onChange={e => setAct(Number(e.target.value))}
                  style={{ width: "100%", padding: "8px 10px", border: "1.5px solid #E5E2D9", borderRadius: 8, fontSize: 13, fontFamily: "inherit", outline: "none", boxSizing: "border-box" }} />
              ) : (
                <span style={{ fontSize: 13, color: "#18170F" }}>{actHours}h</span>
              )}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: "#9E9C93", display: "block", marginBottom: 6 }}>Notes</label>
            {canEdit ? (
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={4}
                placeholder="Add notes, acceptance criteria, or comments…"
                style={{ width: "100%", padding: "10px 12px", border: "1.5px solid #E5E2D9", borderRadius: 8, fontSize: 13, fontFamily: "inherit", outline: "none", resize: "vertical", boxSizing: "border-box", color: "#18170F" }}
              />
            ) : (
              <p style={{ fontSize: 13, color: "#5C5A52", lineHeight: 1.6, background: "#F8F7F3", padding: "10px 12px", borderRadius: 8, border: "1px solid #E5E2D9" }}>
                {notes || <span style={{ color: "#CCC9BF" }}>No notes</span>}
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        {canEdit && (
          <div style={{ padding: "14px 22px", borderTop: "1px solid #F4F2EC", display: "flex", justifyContent: "flex-end", gap: 10 }}>
            <button onClick={onClose} style={{ padding: "8px 18px", fontSize: 13, border: "1.5px solid #E5E2D9", borderRadius: 8, background: "#fff", color: "#5C5A52", cursor: "pointer", fontFamily: "inherit" }}>
              Cancel
            </button>
            <button onClick={handleSave} disabled={saving} style={{ padding: "8px 22px", fontSize: 13, fontWeight: 600, border: "none", borderRadius: 8, background: "#006D6B", color: "#fff", cursor: saving ? "not-allowed" : "pointer", fontFamily: "inherit", opacity: saving ? 0.7 : 1 }}>
              {saving ? "Saving…" : "Save Changes"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
