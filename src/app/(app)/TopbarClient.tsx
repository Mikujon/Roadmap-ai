"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useClerk } from "@clerk/nextjs";
import Link from "next/link";
import { GlobalSearch } from "@/components/ui/global-search";
import { KeyboardShortcutsModal } from "@/components/ui/keyboard-shortcuts";
import { AIChatPanel } from "@/components/ui/AIChatPanel";
import { useAlerts, useApp } from "@/contexts/AppContext";

// ── Notification drawer ───────────────────────────────────────────────────────
interface AlertItem {
  id: string;
  title: string;
  detail?: string;
  level: "critical" | "warning" | "info" | "success";
  read: boolean;
  projectId?: string;
  createdAt: string;
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

function NotificationDrawer({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { alerts: rawAlerts, markAlertRead, markAllRead } = useAlerts();
  const alerts = rawAlerts as AlertItem[];
  const router = useRouter();

  // Mark all read when drawer opens
  useEffect(() => {
    if (open && alerts.some(a => !a.read)) markAllRead();
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // ESC key
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  const handleClick = (alert: AlertItem) => {
    markAlertRead(alert.id);
    if (alert.projectId) router.push(`/projects/${alert.projectId}`);
    else router.push("/alerts");
    onClose();
  };

  const borderColor = (level: AlertItem["level"]) =>
    level === "critical" ? "#DC2626" : level === "warning" ? "#D97706" : level === "success" ? "#059669" : "#2563EB";

  const unreadCount = alerts.filter(a => !a.read).length;

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)", zIndex: 199 }}
          onClick={onClose}
        />
      )}

      {/* Drawer */}
      <div style={{
        position: "fixed", top: 0, right: 0, width: 380, height: "100vh",
        background: "#fff", boxShadow: "-8px 0 32px rgba(0,0,0,0.12)",
        zIndex: 200, display: "flex", flexDirection: "column",
        transform: open ? "translateX(0)" : "translateX(100%)",
        transition: "transform 250ms ease",
      }}>
        {/* Header */}
        <div style={{ padding: "16px 18px", borderBottom: "1px solid #E5E2D9", display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: "#18170F", flex: 1 }}>Notifications</span>
          {unreadCount > 0 && (
            <span style={{ fontSize: 10, fontWeight: 700, color: "#fff", background: "#DC2626", borderRadius: 20, padding: "2px 7px", minWidth: 20, textAlign: "center" }}>
              {unreadCount}
            </span>
          )}
          <button
            onClick={markAllRead}
            style={{ fontSize: 11, color: "#006D6B", fontWeight: 600, background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", padding: 0, flexShrink: 0 }}
          >
            Mark all read
          </button>
          <button
            onClick={onClose}
            style={{ width: 28, height: 28, border: "1px solid #E5E2D9", borderRadius: 6, background: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#9E9C93", fontSize: 14, flexShrink: 0 }}
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto" }}>
          {alerts.length === 0 ? (
            <div style={{ padding: 32, textAlign: "center", fontSize: 12, color: "#9E9C93" }}>No notifications</div>
          ) : alerts.map(alert => (
            <div
              key={alert.id}
              onClick={() => handleClick(alert)}
              style={{
                display: "flex", alignItems: "flex-start", gap: 12,
                padding: "12px 14px",
                borderBottom: "1px solid #F4F2EC",
                borderLeft: `3px solid ${borderColor(alert.level)}`,
                cursor: "pointer",
                background: alert.read ? "#fff" : "#FAFAF8",
                transition: "background 0.1s",
              }}
              onMouseEnter={e => (e.currentTarget.style.background = "#F4F2EC")}
              onMouseLeave={e => (e.currentTarget.style.background = alert.read ? "#fff" : "#FAFAF8")}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#18170F", marginBottom: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {alert.title}
                </div>
                {alert.detail && (
                  <div style={{ fontSize: 11, color: "#6B6860", marginBottom: 3, lineHeight: 1.4 }}>{alert.detail}</div>
                )}
                <div style={{ fontSize: 10, color: "#A8A59C" }}>{timeAgo(alert.createdAt)}</div>
              </div>
              {!alert.read && (
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#2563EB", flexShrink: 0, marginTop: 4 }} />
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{ padding: "12px 18px", borderTop: "1px solid #E5E2D9", flexShrink: 0 }}>
          <Link
            href="/alerts"
            onClick={onClose}
            style={{ fontSize: 12, color: "#006D6B", fontWeight: 600, textDecoration: "none" }}
          >
            View all alerts →
          </Link>
        </div>
      </div>
    </>
  );
}

const NAV = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/portfolio", label: "Portfolio" },
  { href: "/alerts",    label: "Alerts" },
];

type MemberRole = "PMO" | "CEO" | "STAKEHOLDER" | "DEV" | "ADMIN";

const ROLE_META: Record<MemberRole, { label: string; color: string; bg: string }> = {
  PMO:         { label: "PMO",         color: "#fff",    bg: "#18170F" },
  CEO:         { label: "CEO",         color: "#fff",    bg: "#7C3AED" },
  STAKEHOLDER: { label: "Stakeholder", color: "#fff",    bg: "#0D9488" },
  DEV:         { label: "Dev",         color: "#fff",    bg: "#2563EB" },
  ADMIN:       { label: "Admin",       color: "#fff",    bg: "#DC2626" },
};

interface Props {
  orgName:  string;
  initials: string;
  role:     MemberRole;
}

export default function TopbarClient({ orgName, initials, role }: Props) {
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen]   = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [drawerOpen, setDrawerOpen]   = useState(false);
  const [aiChatOpen, setAiChatOpen]   = useState(false);
  const router   = useRouter();
  const pathname = usePathname();
  const { signOut } = useClerk();

  const { unreadCount: alertCount } = useAlerts();
  const { lastUpdated, refresh: refreshAll } = useApp();

  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  const isActive = (href: string) =>
    pathname === href || (href !== "/dashboard" && pathname.startsWith(href + "/"));

  // ⌘K / Ctrl+K to open search, ? to open shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(o => !o);
      }
      // "?" key — only when no input is focused
      if (e.key === "?" && !["INPUT","TEXTAREA","SELECT"].includes((e.target as HTMLElement)?.tagName)) {
        e.preventDefault();
        setShortcutsOpen(o => !o);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <>
      {/* Logo */}
      <div style={{ display: "flex", alignItems: "center", gap: 5, flexShrink: 0 }}>
        <div className="g-dot-pulse" style={{ width: 8, height: 8, borderRadius: "50%", background: "#006D6B", flexShrink: 0 }} />
        <span style={{ fontSize: 15, fontWeight: 700, color: "#18170F", letterSpacing: "-.5px" }}>
          Roadmap<span style={{ color: "#006D6B" }}>AI</span>
        </span>
      </div>

      {/* Org pill */}
      <div style={{
        display: "flex", alignItems: "center", gap: 5,
        padding: "4px 10px", border: "1px solid #E5E2D9",
        borderRadius: 20, fontSize: 11, color: "#5C5A52",
        cursor: "pointer", background: "#F8F7F3",
      }}>
        <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
          <path d="M6 1a2.5 2.5 0 100 5 2.5 2.5 0 000-5zM2 11c0-2.2 1.8-4 4-4s4 1.8 4 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
        </svg>
        {orgName}
        <svg width="9" height="9" viewBox="0 0 10 10" fill="none">
          <path d="M2 3.5l3 3 3-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
        </svg>
      </div>

      {/* Nav links */}
      <nav style={{ display: "flex", alignItems: "center", gap: 2, marginLeft: 8 }}>
        {NAV.map(n => {
          const active = isActive(n.href);
          return (
            <Link key={n.href} href={n.href} style={{
              padding: "6px 12px", borderRadius: 7, fontSize: 12,
              fontWeight: active ? 500 : 500,
              color: active ? "#18170F" : "#5C5A52",
              background: active ? "#F0EEE8" : "transparent",
              textDecoration: "none", transition: "all .1s", letterSpacing: "-.1px",
            }}>
              {n.label}
            </Link>
          );
        })}
      </nav>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Right side */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>

        {/* Search button */}
        <button
          onClick={() => setSearchOpen(true)}
          style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "5px 12px", height: 32,
            background: "#F4F2EC", border: "1px solid #E5E2D9",
            borderRadius: 8, cursor: "pointer", fontFamily: "inherit",
            color: "#9E9C93", fontSize: 12,
            transition: "border-color .12s",
          }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          Search…
          <kbd style={{ fontSize: 10, color: "#CCC9BF", background: "#F0EEE8", border: "1px solid #E5E2D9", borderRadius: 4, padding: "1px 5px" }}>⌘K</kbd>
        </button>

        {/* Role badge */}
        {(() => {
          const meta = ROLE_META[role] ?? ROLE_META.PMO;
          return (
            <div style={{
              padding: "4px 12px", borderRadius: 6,
              background: meta.bg, color: meta.color,
              fontSize: 11, fontWeight: 700,
              letterSpacing: "-.1px",
            }}>
              {meta.label}
            </div>
          );
        })()}

        {/* Last updated + refresh */}
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          {lastUpdated && (
            <span style={{ fontSize: 10, color: "#CCC9BF", whiteSpace: "nowrap" }}>
              {lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
          <button
            onClick={refreshAll}
            title="Refresh data"
            style={{
              width: 24, height: 24, border: "none", background: "none",
              cursor: "pointer", borderRadius: 6, display: "flex",
              alignItems: "center", justifyContent: "center",
              color: "#CCC9BF", fontSize: 13, transition: "color .1s, background .1s",
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = "#5C5A52"; (e.currentTarget as HTMLButtonElement).style.background = "#F0EEE8"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = "#CCC9BF"; (e.currentTarget as HTMLButtonElement).style.background = "none"; }}
          >
            ↺
          </button>
        </div>

        {/* Shortcuts help */}
        <button
          onClick={() => setShortcutsOpen(true)}
          title="Keyboard shortcuts (?)"
          style={{
            width: 32, height: 32, border: "1px solid #E5E2D9",
            borderRadius: 8, background: "none", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "#9E9C93", fontSize: 13, fontWeight: 700, fontFamily: "inherit",
            transition: "background .1s, color .1s",
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "#F0EEE8"; (e.currentTarget as HTMLButtonElement).style.color = "#5C5A52"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "none"; (e.currentTarget as HTMLButtonElement).style.color = "#9E9C93"; }}
        >
          ?
        </button>

        {/* AI Chat */}
        <button
          onClick={() => setAiChatOpen(o => !o)}
          title="Guardian AI Assistant"
          style={{
            width: 32, height: 32, border: "1px solid #E5E2D9",
            borderRadius: 8, background: aiChatOpen ? "#006D6B" : "none",
            cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: aiChatOpen ? "#fff" : "#9E9C93", fontSize: 15, fontWeight: 700,
            transition: "background .1s, color .1s",
          }}
          onMouseEnter={e => { if (!aiChatOpen) { (e.currentTarget as HTMLButtonElement).style.background = "#F0EEE8"; (e.currentTarget as HTMLButtonElement).style.color = "#5C5A52"; } }}
          onMouseLeave={e => { if (!aiChatOpen) { (e.currentTarget as HTMLButtonElement).style.background = "none";    (e.currentTarget as HTMLButtonElement).style.color = "#9E9C93"; } }}
        >
          ✦
        </button>

        {/* Bell */}
        <button
          onClick={() => setDrawerOpen(o => !o)}
          style={{
            position: "relative", width: 32, height: 32,
            border: "1px solid #E5E2D9", borderRadius: 8,
            background: "none", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "#5C5A52", transition: "background .1s",
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>
          {alertCount > 0 && (
            <span style={{
              position: "absolute", top: -4, right: -4,
              width: 16, height: 16, borderRadius: "50%",
              background: "#DC2626", color: "#fff",
              fontSize: 9, fontWeight: 700,
              display: "flex", alignItems: "center", justifyContent: "center",
              border: "2px solid #fff",
            }}>
              {alertCount > 9 ? "9+" : alertCount}
            </span>
          )}
        </button>

        {/* Avatar / user menu */}
        <div style={{ position: "relative" }}>
          <button
            onClick={() => setUserMenuOpen(o => !o)}
            style={{
              width: 32, height: 32, borderRadius: "50%",
              background: "#006D6B", color: "#fff",
              border: "none", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 12, fontWeight: 700, fontFamily: "inherit",
              flexShrink: 0,
            }}
          >
            {initials}
          </button>
          {userMenuOpen && (
            <div style={{
              position: "absolute", top: "calc(100% + 6px)", right: 0,
              background: "#fff", border: "1px solid #E5E2D9",
              borderRadius: 8, boxShadow: "0 4px 16px rgba(24,23,15,.07)",
              minWidth: 148, zIndex: 100, overflow: "hidden",
            }}>
              <Link
                href="/settings"
                onClick={() => setUserMenuOpen(false)}
                style={{
                  display: "block", padding: "9px 14px",
                  fontSize: 12, color: "#18170F", textDecoration: "none",
                  borderBottom: "1px solid #E5E2D9",
                }}
              >
                Settings
              </Link>
              <button
                onClick={() => signOut({ redirectUrl: "/sign-in" })}
                style={{
                  display: "block", width: "100%", padding: "9px 14px",
                  fontSize: 12, color: "#DC2626", background: "none",
                  border: "none", cursor: "pointer", fontFamily: "inherit",
                  textAlign: "left",
                }}
              >
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Click outside to close user menu */}
      {userMenuOpen && (
        <div
          style={{ position: "fixed", inset: 0, zIndex: 99 }}
          onClick={() => setUserMenuOpen(false)}
        />
      )}

      {/* Global Search Modal */}
      <GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} />

      {/* Keyboard Shortcuts Modal */}
      <KeyboardShortcutsModal open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />

      {/* Notification Drawer */}
      <NotificationDrawer
        open={drawerOpen}
        onClose={closeDrawer}
      />

      {/* Guardian AI Chat Panel */}
      <AIChatPanel
        open={aiChatOpen}
        onClose={() => setAiChatOpen(false)}
      />
    </>
  );
}
