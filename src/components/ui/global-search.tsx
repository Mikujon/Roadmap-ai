"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";

interface SearchResult {
  type: "project" | "sprint" | "feature" | "page";
  id: string;
  title: string;
  subtitle?: string;
  href: string;
  accent?: string;
}

interface GlobalSearchProps {
  open: boolean;
  onClose: () => void;
}

const PAGE_LINKS: SearchResult[] = [
  { type: "page", id: "dashboard", title: "Dashboard", subtitle: "Overview & KPIs", href: "/dashboard", accent: "D" },
  { type: "page", id: "portfolio", title: "Portfolio", subtitle: "All projects overview", href: "/portfolio", accent: "P" },
  { type: "page", id: "cost", title: "Cost Control", subtitle: "Budget & financials", href: "/cost", accent: "$" },
  { type: "page", id: "alerts", title: "Alerts", subtitle: "Project alerts", href: "/alerts", accent: "!" },
  { type: "page", id: "settings", title: "Settings", subtitle: "Account & org settings", href: "/settings", accent: "⚙" },
  { type: "page", id: "team", title: "Team", subtitle: "Members & roles", href: "/settings/team", accent: "👥" },
  { type: "page", id: "billing", title: "Billing", subtitle: "Plan & subscription", href: "/settings/billing", accent: "💳" },
  { type: "page", id: "archive", title: "Archive", subtitle: "Closed projects", href: "/archive", accent: "📁" },
];

export function GlobalSearch({ open, onClose }: GlobalSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selected, setSelected] = useState(0);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Reset on open
  useEffect(() => {
    if (open) {
      setQuery("");
      setSelected(0);
      setResults(PAGE_LINKS);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Search
  useEffect(() => {
    if (!query.trim()) {
      setResults(PAGE_LINKS);
      return;
    }
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        if (res.ok) {
          const data = await res.json();
          setResults(data.results ?? []);
        }
      } catch {
        // fallback: filter static pages
        const q = query.toLowerCase();
        setResults(PAGE_LINKS.filter(p => p.title.toLowerCase().includes(q) || (p.subtitle ?? "").toLowerCase().includes(q)));
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [query]);

  const navigate = useCallback((href: string) => {
    onClose();
    router.push(href);
  }, [onClose, router]);

  // Keyboard nav
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") { onClose(); return; }
      if (e.key === "ArrowDown") { e.preventDefault(); setSelected(s => Math.min(s + 1, results.length - 1)); }
      if (e.key === "ArrowUp")   { e.preventDefault(); setSelected(s => Math.max(s - 1, 0)); }
      if (e.key === "Enter" && results[selected]) navigate(results[selected].href);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, results, selected, navigate, onClose]);

  if (!open) return null;

  const TYPE_ICON: Record<string, string> = {
    project: "📋", sprint: "🏃", feature: "✦", page: "→",
  };

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 9000,
        background: "rgba(15,23,42,0.45)", backdropFilter: "blur(4px)",
        display: "flex", alignItems: "flex-start", justifyContent: "center",
        paddingTop: "12vh",
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: "100%", maxWidth: 600,
          background: "#fff",
          borderRadius: 14,
          boxShadow: "0 24px 64px rgba(0,0,0,0.22)",
          border: "1px solid #E5E2D9",
          overflow: "hidden",
          animation: "slideDown 0.18s ease",
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Input */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 18px", borderBottom: "1px solid #F4F2EC" }}>
          <span style={{ fontSize: 16, color: "#9E9C93" }}>🔍</span>
          <input
            ref={inputRef}
            value={query}
            onChange={e => { setQuery(e.target.value); setSelected(0); }}
            placeholder="Search projects, sprints, features, pages…"
            style={{
              flex: 1, border: "none", outline: "none", fontSize: 15,
              color: "#18170F", background: "transparent",
              fontFamily: "inherit",
            }}
          />
          {loading && <span style={{ fontSize: 11, color: "#9E9C93" }}>Searching…</span>}
          <kbd style={{ fontSize: 11, color: "#9E9C93", background: "#F8F7F3", border: "1px solid #E5E2D9", borderRadius: 5, padding: "2px 6px" }}>ESC</kbd>
        </div>

        {/* Results */}
        <div style={{ maxHeight: 380, overflowY: "auto" }}>
          {results.length === 0 && (
            <div style={{ padding: "32px 18px", textAlign: "center", color: "#9E9C93", fontSize: 13 }}>
              No results for "{query}"
            </div>
          )}
          {results.map((r, i) => (
            <button
              key={r.id}
              onClick={() => navigate(r.href)}
              style={{
                width: "100%", display: "flex", alignItems: "center", gap: 12,
                padding: "11px 18px",
                background: i === selected ? "#EDFAF9" : "transparent",
                border: "none", cursor: "pointer", textAlign: "left",
                fontFamily: "inherit",
                borderBottom: i < results.length - 1 ? "1px solid #F8F7F3" : "none",
                transition: "background 0.12s",
              }}
              onMouseEnter={() => setSelected(i)}
            >
              <span style={{ fontSize: 14, width: 20, textAlign: "center", flexShrink: 0 }}>
                {TYPE_ICON[r.type] ?? "→"}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#18170F", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.title}</div>
                {r.subtitle && <div style={{ fontSize: 11, color: "#5C5A52", marginTop: 1 }}>{r.subtitle}</div>}
              </div>
              <span style={{
                fontSize: 10, fontWeight: 700, color: "#006D6B",
                background: "#EDFAF9", border: "1px solid #99F6E4",
                borderRadius: 5, padding: "2px 6px", textTransform: "uppercase",
                letterSpacing: "0.05em", flexShrink: 0,
              }}>
                {r.type}
              </span>
            </button>
          ))}
        </div>

        {/* Footer */}
        <div style={{ padding: "10px 18px", borderTop: "1px solid #F4F2EC", display: "flex", gap: 16, alignItems: "center" }}>
          <span style={{ fontSize: 11, color: "#9E9C93" }}>↑↓ navigate</span>
          <span style={{ fontSize: 11, color: "#9E9C93" }}>↵ open</span>
          <span style={{ fontSize: 11, color: "#9E9C93", marginLeft: "auto" }}>
            <kbd style={{ background: "#F8F7F3", border: "1px solid #E5E2D9", borderRadius: 4, padding: "1px 5px", fontSize: 10 }}>⌘K</kbd> to open
          </span>
        </div>
      </div>

      <style>{`
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-16px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}
