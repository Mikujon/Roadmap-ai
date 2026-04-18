"use client";
import { useState } from "react";
import Link from "next/link";

type AlertLevel = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFO";
type FilterChip = "all" | "critical" | "warn" | "read";

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

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function rowVariant(a: Alert): "urgent" | "warn" | "read" {
  if (a.read) return "read";
  if (a.level === "CRITICAL" || a.level === "HIGH") return "urgent";
  if (a.level === "MEDIUM") return "warn";
  return "read";
}

export default function AlertsClient({ alerts: initial }: Props) {
  const [alerts, setAlerts] = useState<Alert[]>(initial);
  const [filter, setFilter] = useState<FilterChip>("all");
  const [busy, setBusy]     = useState<string | null>(null);

  const counts = {
    all:      alerts.length,
    critical: alerts.filter(a => (a.level === "CRITICAL" || a.level === "HIGH") && !a.read).length,
    warn:     alerts.filter(a => a.level === "MEDIUM" && !a.read).length,
    read:     alerts.filter(a => a.read).length,
  };

  const filtered = alerts.filter(a => {
    if (filter === "critical") return (a.level === "CRITICAL" || a.level === "HIGH") && !a.read;
    if (filter === "warn")     return a.level === "MEDIUM" && !a.read;
    if (filter === "read")     return a.read;
    return true;
  });

  const markRead = async (id: string) => {
    setBusy(id);
    try {
      await fetch("/api/alerts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alertId: id }),
      });
      setAlerts(p => p.map(a => a.id === id ? { ...a, read: true } : a));
    } finally { setBusy(null); }
  };

  const markAllRead = async () => {
    await fetch("/api/alerts", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markAllRead: true }),
    });
    setAlerts(p => p.map(a => ({ ...a, read: true })));
  };

  const validate = async (id: string, action: "approve" | "reject") => {
    setBusy(id);
    try {
      await fetch(`/api/alerts/${id}/validate`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      setAlerts(p => p.map(a => a.id === id ? { ...a, requiresValidation: false, resolved: true, read: true } : a));
    } finally { setBusy(null); }
  };

  const chips: { id: FilterChip; label: string; count: number }[] = [
    { id: "all",      label: `Tutti (${counts.all})`,         count: counts.all      },
    { id: "critical", label: `🔴 Critici (${counts.critical})`, count: counts.critical },
    { id: "warn",     label: `🟡 Warning (${counts.warn})`,   count: counts.warn     },
    { id: "read",     label: `✓ Letti (${counts.read})`,      count: counts.read     },
  ];

  return (
    <>
      <style>{`
        .alert-row { display:flex; align-items:flex-start; gap:10px; padding:12px 14px; border-bottom:1px solid #E5E2D9; transition:background .1s; }
        .alert-row:last-child { border-bottom:none; }
        .alert-row:hover { background:#FAFAF8; }
        .alert-row.urgent { background:rgba(220,38,38,.04); border-left:3px solid #DC2626; }
        .alert-row.warn { background:rgba(217,119,6,.04); border-left:3px solid #D97706; }
        .alert-row.read { opacity:.55; }
        .dec-lbl { font-size:9px; font-weight:800; padding:2px 6px; border-radius:4px; white-space:nowrap; flex-shrink:0; margin-top:2px; letter-spacing:.06em; }
        .dec-text { font-size:12px; font-weight:500; color:#18170F; line-height:1.4; margin-bottom:3px; }
        .dec-meta { font-size:10px; color:#9E9C93; }
        .chip { display:inline-flex; align-items:center; padding:5px 12px; border-radius:20px; font-size:12px; font-weight:500; border:1px solid #E5E2D9; background:#F8F7F3; color:#5C5A52; cursor:pointer; transition:all .12s; user-select:none; }
        .chip:hover { background:#F0EEE8; color:#18170F; }
        .chip.on { background:#18170F; color:#fff; border-color:#18170F; font-weight:600; }
        .btn-sm { padding:4px 10px; border:1px solid #E5E2D9; border-radius:6px; background:#fff; font-size:11px; font-weight:600; color:#5C5A52; cursor:pointer; font-family:inherit; transition:background .1s; }
        .btn-sm:hover { background:#F0EEE8; color:#18170F; }
        .btn-danger-sm { padding:4px 10px; border:1px solid #FECACA; border-radius:6px; background:#FEF2F2; font-size:11px; font-weight:600; color:#DC2626; cursor:pointer; font-family:inherit; }
        .btn-warn-sm { padding:4px 10px; border:1px solid #FDE68A; border-radius:6px; background:#FFFBEB; font-size:11px; font-weight:600; color:#D97706; cursor:pointer; font-family:inherit; }
      `}</style>

      <div style={{ padding: "20px 24px", maxWidth: 860, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 }}>
          <div>
            <h1 style={{ fontSize: 18, fontWeight: 700, color: "#18170F", letterSpacing: "-.3px", margin: 0, marginBottom: 3 }}>Alerts</h1>
            <p style={{ fontSize: 12, color: "#5C5A52", margin: 0 }}>
              {counts.all} total · {alerts.filter(a => !a.read).length} unread
            </p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {alerts.some(a => !a.read) && (
              <button className="btn-sm" onClick={markAllRead}>
                ✓ Mark all read
              </button>
            )}
          </div>
        </div>

        {/* Chip filters */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
          {chips.map(c => (
            <div
              key={c.id}
              className={`chip${filter === c.id ? " on" : ""}`}
              onClick={() => setFilter(c.id)}
            >
              {c.label}
            </div>
          ))}
        </div>

        {/* Card */}
        <div style={{ background: "#fff", border: "1px solid #E5E2D9", borderRadius: 10, overflow: "hidden" }}>
          {/* Card header */}
          <div style={{ padding: "11px 14px", borderBottom: "1px solid #E5E2D9", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#18170F" }}>All alerts</span>
            <span style={{ fontSize: 11, color: "#9E9C93" }}>sorted by severity</span>
          </div>

          {filtered.length === 0 ? (
            <div style={{ padding: "60px 20px", textAlign: "center" }}>
              <p style={{ fontSize: 13, color: "#9E9C93", margin: 0, marginBottom: 8 }}>No alerts in this view</p>
              {filter !== "all" && (
                <button onClick={() => setFilter("all")} style={{ fontSize: 12, color: "#006D6B", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}>
                  Show all alerts
                </button>
              )}
            </div>
          ) : (
            filtered.map(a => {
              const variant = rowVariant(a);
              const isUrgent = variant === "urgent";
              const isWarn   = variant === "warn";
              const isRead   = variant === "read";

              return (
                <div key={a.id} className={`alert-row ${variant}`}>
                  {/* Label badge */}
                  {isUrgent && (
                    <div className="dec-lbl" style={{ background: "#DC2626", color: "#fff" }}>CRITICAL</div>
                  )}
                  {isWarn && (
                    <div className="dec-lbl" style={{ background: "#D97706", color: "#fff" }}>WARNING</div>
                  )}
                  {isRead && (
                    <div className="dec-lbl" style={{ background: "#F0EEE8", color: "#9E9C93" }}>READ</div>
                  )}

                  {/* Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="dec-text">
                      {a.project && <strong>{a.project.name} — </strong>}
                      {a.title}
                    </div>
                    <div className="dec-meta">
                      {a.type} · {timeAgo(a.createdAt)}
                      {a.resolved && " · resolved"}
                      {a.requiresValidation && !a.resolved && " · awaiting validation"}
                    </div>
                    {a.detail && (
                      <div style={{ fontSize: 11, color: "#5C5A52", marginTop: 3, lineHeight: 1.4 }}>{a.detail}</div>
                    )}

                    {/* Validation actions */}
                    {a.requiresValidation && !a.resolved && (
                      <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                        <button
                          disabled={busy === a.id}
                          onClick={() => validate(a.id, "approve")}
                          style={{ fontSize: 10, fontWeight: 600, padding: "4px 10px", borderRadius: 5, background: "#F0FDF4", color: "#16A34A", border: "1px solid #BBF7D0", cursor: "pointer", fontFamily: "inherit" }}
                        >
                          Approve ✓
                        </button>
                        <button
                          disabled={busy === a.id}
                          onClick={() => validate(a.id, "reject")}
                          style={{ fontSize: 10, padding: "4px 10px", borderRadius: 5, background: "none", color: "#DC2626", border: "1px solid #FECACA", cursor: "pointer", fontFamily: "inherit" }}
                        >
                          Reject
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div style={{ display: "flex", gap: 5, flexShrink: 0 }}>
                    {a.project && (
                      <Link href={`/projects/${a.project.id}`} style={{ textDecoration: "none" }}>
                        <button className={isUrgent ? "btn-danger-sm" : isWarn ? "btn-warn-sm" : "btn-sm"}>
                          Open ↗
                        </button>
                      </Link>
                    )}
                    {!a.read && (
                      <button
                        className="btn-sm"
                        disabled={busy === a.id}
                        onClick={() => markRead(a.id)}
                      >
                        ✓ Read
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </>
  );
}
