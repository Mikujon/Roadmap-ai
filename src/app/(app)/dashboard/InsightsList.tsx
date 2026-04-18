"use client";

type Insight = { level: "red" | "yellow" | "green"; title: string; detail: string; projectId?: string; };

const INSIGHT_META = {
  red:    { color: "#DC2626", bg: "#FEF2F2", border: "#FECACA", dot: "#DC2626" },
  yellow: { color: "#D97706", bg: "#FFFBEB", border: "#FDE68A", dot: "#D97706" },
  green:  { color: "#059669", bg: "#ECFDF5", border: "#A7F3D0", dot: "#059669" },
};

export default function InsightsList({ insights }: { insights: Insight[] }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {insights.map((ins, i) => {
        const m = INSIGHT_META[ins.level];
        return (
          <div
            key={i}
            onClick={() => ins.projectId && (window.location.href = `/projects/${ins.projectId}`)}
            style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "12px 16px", borderRadius: 10, cursor: ins.projectId ? "pointer" : "default", background: m.bg, border: `1px solid ${m.border}`, transition: "opacity 0.15s" }}
            onMouseEnter={e => { if (ins.projectId) (e.currentTarget as HTMLDivElement).style.opacity = "0.85"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.opacity = "1"; }}
          >
            <span style={{ color: m.dot, fontSize: 8, marginTop: 4, flexShrink: 0 }}>●</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#18170F" }}>{ins.title}</div>
              <div style={{ fontSize: 11, color: "#5C5A52", marginTop: 2 }}>{ins.detail}</div>
            </div>
            {ins.projectId && <span style={{ fontSize: 11, color: m.color, fontWeight: 600, flexShrink: 0 }}>View →</span>}
          </div>
        );
      })}
    </div>
  );
}