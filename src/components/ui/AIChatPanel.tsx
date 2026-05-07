"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { useApp } from "@/contexts/AppContext";

interface Message {
  role: "user" | "assistant";
  content: string;
  actions?: { tool: string; summary: string }[];
  structured?: StructuredResponse;
  timestamp: Date;
}

interface StructuredResponse {
  type: "health_report" | "action_list" | "risk_summary" | "text" | "portfolio";
  data: Record<string, unknown>;
}

interface HealthCard {
  score: number;
  status: string;
  spi: number;
  cpi: number;
  delayDays: number;
  blockedFeatures: number;
  alerts: { level: string; title: string }[];
}

interface Props {
  open: boolean;
  onClose: () => void;
  projectId?: string;
  projectName?: string;
}

// ── Health Score Bar ────────────────────────────────────────────
function HealthBar({ score }: { score: number; status: string }) {
  const color = score >= 70 ? "#059669" : score >= 50 ? "#D97706" : "#DC2626";
  const bg = score >= 70 ? "#ECFDF5" : score >= 50 ? "#FFFBEB" : "#FEF2F2";
  const label = score >= 70 ? "ON TRACK" : score >= 50 ? "AT RISK" : "OFF TRACK";

  return (
    <div style={{
      background: bg,
      border: `1px solid ${color}30`,
      borderRadius: 10,
      padding: "12px 16px",
      marginBottom: 8,
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 28, fontWeight: 800, color, lineHeight: 1 }}>{score}</span>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color, letterSpacing: 1 }}>{label}</div>
            <div style={{ fontSize: 11, color: "#6B7280" }}>Health Score</div>
          </div>
        </div>
      </div>
      <div style={{ height: 6, background: "#E5E7EB", borderRadius: 99, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${score}%`, background: color, borderRadius: 99, transition: "width 0.5s" }} />
      </div>
    </div>
  );
}

// ── Metric Pill ─────────────────────────────────────────────────
function MetricPill({ label, value, good }: { label: string; value: string; good: boolean }) {
  return (
    <div style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 4,
      background: good ? "#ECFDF5" : "#FEF2F2",
      border: `1px solid ${good ? "#059669" : "#DC2626"}30`,
      borderRadius: 99,
      padding: "3px 10px",
      fontSize: 12,
      fontWeight: 600,
      color: good ? "#065F46" : "#991B1B",
    }}>
      <span style={{ fontSize: 10 }}>{good ? "✓" : "!"}</span>
      {label}: {value}
    </div>
  );
}

// ── Alert Row ───────────────────────────────────────────────────
function AlertRow({ level, title }: { level: string; title: string }) {
  const colors: Record<string, { dot: string; bg: string; text: string }> = {
    CRITICAL: { dot: "#DC2626", bg: "#FEF2F2", text: "#991B1B" },
    WARNING:  { dot: "#D97706", bg: "#FFFBEB", text: "#92400E" },
    INFO:     { dot: "#2563EB", bg: "#EFF6FF", text: "#1E40AF" },
    SUCCESS:  { dot: "#059669", bg: "#ECFDF5", text: "#065F46" },
  };
  const c = colors[level.toUpperCase()] ?? colors.INFO;
  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: 8,
      padding: "6px 10px",
      background: c.bg,
      borderRadius: 6,
      marginBottom: 4,
    }}>
      <div style={{ width: 8, height: 8, borderRadius: "50%", background: c.dot, flexShrink: 0 }} />
      <span style={{ fontSize: 12, color: c.text, fontWeight: 500 }}>{title}</span>
    </div>
  );
}

// ── Chat Message ────────────────────────────────────────────────
function ChatMessage({ message }: { message: Message }) {
  const isUser = message.role === "user";

  const renderContent = (text: string) => {
    const lines = text.split("\n");
    return lines.map((line, i) => {
      if (line.startsWith("## ")) return (
        <div key={i} style={{ fontWeight: 700, fontSize: 14, color: "#111827", margin: "10px 0 4px" }}>
          {line.replace("## ", "")}
        </div>
      );
      if (line.startsWith("### ")) return (
        <div key={i} style={{ fontWeight: 600, fontSize: 13, color: "#374151", margin: "8px 0 2px" }}>
          {line.replace("### ", "")}
        </div>
      );
      if (line.startsWith("|") && line.endsWith("|")) {
        const cells = line.split("|").filter(c => c.trim() && !c.match(/^[-\s]+$/));
        if (cells.length === 0) return null;
        return (
          <div key={i} style={{
            display: "grid",
            gridTemplateColumns: `repeat(${cells.length}, 1fr)`,
            gap: 4,
            fontSize: 12,
            padding: "3px 0",
            borderBottom: "1px solid #E5E7EB",
          }}>
            {cells.map((cell, j) => (
              <span key={j} style={{ color: j === 0 ? "#374151" : "#6B7280", fontWeight: j === 0 ? 500 : 400 }}>
                {cell.trim()}
              </span>
            ))}
          </div>
        );
      }
      if (line === "---") return <hr key={i} style={{ border: "none", borderTop: "1px solid #E5E7EB", margin: "8px 0" }} />;
      if (line.startsWith("- ") || line.startsWith("* ")) return (
        <div key={i} style={{ display: "flex", gap: 6, fontSize: 13, color: "#374151", margin: "2px 0" }}>
          <span style={{ color: "#006D6B", flexShrink: 0 }}>•</span>
          <span>{line.replace(/^[-*] /, "").replace(/\*\*(.*?)\*\*/g, "$1")}</span>
        </div>
      );
      if (line.includes("**")) return (
        <p key={i} style={{ fontSize: 13, color: "#374151", margin: "3px 0", lineHeight: 1.5 }}
          dangerouslySetInnerHTML={{
            __html: line.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
          }}
        />
      );
      if (!line.trim()) return <div key={i} style={{ height: 4 }} />;
      return (
        <p key={i} style={{ fontSize: 13, color: "#374151", margin: "3px 0", lineHeight: 1.5 }}>
          {line}
        </p>
      );
    });
  };

  if (isUser) {
    return (
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
        <div style={{
          background: "#006D6B",
          color: "white",
          borderRadius: "12px 12px 2px 12px",
          padding: "8px 14px",
          maxWidth: "80%",
          fontSize: 13,
          lineHeight: 1.4,
        }}>
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
      <div style={{
        width: 28, height: 28, borderRadius: "50%",
        background: "linear-gradient(135deg, #006D6B, #0D9488)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 12, color: "white", fontWeight: 700, flexShrink: 0,
      }}>G</div>

      <div style={{ flex: 1 }}>
        {message.actions && message.actions.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 8 }}>
            {message.actions.map((a, i) => (
              <span key={i} style={{
                fontSize: 11, background: "#ECFDF5", color: "#065F46",
                border: "1px solid #059669",
                borderRadius: 99, padding: "2px 8px", fontWeight: 500,
              }}>
                ✓ {a.summary || a.tool}
              </span>
            ))}
          </div>
        )}

        <div style={{
          background: "#F9FAFB",
          border: "1px solid #E5E7EB",
          borderRadius: "2px 12px 12px 12px",
          padding: "10px 14px",
        }}>
          {renderContent(message.content)}
        </div>

        <div style={{ fontSize: 10, color: "#9CA3AF", marginTop: 4, marginLeft: 2 }}>
          {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </div>
      </div>
    </div>
  );
}

// ── Download Report Button ──────────────────────────────────────
function DownloadReportButton({ projectId, projectName }: { projectId?: string; projectName?: string }) {
  const [loading, setLoading] = useState(false);

  const download = async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/health`);
      const data = await res.json();
      const health = data.data ?? data;

      const report = `GUARDIAN AI — PROJECT HEALTH REPORT
Generated: ${new Date().toLocaleString()}
Project: ${projectName ?? projectId}
${"=".repeat(50)}

HEALTH SCORE: ${health.healthScore ?? "N/A"}/100
STATUS: ${health.status ?? "N/A"}

EVM METRICS:
  SPI (Schedule): ${health.spi ?? "N/A"}
  CPI (Cost):     ${health.cpi ?? "N/A"}
  EAC (Forecast): €${health.eac ?? "N/A"}
  Delay:          ${health.delayDays ?? 0} days

ALERTS:
${(health.alerts ?? []).map((a: { level?: string; title?: string }) => `  [${a.level?.toUpperCase()}] ${a.title}`).join("\n") || "  No active alerts"}

On-Time Probability: ${health.onTrackProbability ?? "N/A"}%
`;

      const blob = new Blob([report], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `guardian-report-${projectName ?? projectId}-${new Date().toISOString().split("T")[0]}.txt`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (!projectId) return null;

  return (
    <button onClick={download} disabled={loading} style={{
      padding: "6px 12px",
      background: loading ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.2)",
      border: "1px solid rgba(255,255,255,0.3)",
      borderRadius: 6,
      fontSize: 12,
      fontWeight: 500,
      color: "white",
      cursor: loading ? "not-allowed" : "pointer",
      display: "flex",
      alignItems: "center",
      gap: 4,
    }}>
      {loading ? "..." : "⬇ Report"}
    </button>
  );
}

// ── Main Panel ──────────────────────────────────────────────────
export function AIChatPanel({ open, onClose, projectId, projectName }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [history, setHistory] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [healthCard, setHealthCard] = useState<HealthCard | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { refresh, refreshProject } = useApp();

  const fetchHealth = useCallback(() => {
    if (!projectId) return;
    fetch(`/api/projects/${projectId}/health`)
      .then(r => r.json())
      .then(data => {
        const h = data.data ?? data;
        setHealthCard({
          score: h.healthScore ?? 80,
          status: h.status ?? "ON_TRACK",
          spi: h.spi ?? 1,
          cpi: h.cpi ?? 1,
          delayDays: h.delayDays ?? 0,
          blockedFeatures: 0,
          alerts: h.alerts ?? [],
        });
      })
      .catch(() => {});
  }, [projectId]);

  useEffect(() => {
    if (open && projectId) fetchHealth();
  }, [open, projectId, fetchHealth]);

  useEffect(() => {
    if (open) textareaRef.current?.focus();
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, onClose]);

  const send = useCallback(async (text: string) => {
    if (!text.trim() || loading) return;
    setInput("");

    const userMsg: Message = { role: "user", content: text, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      const res = await fetch("/api/v1/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, projectId, history: history.slice(-10) }),
      });

      const json = await res.json();
      const data = json.data ?? json;
      const responseText = data.message ?? data.response ?? "No response";
      const actions = (data.actionsPerformed ?? []).map((a: string) => ({ tool: a, summary: a }));

      setMessages(prev => [...prev, {
        role: "assistant",
        content: responseText,
        actions,
        timestamp: new Date(),
      }]);
      setHistory(prev => [
        ...prev,
        { role: "user", content: text },
        { role: "assistant", content: responseText },
      ]);

      if (actions.length > 0) {
        if (projectId) {
          fetchHealth();
          setTimeout(() => refreshProject(projectId), 1500);
        } else {
          setTimeout(() => refresh(), 1500);
        }
      }
    } catch {
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "Connection error. Please try again.",
        timestamp: new Date(),
      }]);
    } finally {
      setLoading(false);
    }
  }, [loading, projectId, history, fetchHealth, refresh, refreshProject]);

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); }
  };

  const SUGGESTIONS = projectId ? [
    "What is wrong with this project?",
    "Add 3 tasks to the active sprint",
    "Show me all open risks",
    "What is the forecast completion date?",
  ] : [
    "Which projects are at risk?",
    "Show me all critical alerts",
    "What is my portfolio health?",
    "Which projects will miss their deadline?",
  ];

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0,
          background: "rgba(0,0,0,0.3)",
          zIndex: 999,
          backdropFilter: "blur(2px)",
        }}
      />

      {/* Panel */}
      <div style={{
        position: "fixed",
        top: 0, right: 0, bottom: 0,
        width: 480,
        background: "white",
        boxShadow: "-4px 0 30px rgba(0,0,0,0.15)",
        zIndex: 1000,
        display: "flex",
        flexDirection: "column",
        fontFamily: "'DM Sans', system-ui, sans-serif",
      }}>

        {/* Header */}
        <div style={{
          padding: "16px 20px",
          borderBottom: "1px solid #E5E7EB",
          background: "linear-gradient(135deg, #006D6B, #0D9488)",
          color: "white",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexShrink: 0,
        }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{
                width: 8, height: 8, borderRadius: "50%",
                background: "#4ADE80",
                boxShadow: "0 0 0 2px rgba(74,222,128,0.3)",
              }} />
              <span style={{ fontWeight: 700, fontSize: 16 }}>Guardian AI</span>
            </div>
            <div style={{ fontSize: 12, opacity: 0.85, marginTop: 2 }}>
              {projectName ? `📁 ${projectName}` : "Portfolio Intelligence"}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <DownloadReportButton projectId={projectId} projectName={projectName} />
            {messages.length > 0 && (
              <button
                onClick={() => setMessages([])}
                style={{
                  background: "rgba(255,255,255,0.2)", border: "1px solid rgba(255,255,255,0.3)",
                  borderRadius: 6, color: "white", padding: "4px 10px",
                  cursor: "pointer", fontSize: 11, fontWeight: 500,
                }}
              >
                Clear
              </button>
            )}
            <button onClick={onClose} style={{
              background: "rgba(255,255,255,0.2)",
              border: "none", borderRadius: 6,
              color: "white", width: 28, height: 28,
              cursor: "pointer", fontSize: 16,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>×</button>
          </div>
        </div>

        {/* Health Card */}
        {projectId && healthCard && (
          <div style={{ padding: "12px 16px", borderBottom: "1px solid #F3F4F6", background: "#FAFAFA", flexShrink: 0 }}>
            <HealthBar score={healthCard.score} status={healthCard.status} />
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: healthCard.alerts.length > 0 ? 8 : 0 }}>
              <MetricPill label="SPI" value={healthCard.spi.toFixed(2)} good={healthCard.spi >= 0.85} />
              <MetricPill label="CPI" value={healthCard.cpi > 0 ? healthCard.cpi.toFixed(2) : "N/A"} good={healthCard.cpi >= 0.85 || healthCard.cpi === 0} />
              {healthCard.delayDays > 0 && (
                <MetricPill label="Delay" value={`${healthCard.delayDays}d`} good={false} />
              )}
            </div>
            {healthCard.alerts.slice(0, 3).map((a, i) => (
              <AlertRow key={i} level={a.level} title={a.title} />
            ))}
          </div>
        )}

        {/* Messages */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px" }}>
          {messages.length === 0 && (
            <div style={{ textAlign: "center", paddingTop: 20 }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>🛡</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#111827", marginBottom: 4 }}>
                {projectName ? `Analysing ${projectName}` : "Portfolio Intelligence"}
              </div>
              <div style={{ fontSize: 12, color: "#6B7280", marginBottom: 20 }}>
                Ask me anything or try a suggestion below
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {SUGGESTIONS.map((s, i) => (
                  <button key={i} onClick={() => send(s)} style={{
                    padding: "8px 14px",
                    background: "#F9FAFB",
                    border: "1px solid #E5E7EB",
                    borderRadius: 8,
                    fontSize: 13,
                    color: "#374151",
                    cursor: "pointer",
                    textAlign: "left",
                    fontFamily: "inherit",
                  }}
                    onMouseEnter={e => (e.currentTarget.style.background = "#F3F4F6")}
                    onMouseLeave={e => (e.currentTarget.style.background = "#F9FAFB")}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <ChatMessage key={i} message={msg} />
          ))}

          {loading && (
            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              <div style={{
                width: 28, height: 28, borderRadius: "50%",
                background: "linear-gradient(135deg, #006D6B, #0D9488)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 12, color: "white", fontWeight: 700, flexShrink: 0,
              }}>G</div>
              <div style={{
                background: "#F9FAFB", border: "1px solid #E5E7EB",
                borderRadius: "2px 12px 12px 12px",
                padding: "12px 16px",
                display: "flex", gap: 4, alignItems: "center",
              }}>
                {[0, 1, 2].map(j => (
                  <div key={j} style={{
                    width: 6, height: 6, borderRadius: "50%",
                    background: "#006D6B",
                    animation: `guardianPulse 1.2s ease-in-out ${j * 0.2}s infinite`,
                    opacity: 0.6,
                  }} />
                ))}
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div style={{
          padding: "12px 16px",
          borderTop: "1px solid #E5E7EB",
          background: "white",
          flexShrink: 0,
        }}>
          <div style={{
            display: "flex", gap: 8, alignItems: "flex-end",
            background: "#F9FAFB",
            border: "1px solid #E5E7EB",
            borderRadius: 10,
            padding: "8px 12px",
          }}>
            <textarea
              ref={textareaRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder={projectId
                ? `Ask about ${projectName ?? "this project"}, or request an action...`
                : "Ask about your portfolio..."
              }
              rows={1}
              style={{
                flex: 1, border: "none", background: "transparent",
                resize: "none", outline: "none",
                fontSize: 13, color: "#111827", lineHeight: 1.5,
                maxHeight: 100,
                fontFamily: "inherit",
              }}
            />
            <button
              onClick={() => send(input)}
              disabled={loading || !input.trim()}
              style={{
                width: 32, height: 32, borderRadius: 8,
                background: loading || !input.trim() ? "#E5E7EB" : "#006D6B",
                border: "none", cursor: loading || !input.trim() ? "not-allowed" : "pointer",
                color: "white", fontSize: 16,
                display: "flex", alignItems: "center", justifyContent: "center",
                transition: "background 0.15s", flexShrink: 0,
              }}
            >
              ↑
            </button>
          </div>
          <div style={{ fontSize: 10, color: "#9CA3AF", textAlign: "center", marginTop: 6 }}>
            Enter to send · Shift+Enter for new line · Esc to close
          </div>
        </div>
      </div>

      <style>{`
        @keyframes guardianPulse {
          0%, 100% { opacity: 0.3; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1.2); }
        }
      `}</style>
    </>
  );
}
