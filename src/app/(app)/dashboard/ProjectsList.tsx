"use client";
import { useState } from "react";
import Link from "next/link";

const HEALTH_META: Record<string, { label: string; color: string; bg: string; border: string }> = {
  ON_TRACK:    { label: "On Track",    color: "#059669", bg: "#ECFDF5", border: "#A7F3D0" },
  AT_RISK:     { label: "At Risk",     color: "#D97706", bg: "#FFFBEB", border: "#FDE68A" },
  OFF_TRACK:   { label: "Off Track",   color: "#DC2626", bg: "#FEF2F2", border: "#FECACA" },
  COMPLETED:   { label: "Completed",   color: "#2563EB", bg: "#EFF6FF", border: "#BFDBFE" },
  NOT_STARTED: { label: "Not Started", color: "#5C5A52", bg: "#F8FAFC", border: "#E5E2D9" },
};

const PAGE_SIZE = 10;

export default function ProjectsList({ projectStats }: { projectStats: any[] }) {
  const [page,   setPage]   = useState(1);
  const [search, setSearch] = useState("");

  const filtered = projectStats.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div style={{ background: "#fff", border: "1px solid #E5E2D9", borderRadius: 14, overflow: "hidden" }}>
      {/* Header */}
      <div style={{ padding: "14px 20px", borderBottom: "1px solid #F4F2EC", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: "#18170F" }}>
          Projects <span style={{ fontSize: 11, color: "#9E9C93", fontWeight: 400 }}>{filtered.length} total</span>
        </span>
        <input
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
          placeholder="Search projects…"
          style={{ background: "#F8FAFC", border: "1px solid #E5E2D9", borderRadius: 8, padding: "6px 12px", fontSize: 12, outline: "none", width: 200, color: "#18170F" }}
        />
      </div>

      {/* Table header */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 110px 160px 80px 80px 80px 80px", padding: "8px 20px", background: "#F8FAFC", borderBottom: "1px solid #F4F2EC" }}>
        {["Project", "Health", "Phase", "Progress", "Features", "Blocked", ""].map(h => (
          <div key={h} style={{ fontSize: 10, fontWeight: 700, color: "#9E9C93", textTransform: "uppercase", letterSpacing: "0.06em" }}>{h}</div>
        ))}
      </div>

      {/* Rows */}
      {paginated.length === 0 ? (
        <div style={{ padding: "32px 20px", textAlign: "center", color: "#9E9C93", fontSize: 13 }}>No projects found</div>
      ) : (
        paginated.map(p => {
          const h = HEALTH_META[p.health] ?? HEALTH_META.NOT_STARTED;
          const daysLeft = p.daysLeft;
          return (
            <div key={p.id} style={{ display: "grid", gridTemplateColumns: "1fr 110px 160px 80px 80px 80px 80px", padding: "12px 20px", borderBottom: "1px solid #F8FAFC", alignItems: "center" }}
              onMouseEnter={e => (e.currentTarget.style.background = "#FDFCFA")}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
            >
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#18170F", marginBottom: 2 }}>{p.name}</div>
                <div style={{ fontSize: 11, color: daysLeft < 0 ? "#DC2626" : "#9E9C93" }}>
                  {daysLeft < 0 ? `${Math.abs(daysLeft)}d overdue` : `${daysLeft}d left`}
                </div>
              </div>
              <div>
                <span style={{ fontSize: 10, fontWeight: 700, color: h.color, background: h.bg, border: `1px solid ${h.border}`, padding: "3px 8px", borderRadius: 6 }}>
                  {h.label}
                </span>
              </div>
              <div style={{ fontSize: 11, color: "#5C5A52", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {p.currentPhase ? (
                  <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: p.currentPhase.accent, flexShrink: 0, display: "inline-block" }} />
                    {p.currentPhase.sub || p.currentPhase.label}
                  </span>
                ) : "—"}
              </div>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{ flex: 1, height: 4, background: "#F4F2EC", borderRadius: 2, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: p.pct + "%", background: p.pct === 100 ? "#059669" : "#006D6B", borderRadius: 2 }} />
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 600, color: "#18170F", minWidth: 30 }}>{p.pct}%</span>
                </div>
              </div>
              <div style={{ fontSize: 12, color: "#5C5A52" }}>{p.done}/{p.allF.length}</div>
              <div style={{ fontSize: 12, color: p.blocked > 0 ? "#DC2626" : "#9E9C93", fontWeight: p.blocked > 0 ? 700 : 400 }}>
                {p.blocked > 0 ? `⚠ ${p.blocked}` : "—"}
              </div>
              <div>
                <Link href={`/projects/${p.id}`} style={{ fontSize: 11, color: "#006D6B", fontWeight: 600, textDecoration: "none", padding: "5px 10px", background: "#ECFDF5", borderRadius: 6, border: "1px solid #A7F3D0" }}>
                  Open →
                </Link>
              </div>
            </div>
          );
        })
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ padding: "12px 20px", borderTop: "1px solid #F4F2EC", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 12, color: "#9E9C93" }}>
            Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
          </span>
          <div style={{ display: "flex", gap: 6 }}>
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              style={{ padding: "5px 12px", background: "#F8FAFC", border: "1px solid #E5E2D9", borderRadius: 6, fontSize: 12, cursor: page === 1 ? "default" : "pointer", color: page === 1 ? "#CCC9BF" : "#5C5A52", fontFamily: "inherit" }}
            >← Prev</button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
              <button key={n} onClick={() => setPage(n)}
                style={{ padding: "5px 10px", background: n === page ? "#006D6B" : "#F8FAFC", border: `1px solid ${n === page ? "#006D6B" : "#E5E2D9"}`, borderRadius: 6, fontSize: 12, cursor: "pointer", color: n === page ? "#fff" : "#5C5A52", fontFamily: "inherit", fontWeight: n === page ? 700 : 400 }}
              >{n}</button>
            ))}
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              style={{ padding: "5px 12px", background: "#F8FAFC", border: "1px solid #E5E2D9", borderRadius: 6, fontSize: 12, cursor: page === totalPages ? "default" : "pointer", color: page === totalPages ? "#CCC9BF" : "#5C5A52", fontFamily: "inherit" }}
            >Next →</button>
          </div>
        </div>
      )}
    </div>
  );
}