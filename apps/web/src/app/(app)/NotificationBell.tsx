"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

interface Alert {
  id:        string;
  type:      string;
  level:     string;
  title:     string;
  detail:    string;
  action?:   string;
  read:      boolean;
  createdAt: string;
  project?:  { id: string; name: string } | null;
}

const LEVEL_COLOR: Record<string, { dot: string; bg: string; border: string; text: string }> = {
  critical: { dot: "#DC2626", bg: "#FEF2F2", border: "#FECACA", text: "#DC2626" },
  warning:  { dot: "#D97706", bg: "#FFFBEB", border: "#FDE68A", text: "#D97706" },
  info:     { dot: "#2563EB", bg: "#EFF6FF", border: "#BFDBFE", text: "#2563EB" },
};

export default function NotificationBell({ orgId }: { orgId: string }) {
  const router = useRouter();
  const [open,    setOpen]    = useState(false);
  const [alerts,  setAlerts]  = useState<Alert[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch("/api/alerts");
      const data = await res.json();
      setAlerts(Array.isArray(data) ? data : []);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const t = setInterval(load, 5 * 60 * 1000);
    return () => clearInterval(t);
  }, [load]);

  const unread   = alerts.filter(a => !a.read).length;
  const critical = alerts.filter(a => a.level === "critical" && !a.read).length;

  const dismiss = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    await fetch("/api/alerts", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ alertId: id }) });
    setAlerts(p => p.filter(a => a.id !== id));
  };

  const clearAll = async () => {
    await fetch("/api/alerts", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ clearAll: true }) });
    setAlerts([]);
  };

  const fmtTime = (d: string) => {
    const diff = Date.now() - new Date(d).getTime();
    const m = Math.floor(diff / 60000);
    const h = Math.floor(m / 60);
    const days = Math.floor(h / 24);
    return days > 0 ? `${days}d ago` : h > 0 ? `${h}h ago` : m > 0 ? `${m}m ago` : "just now";
  };

  return (
    <>
      {/* Bell button in sidebar */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderRadius: 8, color: critical > 0 ? "#DC2626" : "#64748B", background: open ? "#F1F5F9" : "none", border: "none", cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 500, width: "100%", position: "relative", marginBottom: 4 }}
      >
        <span style={{ width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 6, background: critical > 0 ? "#FEF2F2" : "#F1F5F9", fontSize: 14, flexShrink: 0, position: "relative" }}>
          🔔
          {unread > 0 && (
            <span style={{ position: "absolute", top: -5, right: -5, minWidth: 16, height: 16, padding: "0 3px", background: critical > 0 ? "#DC2626" : "#D97706", borderRadius: 999, fontSize: 9, fontWeight: 800, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", border: "2px solid #fff" }}>
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </span>
        <span>Notifications</span>
        {unread === 0 && <span style={{ marginLeft: "auto", fontSize: 10, color: "#CBD5E1" }}>All read</span>}
      </button>

      {/* Overlay drawer */}
      {open && (
        <>
          {/* Click outside to close */}
          <div style={{ position: "fixed", inset: 0, zIndex: 200 }} onClick={() => setOpen(false)} />

          {/* Drawer — positioned absolute relative to sidebar bottom */}
          <div style={{ position: "fixed", left: 240, bottom: 60, width: 360, maxHeight: "70vh", background: "#fff", border: "1px solid #E2E8F0", borderRadius: 14, boxShadow: "0 8px 32px rgba(0,0,0,0.12)", zIndex: 201, display: "flex", flexDirection: "column", overflow: "hidden" }}>
            {/* Header */}
            <div style={{ padding: "14px 16px", borderBottom: "1px solid #F1F5F9", display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
              <div style={{ flex: 1 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#0F172A" }}>Notifications</span>
                {unread > 0 && <span style={{ marginLeft: 6, fontSize: 10, fontWeight: 700, color: "#DC2626", background: "#FEF2F2", padding: "1px 6px", borderRadius: 10 }}>{unread} unread</span>}
              </div>
              {alerts.length > 0 && (
                <button onClick={clearAll} style={{ fontSize: 10, color: "#DC2626", background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 6, padding: "3px 8px", cursor: "pointer", fontFamily: "inherit", fontWeight: 600 }}>
                  Clear all
                </button>
              )}
              <button onClick={() => setOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#94A3B8", fontSize: 14, padding: "2px 4px", lineHeight: 1 }}>✕</button>
            </div>

            {/* List */}
            <div style={{ overflowY: "auto", flex: 1 }}>
              {loading ? (
                <div style={{ padding: 24, textAlign: "center", color: "#94A3B8", fontSize: 12 }}>Loading…</div>
              ) : alerts.length === 0 ? (
                <div style={{ padding: "32px 20px", textAlign: "center" }}>
                  <div style={{ fontSize: 24, marginBottom: 8 }}>✅</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#0F172A", marginBottom: 4 }}>All clear!</div>
                  <div style={{ fontSize: 12, color: "#94A3B8" }}>No active alerts across your portfolio.</div>
                </div>
              ) : (
                alerts.map(a => {
                  const lc = LEVEL_COLOR[a.level] ?? LEVEL_COLOR.info;
                  return (
                    <div key={a.id} style={{ padding: "12px 16px", borderBottom: "1px solid #F8FAFC", background: a.read ? "#fff" : "#FAFBFC", display: "flex", gap: 10, alignItems: "flex-start" }}>
                      <div style={{ width: 7, height: 7, borderRadius: "50%", background: a.read ? "#E2E8F0" : lc.dot, flexShrink: 0, marginTop: 5 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        {a.project && <div style={{ fontSize: 9, color: "#94A3B8", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 2 }}>{a.project.name}</div>}
                        <div style={{ fontSize: 12, fontWeight: a.read ? 400 : 600, color: "#0F172A", lineHeight: 1.4, marginBottom: 2 }}>{a.title}</div>
                        <div style={{ fontSize: 11, color: "#64748B", lineHeight: 1.4, marginBottom: 4 }}>{a.detail}</div>
                        {a.action && <div style={{ fontSize: 11, color: lc.text, fontWeight: 600, marginBottom: 6 }}>→ {a.action}</div>}
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontSize: 9, padding: "1px 6px", borderRadius: 4, background: lc.bg, color: lc.text, fontWeight: 700, border: `1px solid ${lc.border}` }}>{a.level.toUpperCase()}</span>
                          <span style={{ fontSize: 10, color: "#CBD5E1" }}>{fmtTime(a.createdAt)}</span>
                          {a.project && (
                            <button onClick={() => { setOpen(false); router.push(`/projects/${a.project!.id}`); }} style={{ marginLeft: "auto", fontSize: 10, color: "#006D6B", fontWeight: 600, background: "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}>
                              View →
                            </button>
                          )}
                        </div>
                      </div>
                      {/* Dismiss button */}
                      <button onClick={e => dismiss(e, a.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#CBD5E1", fontSize: 12, padding: "2px 4px", lineHeight: 1, flexShrink: 0, borderRadius: 4 }}
                        onMouseEnter={e => (e.currentTarget.style.color = "#DC2626")}
                        onMouseLeave={e => (e.currentTarget.style.color = "#CBD5E1")}
                      >✕</button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}