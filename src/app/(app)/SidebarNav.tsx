"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavItem {
  href:   string;
  label:  string;
  icon:   React.ReactNode;
  badge?: number;
}

export function SidebarNavLinks({ items }: { items: NavItem[] }) {
  const pathname = usePathname();

  return (
    <>
      {items.map(n => {
        const isActive =
          pathname === n.href ||
          (n.href !== "/dashboard" && n.href !== "/settings" && pathname.startsWith(n.href + "/")) ||
          (n.href === "/settings" && pathname === "/settings");

        return (
          <Link
            key={n.href}
            href={n.href}
            style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "7px 11px", borderRadius: 8, textDecoration: "none",
              fontSize: 12, letterSpacing: "-.1px",
              fontWeight: isActive ? 600 : 500,
              color:      isActive ? "#18170F" : "#5C5A52",
              background: isActive ? "#F0EEE8"  : "transparent",
              margin: "1px 6px", transition: "background .1s, color .1s",
            }}
          >
            <span style={{
              width: 15, height: 15, flexShrink: 0, display: "flex",
              alignItems: "center", justifyContent: "center",
              opacity: isActive ? 0.8 : 0.5,
            }}>
              {n.icon}
            </span>
            <span style={{ flex: 1 }}>{n.label}</span>
            {n.badge != null && n.badge > 0 && (
              <span style={{
                background: "#DC2626", color: "#fff",
                borderRadius: 9, fontSize: 9, fontWeight: 700,
                padding: "1px 5px", minWidth: 16, textAlign: "center",
              }}>
                {n.badge > 9 ? "9+" : n.badge}
              </span>
            )}
          </Link>
        );
      })}
    </>
  );
}
