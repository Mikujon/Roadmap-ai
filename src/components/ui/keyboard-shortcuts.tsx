"use client";
import { useState, useEffect, useRef } from "react";

const SHORTCUTS = [
  { category: "Navigation", items: [
    { keys: ["G", "D"], desc: "Go to Dashboard" },
    { keys: ["G", "P"], desc: "Go to Portfolio" },
    { keys: ["G", "C"], desc: "Go to Costs" },
    { keys: ["G", "A"], desc: "Go to Archive" },
    { keys: ["G", "S"], desc: "Go to Settings" },
  ]},
  { category: "Search & Actions", items: [
    { keys: ["⌘", "K"], desc: "Open global search" },
    { keys: ["?"], desc: "Show keyboard shortcuts" },
    { keys: ["Esc"], desc: "Close modal / dismiss" },
  ]},
  { category: "Project Board", items: [
    { keys: ["B"], desc: "Switch to Board view" },
    { keys: ["K"], desc: "Switch to Kanban view" },
    { keys: ["C"], desc: "Switch to Calendar view" },
    { keys: ["F"], desc: "Focus search / filter" },
  ]},
  { category: "Roles", items: [
    { keys: ["1"], desc: "Switch to PMO view" },
    { keys: ["2"], desc: "Switch to CEO view" },
    { keys: ["3"], desc: "Switch to Stakeholder view" },
    { keys: ["4"], desc: "Switch to Dev view" },
  ]},
];

function Kbd({ children }: { children: string }) {
  return (
    <kbd style={{
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      minWidth: 22, height: 22, padding: "0 6px",
      background: "#F8F7F3", border: "1px solid #E5E2D9",
      borderBottom: "2px solid #CCC9BF", borderRadius: 5,
      fontSize: 11, fontWeight: 700, color: "#5C5A52",
      fontFamily: "'DM Mono', monospace",
    }}>{children}</kbd>
  );
}

export function KeyboardShortcutsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  // Focus trap
  useEffect(() => {
    if (!open || !ref.current) return;
    const el = ref.current;
    const focusable = el.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    const first = focusable[0];
    const last  = focusable[focusable.length - 1];
    first?.focus();
    const trap = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      if (e.shiftKey) { if (document.activeElement === first) { e.preventDefault(); last?.focus(); } }
      else            { if (document.activeElement === last)  { e.preventDefault(); first?.focus(); } }
    };
    el.addEventListener("keydown", trap);
    return () => el.removeEventListener("keydown", trap);
  }, [open]);

  if (!open) return null;

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 9000, background: "rgba(15,23,42,0.45)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
      onClick={onClose}
    >
      <div
        ref={ref}
        style={{ background: "#fff", borderRadius: 16, width: "100%", maxWidth: 580, boxShadow: "0 24px 64px rgba(0,0,0,0.18)", border: "1px solid #E5E2D9", overflow: "hidden", maxHeight: "85vh", display: "flex", flexDirection: "column" }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ padding: "18px 22px 14px", borderBottom: "1px solid #F4F2EC", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#006D6B", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 3 }}>Help</div>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: "#18170F", margin: 0 }}>Keyboard Shortcuts</h2>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#9E9C93", fontSize: 20, lineHeight: 1, padding: 4 }}>✕</button>
        </div>

        {/* Body */}
        <div style={{ padding: "20px 22px", overflowY: "auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          {SHORTCUTS.map(section => (
            <div key={section.category}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#9E9C93", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>{section.category}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {section.items.map((item, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                    <span style={{ fontSize: 12, color: "#5C5A52" }}>{item.desc}</span>
                    <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                      {item.keys.map((k, j) => (
                        <Kbd key={j}>{k}</Kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{ padding: "12px 22px", borderTop: "1px solid #F4F2EC", background: "#F8F7F3", display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          <Kbd>?</Kbd>
          <span style={{ fontSize: 11, color: "#9E9C93" }}>Press <strong style={{ color: "#5C5A52" }}>?</strong> anywhere to toggle this panel</span>
        </div>
      </div>
    </div>
  );
}
