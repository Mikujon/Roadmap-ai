"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

export interface Decision {
  id: string;
  severity: "critical" | "warning";
  type: string;
  title: string;
  detail: string;
  projectId: string;
  projectName: string;
  fixTab: string;
}

const SEV: Record<string, { dot: string; bg: string; border: string; label: string }> = {
  critical: { dot: "#DC2626", bg: "#FEF2F2", border: "#FECACA", label: "Critical" },
  warning:  { dot: "#D97706", bg: "#FFFBEB", border: "#FDE68A", label: "Warning"  },
};

export default function DecisionsCard({ decisions }: { decisions: Decision[] }) {
  const [insights, setInsights] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(decisions.length > 0);

  useEffect(() => {
    if (!decisions.length) return;
    fetch("/api/generate/decisions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decisions }),
    })
      .then(r => r.json())
      .then(data => {
        const map: Record<string, string> = {};
        (data.results ?? []).forEach((r: { id: string; insight: string }) => {
          map[r.id] = r.insight;
        });
        setInsights(map);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (!decisions.length) {
    return (
      <div style={{ background: "#ECFDF5", border: "1px solid #A7F3D0", borderRadius: 14, padding: "20px 24px", display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ fontSize: 20 }}>✓</span>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#059669" }}>No decisions needed</div>
          <div style={{ fontSize: 12, color: "#64748B", marginTop: 2 }}>Portfolio is in good health — no critical actions required right now.</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 14, overflow: "hidden" }}>
      <div style={{ padding: "16px 22px", borderBottom: "1px solid #F1F5F9", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#0F172A" }}>Decisions needed</div>
          <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 2 }}>
            {decisions.filter(d => d.severity === "critical").length} critical · {decisions.filter(d => d.severity === "warning").length} warnings
          </div>
        </div>
        {loading && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "#94A3B8" }}>
            <div style={{ width: 12, height: 12, borderRadius: "50%", border: "2px solid #006D6B", borderTopColor: "transparent", animation: "spin 0.8s linear infinite" }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            AI analyzing…
          </div>
        )}
      </div>

      <div style={{ display: "flex", flexDirection: "column" }}>
        {decisions.map((d, i) => {
          const s = SEV[d.severity];
          const insight = insights[d.id];
          return (
            <div key={d.id} style={{ padding: "14px 22px", borderBottom: i < decisions.length - 1 ? "1px solid #F8FAFC" : "none", display: "flex", gap: 14, alignItems: "flex-start" }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: s.dot, flexShrink: 0, marginTop: 5 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 3 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#0F172A" }}>{d.title}</span>
                  <span style={{ fontSize: 10, fontWeight: 700, color: s.dot, background: s.bg, border: `1px solid ${s.border}`, padding: "1px 7px", borderRadius: 10 }}>{s.label}</span>
                </div>
                {insight ? (
                  <p style={{ fontSize: 12, color: "#475569", lineHeight: 1.55, margin: 0 }}>{insight}</p>
                ) : (
                  <p style={{ fontSize: 12, color: "#94A3B8", margin: 0 }}>{d.detail}</p>
                )}
              </div>
              <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                <Link
                  href={`/projects/${d.projectId}?tab=${d.fixTab}`}
                  style={{ fontSize: 11, fontWeight: 600, color: "#fff", background: "#006D6B", padding: "5px 12px", borderRadius: 7, textDecoration: "none" }}
                >
                  Fix →
                </Link>
                <Link
                  href={`/projects/${d.projectId}`}
                  style={{ fontSize: 11, fontWeight: 600, color: "#64748B", background: "#F8FAFC", border: "1px solid #E2E8F0", padding: "5px 12px", borderRadius: 7, textDecoration: "none" }}
                >
                  View
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
