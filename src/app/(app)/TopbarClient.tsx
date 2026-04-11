"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserButton } from "@clerk/nextjs";

type Role = "PMO" | "CEO" | "STK" | "DEV";

const ROLE_CONFIG: Record<Role, { label: string; activeStyle: React.CSSProperties }> = {
  PMO: { label: "PMO",         activeStyle: { background: "var(--text)",   color: "#fff" } },
  CEO: { label: "CEO",         activeStyle: { background: "var(--purple)", color: "#fff" } },
  STK: { label: "Stakeholder", activeStyle: { background: "var(--teal)",   color: "#fff" } },
  DEV: { label: "Dev",         activeStyle: { background: "var(--blue)",   color: "#fff" } },
};

interface TopbarClientProps {
  unreadCount:   number;
  initials:      string;
  preferredView: Role;
}

export default function TopbarClient({ unreadCount, initials, preferredView }: TopbarClientProps) {
  const [role, setRole]           = useState<Role>(preferredView);
  const [localUnread, setUnread]  = useState(unreadCount);
  const router = useRouter();

  const changeRole = async (r: Role) => {
    setRole(r);
    await fetch("/api/users/me", {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ preferredView: r }),
    });
    // Dispatch so DashboardClient can react without page reload
    window.dispatchEvent(new CustomEvent("rolechange", { detail: r }));
  };

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      {/* Role switcher */}
      <div style={{ display: "flex", border: "1px solid var(--border)", borderRadius: 20, overflow: "hidden" }}>
        {(Object.keys(ROLE_CONFIG) as Role[]).map(r => (
          <button
            key={r}
            onClick={() => changeRole(r)}
            style={{
              padding: "4px 11px",
              fontSize: 11,
              fontWeight: 500,
              cursor: "pointer",
              border: "none",
              fontFamily: "inherit",
              transition: ".12s",
              ...(role === r ? ROLE_CONFIG[r].activeStyle : { background: "none", color: "var(--text2)" }),
            }}
          >
            {ROLE_CONFIG[r].label}
          </button>
        ))}
      </div>

      {/* Alert bell */}
      <button
        onClick={() => { setUnread(0); router.push("/alerts"); }}
        style={{ width: 30, height: 30, border: "1px solid var(--border)", borderRadius: 7, background: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text2)", position: "relative", transition: ".12s", fontFamily: "inherit" }}
        onMouseEnter={e => (e.currentTarget.style.background = "var(--surface2)")}
        onMouseLeave={e => (e.currentTarget.style.background = "none")}
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M7 1.5A4 4 0 003 5.5v2.8L2 10h10l-1-1.7V5.5A4 4 0 007 1.5zM5.5 11a1.5 1.5 0 003 0" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
        </svg>
        {localUnread > 0 && (
          <span style={{ position: "absolute", top: -5, right: -5, background: "var(--red)", color: "#fff", borderRadius: "50%", width: 16, height: 16, fontSize: 9, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", border: "2px solid var(--surface)" }}>
            {localUnread > 9 ? "9+" : localUnread}
          </span>
        )}
      </button>

      {/* User button */}
      <UserButton />
    </div>
  );
}
