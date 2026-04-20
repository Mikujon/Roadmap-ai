"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const SUB_ITEMS = [
  { href: "/portfolio/gantt",   label: "Gantt" },
  { href: "/portfolio/quarter", label: "Quarter View" },
];

export default function PortfolioSubNav() {
  const pathname = usePathname();
  const isUnderPortfolio = pathname.startsWith("/portfolio");
  if (!isUnderPortfolio) return null;

  return (
    <div style={{ paddingLeft: 20 }}>
      {SUB_ITEMS.map(item => {
        const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
        return (
          <Link
            key={item.href}
            href={item.href}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "5px 10px", borderRadius: 7, textDecoration: "none",
              fontSize: 11, margin: "1px 6px",
              fontWeight: isActive ? 600 : 400,
              color:      isActive ? "#18170F" : "#9E9C93",
              background: isActive ? "#F0EEE8" : "transparent",
              transition: "background .1s, color .1s",
            }}
          >
            <span style={{ width: 4, height: 4, borderRadius: "50%", background: isActive ? "#18170F" : "#CCC9BF", flexShrink: 0 }} />
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}
