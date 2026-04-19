"use client";
import { useState } from "react";

interface ClosureReportData {
  executiveSummary:     string;
  deliveryStatus:       "on_time" | "delayed" | "early";
  overallRating:        "excellent" | "good" | "fair" | "poor";
  scopeDelivery:        { pct: number; summary: string };
  schedulePerformance:  { spi: number; summary: string };
  costPerformance:      { cpi: number; summary: string };
  lessonsLearned:       string[];
  recommendations:      string[];
  achievements:         string[];
  risks:                string[];
}

const RATING_META = {
  excellent: { color: "#059669", bg: "#ECFDF5", label: "Excellent" },
  good:      { color: "#2563EB", bg: "#EFF6FF", label: "Good" },
  fair:      { color: "#D97706", bg: "#FFFBEB", label: "Fair" },
  poor:      { color: "#DC2626", bg: "#FEF2F2", label: "Poor" },
};

const DELIVERY_META = {
  on_time: { color: "#059669", label: "On Time" },
  early:   { color: "#2563EB", label: "Early" },
  delayed: { color: "#DC2626", label: "Delayed" },
};

export default function ClosureReport({ projectName, statusLogs }: { projectName: string; statusLogs: any[] }) {
  const [open, setOpen] = useState(false);

  // Find AI Guardian report
  const reportLog = statusLogs.find(l => l.changedBy === "AI Guardian" && l.note);
  if (!reportLog) return null;

  let report: ClosureReportData;
  try {
    report = JSON.parse(reportLog.note);
  } catch {
    return null;
  }

  const rating   = RATING_META[report.overallRating]   ?? RATING_META.fair;
  const delivery = DELIVERY_META[report.deliveryStatus] ?? DELIVERY_META.delayed;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 14px", background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 8, fontSize: 12, fontWeight: 600, color: "#475569", cursor: "pointer", fontFamily: "inherit" }}
      >
        📋 Closure Report
      </button>

      {open && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} onClick={() => setOpen(false)}>
          <div style={{ background: "#fff", borderRadius: 16, width: "100%", maxWidth: 680, maxHeight: "90vh", overflowY: "auto", boxShadow: "0 24px 60px rgba(0,0,0,0.15)" }} onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div style={{ padding: "24px 28px", borderBottom: "1px solid #F1F5F9", display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 4 }}>AI Closure Report</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: "#0F172A", letterSpacing: "-0.3px" }}>{projectName}</div>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: rating.color, background: rating.bg, padding: "4px 10px", borderRadius: 20 }}>{rating.label}</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: delivery.color, background: "#F8FAFC", padding: "4px 10px", borderRadius: 20, border: "1px solid #E2E8F0" }}>{delivery.label}</span>
                <button onClick={() => setOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#94A3B8", fontSize: 18, marginLeft: 4 }}>✕</button>
              </div>
            </div>

            <div style={{ padding: "24px 28px", display: "flex", flexDirection: "column", gap: 20 }}>
              {/* Executive Summary */}
              <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 12, padding: "16px 20px" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8 }}>Executive Summary</div>
                <p style={{ fontSize: 13, color: "#0F172A", lineHeight: 1.6, margin: 0 }}>{report.executiveSummary}</p>
              </div>

              {/* KPIs */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                {[
                  { label: "Scope Delivery", value: report.scopeDelivery.pct + "%", sub: report.scopeDelivery.summary, color: report.scopeDelivery.pct >= 80 ? "#059669" : "#D97706" },
                  { label: "SPI", value: report.schedulePerformance.spi.toFixed(2), sub: report.schedulePerformance.summary, color: report.schedulePerformance.spi >= 0.9 ? "#059669" : "#DC2626" },
                  { label: "CPI", value: report.costPerformance.cpi.toFixed(2), sub: report.costPerformance.summary, color: report.costPerformance.cpi >= 0.9 ? "#059669" : "#DC2626" },
                ].map(k => (
                  <div key={k.label} style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 10, padding: "14px 16px" }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 6 }}>{k.label}</div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: k.color, letterSpacing: "-0.5px", marginBottom: 4 }}>{k.value}</div>
                    <div style={{ fontSize: 11, color: "#64748B", lineHeight: 1.4 }}>{k.sub}</div>
                  </div>
                ))}
              </div>

              {/* Achievements */}
              {report.achievements?.length > 0 && (
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#0F172A", marginBottom: 10 }}>🏆 Key Achievements</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {report.achievements.map((a, i) => (
                      <div key={i} style={{ display: "flex", gap: 10, padding: "10px 14px", background: "#ECFDF5", border: "1px solid #A7F3D0", borderRadius: 8 }}>
                        <span style={{ color: "#059669", flexShrink: 0 }}>✓</span>
                        <span style={{ fontSize: 13, color: "#0F172A" }}>{a}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Lessons Learned */}
              {report.lessonsLearned?.length > 0 && (
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#0F172A", marginBottom: 10 }}>📚 Lessons Learned</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {report.lessonsLearned.map((l, i) => (
                      <div key={i} style={{ display: "flex", gap: 10, padding: "10px 14px", background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 8 }}>
                        <span style={{ color: "#2563EB", flexShrink: 0, fontWeight: 700 }}>{i + 1}.</span>
                        <span style={{ fontSize: 13, color: "#0F172A" }}>{l}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recommendations */}
              {report.recommendations?.length > 0 && (
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#0F172A", marginBottom: 10 }}>💡 Recommendations for Next Projects</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {report.recommendations.map((r, i) => (
                      <div key={i} style={{ display: "flex", gap: 10, padding: "10px 14px", background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 8 }}>
                        <span style={{ color: "#D97706", flexShrink: 0 }}>→</span>
                        <span style={{ fontSize: 13, color: "#0F172A" }}>{r}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Generated by */}
              <div style={{ textAlign: "center", fontSize: 11, color: "#CBD5E1", paddingTop: 8 }}>
                Generated by AI Guardian · {new Date(reportLog.createdAt).toLocaleDateString("en-GB")}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}