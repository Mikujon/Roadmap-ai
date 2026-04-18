"use client";
import { useState } from "react";
import Link from "next/link";

type HealthStatus = "OFF_TRACK" | "AT_RISK" | "ON_TRACK" | "COMPLETED" | "NOT_STARTED";

const PROJECT_STATUS_META: Record<string, { label: string; color: string; bg: string; border: string }> = {
  NOT_STARTED: { label: "Planning",   color: "#2563EB", bg: "#EFF6FF", border: "#BFDBFE" },
  ACTIVE:      { label: "Active",     color: "#059669", bg: "#F0FDF4", border: "#BBF7D0" },
  PAUSED:      { label: "On Hold",    color: "#D97706", bg: "#FFFBEB", border: "#FDE68A" },
  COMPLETED:   { label: "Completed",  color: "#006D6B", bg: "#EDFAF9", border: "#99F6E4" },
  CLOSED:      { label: "Cancelled",  color: "#DC2626", bg: "#FEF2F2", border: "#FECACA" },
  ARCHIVED:    { label: "Archived",   color: "#9E9C93", bg: "#F8F7F3", border: "#E5E2D9" },
};

interface RowData {
  id: string;
  name: string;
  projectStatus: string;
  healthStatus: HealthStatus;
  healthScore: number;
  progressNominal: number;
  budgetTotal: number;
  costActual: number;
  spi: number;
  cpi: number;
  teamLead: string;
  endDate: string;
  delayDays: number;
}

interface Props {
  rows: RowData[];
  criticalCount: number;
  atRiskCount: number;
  onTrackCount: number;
  avgCpi: number;
  budgetExposure: number;
  orgName: string;
  totalCount: number;
}

const DOT_COLOR: Record<HealthStatus, string> = {
  OFF_TRACK:   "#DC2626",
  AT_RISK:     "#D97706",
  ON_TRACK:    "#006D6B",
  COMPLETED:   "#2563EB",
  NOT_STARTED: "#CCC9BF",
};

const STATUS_LABEL: Record<HealthStatus, string> = {
  OFF_TRACK:   "Critico",
  AT_RISK:     "A rischio",
  ON_TRACK:    "In orario",
  COMPLETED:   "Completato",
  NOT_STARTED: "Non iniziato",
};

const STATUS_TAG_STYLE: Record<HealthStatus, { background: string; color: string; border: string }> = {
  OFF_TRACK:   { background: "#FEF2F2", color: "#DC2626", border: "#FECACA" },
  AT_RISK:     { background: "#FFFBEB", color: "#D97706", border: "#FDE68A" },
  ON_TRACK:    { background: "#F0FDF4", color: "#16A34A", border: "#BBF7D0" },
  COMPLETED:   { background: "#EFF6FF", color: "#2563EB", border: "#BFDBFE" },
  NOT_STARTED: { background: "#F8F7F3", color: "#9E9C93", border: "#E5E2D9" },
};

function fmtCurrency(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}

function spiColor(v: number) {
  return v >= 0.95 ? "#16A34A" : v >= 0.8 ? "#D97706" : "#DC2626";
}

type Filter = "all" | "critical" | "warn" | "ok";

export default function PortfolioClient({
  rows, criticalCount, atRiskCount, onTrackCount,
  avgCpi, budgetExposure, orgName, totalCount,
}: Props) {
  const [filter, setFilter] = useState<Filter>("all");

  const filtered = rows.filter(r => {
    if (filter === "critical") return r.healthStatus === "OFF_TRACK";
    if (filter === "warn")     return r.healthStatus === "AT_RISK";
    if (filter === "ok")       return r.healthStatus === "ON_TRACK" || r.healthStatus === "COMPLETED";
    return true;
  });

  const chips: { id: Filter; label: string; count: number }[] = [
    { id: "all",      label: `Tutti (${totalCount})`,          count: totalCount  },
    { id: "critical", label: `🔴 Critici (${criticalCount})`,  count: criticalCount },
    { id: "warn",     label: `🟡 A rischio (${atRiskCount})`,  count: atRiskCount   },
    { id: "ok",       label: `🟢 In orario (${onTrackCount})`, count: onTrackCount  },
  ];

  return (
    <>
      <style>{`
        .ptbl { width: 100%; border-collapse: collapse; font-size: 12px; }
        .ptbl th { background: #FAFAF8; border-bottom: 1px solid #E5E2D9; padding: 9px 12px; text-align: left; font-size: 10px; font-weight: 700; color: #9E9C93; text-transform: uppercase; letter-spacing: .07em; white-space: nowrap; }
        .ptbl th.r { text-align: right; }
        .ptbl td { padding: 11px 12px; border-bottom: 1px solid #F0EEE8; vertical-align: middle; white-space: nowrap; color: #18170F; }
        .ptbl td.r { text-align: right; }
        .ptbl tbody tr:hover td { background: #FAFAF8; cursor: pointer; }
        .ptbl tbody tr:last-child td { border-bottom: none; }
        .chip { display: inline-flex; align-items: center; padding: 5px 12px; border-radius: 20px; font-size: 12px; font-weight: 500; border: 1px solid #E5E2D9; background: #F8F7F3; color: #5C5A52; cursor: pointer; transition: all .12s; user-select: none; }
        .chip:hover { background: #F0EEE8; color: #18170F; }
        .chip.on { background: #18170F; color: #fff; border-color: #18170F; font-weight: 600; }
        .prog { height: 4px; background: #E5E2D9; border-radius: 99px; overflow: hidden; width: 80px; }
        .prog-fill { height: 100%; border-radius: 99px; }
        .tag { display: inline-flex; align-items: center; padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: 700; border: 1px solid transparent; white-space: nowrap; }
        .gbar { display: flex; align-items: center; gap: 10px; padding: 10px 14px; background: linear-gradient(to right, rgba(0,109,107,.05), transparent); border-top: 1px solid #BBF7D0; font-size: 12px; color: #18170F; }
        .g-dot { width: 7px; height: 7px; border-radius: 50%; background: #006D6B; flex-shrink: 0; animation: blink 2s infinite; }
        .g-txt { flex: 1; }
        .btn-sm { padding: 4px 10px; border: 1px solid #E5E2D9; border-radius: 6px; background: #fff; font-size: 11px; font-weight: 600; color: #5C5A52; cursor: pointer; font-family: inherit; transition: background .1s; }
        .btn-sm:hover { background: #F0EEE8; color: #18170F; }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:.4} }
      `}</style>

      <div style={{ padding: "20px 24px" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
          <div>
            <h1 style={{ fontSize: 18, fontWeight: 700, color: "#18170F", letterSpacing: "-.3px", margin: 0, marginBottom: 3 }}>Portfolio</h1>
            <p style={{ fontSize: 12, color: "#5C5A52", margin: 0 }}>{orgName} · {totalCount} active projects</p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Link
              href="/projects/new"
              style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 14px", background: "#006D6B", color: "#fff", borderRadius: 8, fontSize: 12, fontWeight: 600, textDecoration: "none" }}
            >
              + New Project
            </Link>
          </div>
        </div>

        {/* Chip filters */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
          {chips.map(c => (
            <div
              key={c.id}
              className={`chip${filter === c.id ? " on" : ""}`}
              onClick={() => setFilter(c.id)}
            >
              {c.label}
            </div>
          ))}
        </div>

        {/* Table card */}
        {rows.length === 0 ? (
          <div style={{ background: "#fff", border: "1px solid #E5E2D9", borderRadius: 10, textAlign: "center", padding: "80px 0" }}>
            <p style={{ fontSize: 14, color: "#9E9C93", marginBottom: 16 }}>No active projects</p>
            <Link href="/projects/new" style={{ padding: "9px 20px", background: "#006D6B", color: "#fff", borderRadius: 8, fontSize: 13, fontWeight: 600, textDecoration: "none" }}>
              Create first project
            </Link>
          </div>
        ) : (
          <div style={{ background: "#fff", border: "1px solid #E5E2D9", borderRadius: 10, overflow: "hidden" }}>
            <table className="ptbl">
              <thead>
                <tr>
                  <th>Project</th>
                  <th>Status</th>
                  <th>Progress</th>
                  <th className="r">Budget</th>
                  <th className="r">SPI</th>
                  <th className="r">CPI</th>
                  <th className="r">Score</th>
                  <th>Team Lead</th>
                  <th>Deadline</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => {
                  const dot    = DOT_COLOR[r.healthStatus];
                  const tag    = STATUS_TAG_STYLE[r.healthStatus];
                  const label  = STATUS_LABEL[r.healthStatus];
                  const hsC    = r.healthScore >= 80 ? "#16A34A" : r.healthScore >= 60 ? "#D97706" : "#DC2626";
                  const endC   = r.delayDays > 0 ? "#DC2626" : r.delayDays > -7 ? "#D97706" : "#16A34A";
                  const progC  = r.healthStatus === "OFF_TRACK" ? "#DC2626" : r.healthStatus === "AT_RISK" ? "#D97706" : "#006D6B";
                  const budgetStr = r.budgetTotal > 0
                    ? `${fmtCurrency(r.costActual)} / ${fmtCurrency(r.budgetTotal)}`
                    : fmtCurrency(r.costActual);
                  const budgetColor = r.budgetTotal > 0 && r.costActual > r.budgetTotal ? "#DC2626" : "#18170F";
                  const isCritical = r.healthStatus === "OFF_TRACK";

                  return (
                    <tr key={r.id}>
                      <td style={{ minWidth: 160 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <div style={{ width: 7, height: 7, borderRadius: "50%", background: dot, flexShrink: 0 }} />
                          <Link href={`/projects/${r.id}`} style={{ fontSize: 12, fontWeight: 600, color: "#18170F", textDecoration: "none" }}>
                            {r.name}
                          </Link>
                        </div>
                      </td>
                      <td>
                        {(() => {
                          const ps = PROJECT_STATUS_META[r.projectStatus] ?? PROJECT_STATUS_META.NOT_STARTED;
                          return (
                            <span style={{ display: "inline-flex", alignItems: "center", padding: "2px 8px", borderRadius: 4, fontSize: 10, fontWeight: 700, border: `1px solid ${ps.border}`, background: ps.bg, color: ps.color, whiteSpace: "nowrap" }}>
                              {ps.label}
                            </span>
                          );
                        })()}
                      </td>
                      <td style={{ minWidth: 110 }}>
                        <div style={{ fontSize: 11, marginBottom: 3, color: "#5C5A52" }}>{r.progressNominal}%</div>
                        <div className="prog">
                          <div className="prog-fill" style={{ width: r.progressNominal + "%", background: progC }} />
                        </div>
                      </td>
                      <td className="r" style={{ fontFamily: "var(--mono, monospace)", fontSize: 11, color: budgetColor }}>
                        {budgetStr}
                      </td>
                      <td className="r" style={{ fontFamily: "var(--mono, monospace)", fontWeight: 700, fontSize: 12, color: spiColor(r.spi) }}>
                        {r.spi.toFixed(2)}
                      </td>
                      <td className="r" style={{ fontFamily: "var(--mono, monospace)", fontWeight: 700, fontSize: 12, color: spiColor(r.cpi) }}>
                        {r.cpi.toFixed(2)}
                      </td>
                      <td className="r" style={{ fontWeight: 800, color: hsC, fontSize: 13 }}>
                        {r.healthScore}
                      </td>
                      <td style={{ fontSize: 12, color: "#5C5A52" }}>{r.teamLead}</td>
                      <td>
                        <span style={{ fontSize: 11, fontWeight: 600, color: endC }}>
                          {fmtDate(r.endDate)}
                          {r.delayDays > 0 && <span style={{ fontSize: 10, marginLeft: 4, opacity: 0.8 }}>+{r.delayDays}d</span>}
                        </span>
                      </td>
                      <td>
                        <Link href={`/projects/${r.id}`}>
                          <button
                            className="btn-sm"
                            style={isCritical ? { background: "#FEF2F2", color: "#DC2626", borderColor: "#FECACA" } : {}}
                          >
                            {isCritical ? "⚠ Open" : "Open"}
                          </button>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Guardian bar */}
            <div className="gbar">
              <div className="g-dot" />
              <div className="g-txt">
                <strong>Portfolio AI</strong>
                {criticalCount > 0
                  ? ` — ${criticalCount} critical project${criticalCount > 1 ? "s" : ""} require immediate action`
                  : " — all projects within acceptable parameters"
                }
                {" · "}Avg CPI: <strong style={{ fontFamily: "monospace" }}>{avgCpi.toFixed(2)}</strong>
                {budgetExposure > 0 && (
                  <> · Budget exposure: <strong style={{ color: "#DC2626", fontFamily: "monospace" }}>+{fmtCurrency(budgetExposure)}</strong></>
                )}
              </div>
              <button className="btn-sm">Report →</button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
