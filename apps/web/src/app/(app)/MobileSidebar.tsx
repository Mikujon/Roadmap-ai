"use client";
import { useState } from "react";
import Link from "next/link";

interface NavItem {
  href:   string;
  label:  string;
  icon:   string;
  accent?: boolean;
}

export default function MobileSidebar({ nav, userName, orgName, roleMeta }: {
  nav:      NavItem[];
  userName: string;
  orgName:  string;
  roleMeta: { color: string; bg: string; label: string };
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Hamburger button — only visible on mobile */}
      <button
        className="hamburger-btn"
        onClick={() => setOpen(true)}
        aria-label="Open menu"
      >
        ☰
      </button>

      {/* Overlay */}
      {open && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 400 }}
          onClick={() => setOpen(false)}
        />
      )}

      {/* Drawer */}
      <div style={{
        position:   "fixed",
        top:        0,
        left:       open ? 0 : -260,
        width:      240,
        height:     "100vh",
        background: "#fff",
        borderRight: "1px solid #E2E8F0",
        zIndex:     500,
        display:    "flex",
        flexDirection: "column",
        padding:    "0 12px",
        transition: "left 0.25s ease",
        boxShadow:  open ? "4px 0 24px rgba(0,0,0,0.12)" : "none",
      }}>
        {/* Header */}
        <div style={{ padding: "20px 8px 16px", borderBottom: "1px solid #F1F5F9", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 34, height: 34, background: "linear-gradient(135deg, #006D6B, #0891B2)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 13, color: "#fff" }}>RM</div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 14, color: "#0F172A" }}>RoadmapAI</div>
              <div style={{ fontSize: 10, color: "#94A3B8" }}>PMO Platform</div>
            </div>
          </div>
          <button onClick={() => setOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: "#94A3B8", padding: 4 }}>✕</button>
        </div>

        {/* Role badge */}
        <div style={{ padding: "10px 8px 8px" }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: roleMeta.color, background: roleMeta.bg, padding: "3px 10px", borderRadius: 20 }}>
            {roleMeta.label}
          </span>
        </div>

        {/* Nav */}
        <div style={{ fontSize: 9, fontWeight: 700, color: "#CBD5E1", letterSpacing: "0.08em", textTransform: "uppercase", padding: "4px 8px 6px" }}>Menu</div>
        <nav style={{ display: "flex", flexDirection: "column", gap: 2, flex: 1 }}>
          {nav.map(n => (
            <Link
              key={n.href + n.label}
              href={n.href}
              className={`nav-link${n.accent ? " accent" : ""}`}
              onClick={() => setOpen(false)}
            >
              <span className="sidebar-icon">{n.icon}</span>
              {n.label}
            </Link>
          ))}
        </nav>

        {/* User */}
        <div style={{ borderTop: "1px solid #F1F5F9", padding: "14px 8px", display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#006D6B", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: "#fff", flexShrink: 0 }}>
            {userName?.[0]?.toUpperCase() ?? "?"}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#0F172A", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{userName}</div>
            <div style={{ fontSize: 10, color: "#94A3B8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{orgName}</div>
          </div>
        </div>
      </div>
    </>
  );
}