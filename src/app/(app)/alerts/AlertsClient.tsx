"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type AlertLevel = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFO";
type FilterTab = "all" | "unread" | "critical" | "validation";

interface Alert {
  id: string;
  title: string;
  detail: string;
  level: AlertLevel;
  type: string;
  read: boolean;
  resolved: boolean;
  requiresValidation: boolean;
  validatedBy?: string | null;
  validatedAt?: string | null;
  createdAt: string;
  project?: { id: string; name: string } | null;
}

interface Props {
  alerts: Alert[];
}

const LEVEL_CONFIG: Record<AlertLevel, { color: string; bg: string; border: string; label: string }> = {
  CRITICAL: { color: "var(--red-text)",    bg: "var(--red-bg)",    border: "var(--red-border)",    label: "Critical" },
  HIGH:     { color: "var(--red-text)",    bg: "var(--red-bg)",    border: "var(--red-border)",    label: "High"     },
  MEDIUM:   { color: "var(--amber-text)",  bg: "var(--amber-bg)",  border: "var(--amber-border)",  label: "Medium"   },
  LOW:      { color: "var(--text2)",       bg: "var(--surface2)",  border: "var(--border)",        label: "Low"      },
  INFO:     { color: "var(--blue-text)",   bg: "var(--blue-bg)",   border: "var(--blue-border)",   label: "Info"     },
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)   return "just now";
  if (m < 60)  return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24)  return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function AlertsClient({ alerts: initial }: Props) {
  const router = useRouter();
  const [alerts, setAlerts] = useState<Alert[]>(initial);
  const [filter, setFilter] = useState<FilterTab>("all");
  const [busy, setBusy] = useState<string | null>(null);

  const filtered = alerts.filter(a => {
    if (filter === "unread")     return !a.read;
    if (filter === "critical")   return a.level === "CRITICAL" || a.level === "HIGH";
    if (filter === "validation") return a.requiresValidation && !a.resolved;
    return true;
  });

  const counts = {
    all:        alerts.length,
    unread:     alerts.filter(a => !a.read).length,
    critical:   alerts.filter(a => a.level === "CRITICAL" || a.level === "HIGH").length,
    validation: alerts.filter(a => a.requiresValidation && !a.resolved).length,
  };

  const dismiss = async (id: string) => {
    setBusy(id);
    try {
      await fetch("/api/alerts", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ alertId: id }) });
      setAlerts(p => p.filter(a => a.id !== id));
    } finally { setBusy(null); }
  };

  const clearAll = async () => {
    if (!confirm("Delete all alerts? This cannot be undone.")) return;
    await fetch("/api/alerts", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ clearAll: true }) });
    setAlerts([]);
  };

  const validate = async (id: string, action: "approve" | "reject") => {
    setBusy(id);
    try {
      await fetch(`/api/alerts/${id}/validate`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }) });
      setAlerts(p => p.map(a => a.id === id ? { ...a, requiresValidation: false, resolved: true, read: true } : a));
    } finally { setBusy(null); }
  };

  return (
    <div style={{ padding: "20px 22px", maxWidth: 900, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: "var(--text)", letterSpacing: "-.3px", marginBottom: 2 }}>Alerts</h1>
          <p style={{ fontSize: 12, color: "var(--text2)" }}>{counts.all} total · {counts.unread} unread</p>
        </div>
        {alerts.length > 0 && (
          <button
            onClick={clearAll}
            style={{ fontSize: 11, padding: "5px 12px", border: "1px solid var(--border)", borderRadius: 6, background: "none", color: "var(--text2)", cursor: "pointer", fontFamily: "inherit" }}
          >
            Clear all
          </button>
        )}
      </div>

      {/* Filter tabs */}
      <div style={{ display: "flex", gap: 2, borderBottom: "1px solid var(--border)", marginBottom: 16 }}>
        {(["all", "unread", "critical", "validation"] as FilterTab[]).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: "7px 13px", fontSize: 12, border: "none", background: "none", cursor: "pointer",
              fontFamily: "inherit", fontWeight: filter === f ? 600 : 400,
              color: filter === f ? "var(--text)" : "var(--text2)",
              borderBottom: filter === f ? "2px solid var(--text)" : "2px solid transparent",
              marginBottom: -1, transition: ".1s",
            }}
          >
            {f === "all" ? "All" : f === "unread" ? "Unread" : f === "critical" ? "Critical" : "Needs Validation"}
            {counts[f] > 0 && (
              <span style={{ marginLeft: 6, fontSize: 10, fontWeight: 700, padding: "1px 5px", borderRadius: 8, background: f === "validation" ? "var(--amber)" : f === "critical" ? "var(--red)" : "var(--surface2)", color: f === "validation" || f === "critical" ? "#fff" : "var(--text2)" }}>
                {counts[f]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Alerts list */}
      {filtered.length === 0 ? (
        <div style={{ padding: "60px 20px", textAlign: "center" }}>
          <p style={{ fontSize: 14, color: "var(--text3)", marginBottom: 6 }}>No alerts in this view</p>
          {filter !== "all" && (
            <button onClick={() => setFilter("all")} style={{ fontSize: 12, color: "var(--guardian)", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}>
              Show all alerts
            </button>
          )}
        </div>
      ) : (
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", overflow: "hidden" }}>
          {filtered.map((a, i) => {
            const lc = LEVEL_CONFIG[a.level] ?? LEVEL_CONFIG.INFO;
            return (
              <div
                key={a.id}
                style={{
                  padding: "13px 15px",
                  borderTop: i === 0 ? "none" : "1px solid var(--border)",
                  background: !a.read ? "var(--surface2)" : "var(--surface)",
                  display: "flex", gap: 12, alignItems: "flex-start",
                }}
              >
                {/* Level badge */}
                <span style={{ fontSize: 9, fontWeight: 700, padding: "3px 7px", borderRadius: 4, whiteSpace: "nowrap", flexShrink: 0, marginTop: 2, letterSpacing: ".04em", color: lc.color, background: lc.bg, border: `1px solid ${lc.border}` }}>
                  {lc.label}
                </span>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 12, fontWeight: 600, color: "var(--text)", lineHeight: 1.4, marginBottom: 3 }}>{a.title}</p>
                  <p style={{ fontSize: 11, color: "var(--text2)", lineHeight: 1.5 }}>{a.detail}</p>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 6, flexWrap: "wrap" }}>
                    {a.project && (
                      <Link href={`/projects/${a.project.id}`} style={{ fontSize: 10, color: "var(--text3)", textDecoration: "none" }}>
                        {a.project.name}
                      </Link>
                    )}
                    <span style={{ fontSize: 10, color: "var(--text3)" }}>{timeAgo(a.createdAt)}</span>
                    {a.resolved && <span style={{ fontSize: 10, color: "var(--green-text)", fontWeight: 600 }}>Resolved</span>}
                    {a.requiresValidation && !a.resolved && (
                      <span style={{ fontSize: 10, color: "var(--amber-text)", fontWeight: 600 }}>Awaiting validation</span>
                    )}
                  </div>

                  {/* Validation actions */}
                  {a.requiresValidation && !a.resolved && (
                    <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                      <button
                        disabled={busy === a.id}
                        onClick={() => validate(a.id, "approve")}
                        style={{ fontSize: 10, fontWeight: 600, padding: "4px 10px", borderRadius: 5, background: "var(--green-bg)", color: "var(--green-text)", border: "1px solid var(--green-border)", cursor: "pointer", fontFamily: "inherit" }}
                      >
                        Approve ✓
                      </button>
                      <button
                        disabled={busy === a.id}
                        onClick={() => validate(a.id, "reject")}
                        style={{ fontSize: 10, padding: "4px 10px", borderRadius: 5, background: "none", color: "var(--red-text)", border: "1px solid var(--red-border)", cursor: "pointer", fontFamily: "inherit" }}
                      >
                        Reject
                      </button>
                    </div>
                  )}
                </div>

                {/* Dismiss */}
                <button
                  disabled={busy === a.id}
                  onClick={() => dismiss(a.id)}
                  style={{ flexShrink: 0, width: 22, height: 22, display: "flex", alignItems: "center", justifyContent: "center", border: "none", background: "none", cursor: "pointer", color: "var(--text3)", fontSize: 14, borderRadius: 4, transition: ".1s" }}
                  title="Dismiss"
                  onMouseEnter={e => (e.currentTarget.style.background = "var(--surface2)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "none")}
                >
                  ×
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
