"use client";
import Link from "next/link";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

export function Breadcrumb({ items }: { items: BreadcrumbItem[] }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "#A8A59C", marginBottom: 16 }}>
      {items.map((item, i) => (
        <span key={i} style={{ display: "flex", alignItems: "center", gap: 5 }}>
          {i > 0 && <span style={{ fontSize: 10 }}>›</span>}
          {item.href ? (
            <Link
              href={item.href}
              style={{ color: "#6B6860", textDecoration: "none" }}
              onMouseEnter={e => (e.currentTarget.style.textDecoration = "underline")}
              onMouseLeave={e => (e.currentTarget.style.textDecoration = "none")}
            >
              {item.label}
            </Link>
          ) : (
            <span style={{ color: "#18170F" }}>{item.label}</span>
          )}
        </span>
      ))}
    </div>
  );
}
