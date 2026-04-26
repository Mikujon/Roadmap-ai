"use client";
import { useState, useRef, useEffect, useCallback } from "react";

interface Message {
  role:    "user" | "assistant";
  content: string;
  actions: { tool: string; summary: string }[];
}

interface Props {
  open:      boolean;
  onClose:   () => void;
  projectId?: string;
}

const SUGGESTIONS = [
  "Which projects are at risk?",
  "Show me all critical alerts",
  "What is the health of my portfolio?",
  "Show me all open risks",
];

const TOOL_LABELS: Record<string, string> = {
  get_projects:          "Projects fetched",
  get_project_detail:    "Project details fetched",
  create_risk:           "Risk created",
  update_feature_status: "Task status updated",
  create_feature:        "Task created",
  update_project_status: "Project status updated",
  get_alerts:            "Alerts fetched",
  run_guardian_analysis: "Guardian analysis triggered",
};

export function AIChatPanel({ open, onClose, projectId }: Props) {
  const [messages, setMessages]   = useState<Message[]>([]);
  const [input, setInput]         = useState("");
  const [loading, setLoading]     = useState(false);
  const bottomRef                 = useRef<HTMLDivElement>(null);
  const textareaRef               = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open) textareaRef.current?.focus();
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // ESC to close
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, onClose]);

  const send = useCallback(async (text: string) => {
    if (!text.trim() || loading) return;
    setInput("");
    setMessages(m => [...m, { role: "user", content: text, actions: [] }]);
    setLoading(true);

    try {
      const res  = await fetch("/api/v1/ai/chat", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ message: text, projectId }),
      });
      const data = await res.json();

      setMessages(m => [...m, {
        role:    "assistant",
        content: res.ok ? (data.message || "Done.") : (data.error ?? "Something went wrong."),
        actions: res.ok ? (data.actionsPerformed ?? []) : [],
      }]);
    } catch {
      setMessages(m => [...m, { role: "assistant", content: "Connection error. Please try again.", actions: [] }]);
    } finally {
      setLoading(false);
    }
  }, [loading, projectId]);

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  };

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)", zIndex: 200 }}
          onClick={onClose}
        />
      )}

      {/* Panel */}
      <div style={{
        position:   "fixed", top: 0, right: 0,
        width:      420, height: "100vh",
        background: "#fff",
        boxShadow:  "-8px 0 40px rgba(0,0,0,0.14)",
        zIndex:     201,
        display:    "flex", flexDirection: "column",
        transform:  open ? "translateX(0)" : "translateX(100%)",
        transition: "transform 240ms cubic-bezier(.4,0,.2,1)",
        fontFamily: "'DM Sans', system-ui, sans-serif",
      }}>

        {/* Header */}
        <div style={{ padding: "14px 16px", borderBottom: "1px solid #E5E2D9", display: "flex", alignItems: "center", gap: 10, flexShrink: 0, background: "#FDFCFA" }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: "linear-gradient(135deg,#006D6B,#0891B2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0 }}>
            ✦
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#18170F", letterSpacing: "-.3px" }}>Guardian AI</div>
            <div style={{ fontSize: 10, color: "#9E9C93" }}>Ask anything about your projects</div>
          </div>
          {messages.length > 0 && (
            <button
              onClick={() => setMessages([])}
              style={{ fontSize: 10, color: "#9E9C93", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", padding: "2px 6px" }}
            >
              Clear
            </button>
          )}
          <button
            onClick={onClose}
            style={{ width: 28, height: 28, border: "1px solid #E5E2D9", borderRadius: 6, background: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#9E9C93", fontSize: 14, flexShrink: 0 }}
          >
            ✕
          </button>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: "auto", padding: "12px 14px", display: "flex", flexDirection: "column", gap: 12 }}>

          {messages.length === 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8, paddingTop: 12 }}>
              <div style={{ fontSize: 11, color: "#9E9C93", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".07em", marginBottom: 4 }}>Suggestions</div>
              {SUGGESTIONS.map(s => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  style={{
                    textAlign: "left", padding: "9px 12px",
                    background: "#F8F7F3", border: "1px solid #E5E2D9",
                    borderRadius: 8, fontSize: 12, color: "#5C5A52",
                    cursor: "pointer", fontFamily: "inherit",
                    transition: "background .1s, border-color .1s",
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "#F0EEE8"; (e.currentTarget as HTMLButtonElement).style.borderColor = "#CCC9BF"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "#F8F7F3"; (e.currentTarget as HTMLButtonElement).style.borderColor = "#E5E2D9"; }}
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: msg.role === "user" ? "flex-end" : "flex-start", gap: 4 }}>
              <div style={{
                maxWidth: "88%",
                padding: "9px 12px",
                borderRadius: msg.role === "user" ? "12px 12px 3px 12px" : "3px 12px 12px 12px",
                background:   msg.role === "user" ? "#18170F" : "#F8F7F3",
                borderLeft:   msg.role === "assistant" ? "3px solid #006D6B" : undefined,
                fontSize: 13, color: msg.role === "user" ? "#fff" : "#18170F",
                lineHeight: 1.55, whiteSpace: "pre-wrap",
              }}>
                {msg.content}
              </div>

              {/* Action chips */}
              {msg.actions.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4, maxWidth: "88%" }}>
                  {msg.actions.map((a, j) => (
                    <span key={j} style={{
                      fontSize: 10, fontWeight: 600, padding: "2px 7px",
                      background: "#ECFDF5", color: "#059669",
                      border: "1px solid #A7F3D0", borderRadius: 20,
                    }}>
                      ✓ {TOOL_LABELS[a.tool] ?? a.tool}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div style={{ display: "flex", alignItems: "flex-start", gap: 6 }}>
              <div style={{
                padding: "9px 12px", background: "#F8F7F3",
                borderLeft: "3px solid #006D6B",
                borderRadius: "3px 12px 12px 12px",
                fontSize: 13, color: "#9E9C93",
              }}>
                <span style={{ display: "inline-flex", gap: 3 }}>
                  <span style={{ animation: "blink 1.2s 0s infinite" }}>●</span>
                  <span style={{ animation: "blink 1.2s .2s infinite" }}>●</span>
                  <span style={{ animation: "blink 1.2s .4s infinite" }}>●</span>
                </span>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div style={{ padding: "12px 14px", borderTop: "1px solid #E5E2D9", flexShrink: 0, background: "#FDFCFA" }}>
          <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
            <textarea
              ref={textareaRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              disabled={loading}
              rows={1}
              placeholder={'Ask anything… "Show projects at risk" or "Add a risk to Customer Portal"'}
              style={{
                flex: 1, resize: "none", background: "#F4F2EC",
                border: "1.5px solid #E5E2D9", borderRadius: 8,
                padding: "9px 12px", fontSize: 13, color: "#18170F",
                outline: "none", fontFamily: "inherit", lineHeight: 1.5,
                maxHeight: 120, overflowY: "auto",
                transition: "border-color .12s",
              }}
              onFocus={e => { e.currentTarget.style.borderColor = "#006D6B"; e.currentTarget.style.background = "#fff"; }}
              onBlur={e  => { e.currentTarget.style.borderColor = "#E5E2D9"; e.currentTarget.style.background = "#F4F2EC"; }}
            />
            <button
              onClick={() => send(input)}
              disabled={loading || !input.trim()}
              style={{
                width: 36, height: 36, borderRadius: 8, flexShrink: 0,
                background: loading || !input.trim() ? "#E5E2D9" : "#006D6B",
                border: "none", cursor: loading || !input.trim() ? "not-allowed" : "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "#fff", fontSize: 16, transition: "background .15s",
              }}
            >
              ↑
            </button>
          </div>
          <div style={{ fontSize: 10, color: "#CCC9BF", marginTop: 6, textAlign: "center" }}>
            Enter to send · Shift+Enter for new line · Esc to close
          </div>
        </div>
      </div>
    </>
  );
}
