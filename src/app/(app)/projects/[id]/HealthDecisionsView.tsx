"use client";
import { useState, useEffect } from "react";
import { calculateHealth } from "@/lib/health";

const fmt = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);

interface DecisionItem {
  id: string;
  priority: "critical" | "warning" | "info";
  title: string;
  detail: string;
  impact?: string;
  action?: string;
  actionType?: "approve" | "assign" | "view" | "dismiss";
}

function buildDecisionFeed(project: any, allF: any[], guardianReport: any): DecisionItem[] {
  const items: DecisionItem[] = [];

  const totalDone    = allF.filter((f: any) => f.status === "DONE").length;
  const totalBlocked = allF.filter((f: any) => f.status === "BLOCKED").length;
  const totalInProg  = allF.filter((f: any) => f.status === "IN_PROGRESS").length;
  const pct          = allF.length ? Math.round((totalDone / allF.length) * 100) : 0;

  const startDate  = new Date(project.startDate);
  const endDate    = new Date(project.endDate);
  const now        = new Date();
  const totalDays  = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / 86400000));
  const elapsedDays = Math.max(0, Math.ceil((now.getTime() - startDate.getTime()) / 86400000));
  const daysLeft   = Math.ceil((endDate.getTime() - now.getTime()) / 86400000);
  const plannedPct = Math.min(100, Math.round((elapsedDays / totalDays) * 100));
  const scheduleGap = pct - plannedPct;

  const costActual    = project.assignments.reduce((s: number, a: any) => s + a.actualHours * a.resource.costPerHour, 0);
  const costEstimated = project.assignments.reduce((s: number, a: any) => s + a.estimatedHours * a.resource.costPerHour, 0);
  const budgetTotal   = project.budgetTotal || costEstimated;
  const costForecast  = pct > 5 ? (costActual / pct) * 100 : costEstimated;
  const delta         = costForecast - budgetTotal;

  const openRisks  = project.risks.filter((r: any) => r.status === "OPEN").length;
  const critRisks  = project.risks.filter((r: any) => r.status === "OPEN" && r.probability * r.impact >= 15).length;

  // Merge guardian AI items first
  if (guardianReport) {
    const alerts = guardianReport.alerts ?? [];
    alerts.slice(0, 3).forEach((a: any) => {
      items.push({
        id: a.id ?? `g-${Math.random()}`,
        priority: a.level === "critical" ? "critical" : a.level === "warning" ? "warning" : "info",
        title: a.title,
        detail: a.detail ?? "",
        impact: a.action,
        action: a.action,
        actionType: "view",
      });
    });
  }

  // Deterministic conditions (only if not already covered by Guardian)
  if (daysLeft < 0 && pct < 100) {
    items.push({ id: "overdue", priority: "critical", title: "Project is overdue", detail: `${Math.abs(daysLeft)} days past deadline with ${100 - pct}% of work remaining.`, impact: `Complete ${100 - pct}% of remaining features immediately.`, action: "View Execution", actionType: "view" });
  }
  if (totalBlocked >= 3) {
    items.push({ id: "blocked-many", priority: "critical", title: `${totalBlocked} features are blocked`, detail: `Multiple blockers are preventing sprint progress and increasing delivery risk.`, impact: "Unblocking now could recover schedule.", action: "View Execution", actionType: "view" });
  } else if (totalBlocked > 0) {
    items.push({ id: "blocked-few", priority: "warning", title: `${totalBlocked} feature${totalBlocked > 1 ? "s" : ""} blocked`, detail: "Blocked features require resolution to keep sprints on track.", action: "View Execution", actionType: "view" });
  }
  if (budgetTotal > 0 && delta > budgetTotal * 0.1) {
    items.push({ id: "budget", priority: "warning", title: "Budget overrun risk", detail: `Forecast ${fmt(costForecast)} exceeds budget ${fmt(budgetTotal)} by ${fmt(delta)} (${Math.round((delta / budgetTotal) * 100)}%).`, impact: `Reduce scope or increase budget by ${fmt(delta)}.`, action: "View Financial Intelligence", actionType: "view" });
  }
  if (scheduleGap < -20) {
    items.push({ id: "schedule", priority: "warning", title: "Significantly behind schedule", detail: `Progress is ${pct}% vs planned ${plannedPct}% — a ${Math.abs(scheduleGap)}pp gap that compounds over time.`, action: "View Plan & Roadmap", actionType: "view" });
  }
  if (critRisks > 0) {
    items.push({ id: "critical-risk", priority: "critical", title: `${critRisks} critical risk${critRisks > 1 ? "s" : ""} open`, detail: "High-probability, high-impact risks require immediate mitigation.", action: "View Risks & Dependencies", actionType: "view" });
  }
  if (daysLeft > 0 && daysLeft <= 7 && pct < 80) {
    items.push({ id: "deadline-near", priority: "warning", title: `Deadline in ${daysLeft} days`, detail: `Only ${pct}% complete — ${100 - pct}% of work remains with very little time left.`, impact: "Prioritise critical path features.", action: "View Execution", actionType: "view" });
  }

  // If nothing critical, add positive signal
  if (items.length === 0) {
    items.push({ id: "healthy", priority: "info", title: "Project is on track", detail: "No critical issues detected. Continue monitoring velocity and budget.", actionType: "dismiss" });
  }

  // Deduplicate by id
  const seen = new Set<string>();
  return items.filter(it => { if (seen.has(it.id)) return false; seen.add(it.id); return true; });
}

const PRIORITY_STYLE: Record<string, { bg: string; border: string; badge: string; badgeBg: string; dot: string }> = {
  critical: { bg: "#FEF9F9", border: "#FECACA", badge: "CRITICAL", badgeBg: "#DC2626", dot: "#DC2626" },
  warning:  { bg: "#FFFDF5", border: "#FDE68A", badge: "WARNING",  badgeBg: "#D97706", dot: "#D97706" },
  info:     { bg: "#F8FAFC", border: "#E5E2D9", badge: "INFO",     badgeBg: "#5C5A52", dot: "#2563EB" },
};

export default function HealthDecisionsView({ project, allF, canEdit }: { project: any; allF: any[]; canEdit: boolean }) {
  const [guardianReport, setGuardianReport] = useState<any>(null);
  const [guardianLoading, setGuardianLoading] = useState(true);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch(`/api/guardian/${project.id}`)
      .then(r => r.json())
      .then(d => setGuardianReport(d))
      .catch(() => {})
      .finally(() => setGuardianLoading(false));
  }, [project.id]);

  // ── Compute metrics ──
  const totalDone    = allF.filter((f: any) => f.status === "DONE").length;
  const totalBlocked = allF.filter((f: any) => f.status === "BLOCKED").length;
  const pct          = allF.length ? Math.round((totalDone / allF.length) * 100) : 0;

  const startDate   = new Date(project.startDate);
  const endDate     = new Date(project.endDate);
  const now         = new Date();
  const totalDays   = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / 86400000));
  const elapsedDays = Math.max(0, Math.ceil((now.getTime() - startDate.getTime()) / 86400000));
  const daysLeft    = Math.ceil((endDate.getTime() - now.getTime()) / 86400000);
  const plannedPct  = Math.min(100, Math.round((elapsedDays / totalDays) * 100));

  const costActual    = project.assignments.reduce((s: number, a: any) => s + a.actualHours * a.resource.costPerHour, 0);
  const costEstimated = project.assignments.reduce((s: number, a: any) => s + a.estimatedHours * a.resource.costPerHour, 0);
  const budgetTotal   = project.budgetTotal || costEstimated;
  const costForecast  = pct > 5 ? (costActual / pct) * 100 : costEstimated;

  // EVM
  const BAC = budgetTotal;
  const EV  = BAC * (pct / 100);
  const PV  = BAC * (elapsedDays / totalDays);
  const AC  = costActual;
  const SPI = PV > 0 ? EV / PV : 1;
  const CPI = AC > 0 ? EV / AC : 1;
  const EAC = CPI > 0 ? BAC / CPI : costForecast;

  const openRisks  = project.risks.filter((r: any) => r.status === "OPEN").length;
  const highRisks  = project.risks.filter((r: any) => r.status === "OPEN" && r.probability * r.impact >= 9).length;

  const h = calculateHealth({
    startDate: project.startDate, endDate: project.endDate,
    totalFeatures: allF.length, doneFeatures: totalDone,
    blockedFeatures: totalBlocked, inProgressFeatures: allF.filter((f: any) => f.status === "IN_PROGRESS").length,
    totalSprints: project.sprints.length,
    doneSprints: project.sprints.filter((s: any) => s.status === "DONE").length,
    activeSprints: project.sprints.filter((s: any) => s.status === "ACTIVE").length,
    budgetTotal: project.budgetTotal, costActual, costEstimated,
    totalCapacityHours: project.assignments.reduce((s: number, a: any) => s + a.resource.capacityHours, 0),
    totalActualHours: project.assignments.reduce((s: number, a: any) => s + a.actualHours, 0),
    openRisks, highRisks,
    maxRiskScore: project.risks.filter((r: any) => r.status === "OPEN").reduce((m: number, r: any) => Math.max(m, r.probability * r.impact), 0),
  });

  const healthScore = h.healthScore;
  const healthColor = healthScore >= 80 ? "#059669" : healthScore >= 60 ? "#D97706" : "#DC2626";
  const healthBg    = healthScore >= 80 ? "#ECFDF5" : healthScore >= 60 ? "#FFFBEB" : "#FEF2F2";
  const ragLabel    = h.status === "ON_TRACK" ? "ON TRACK" : h.status === "AT_RISK" ? "AT RISK" : h.status === "OFF_TRACK" ? "CRITICAL" : h.status === "COMPLETED" ? "COMPLETED" : "NOT STARTED";
  const delayDays   = guardianReport?.estimatedDelay ?? (daysLeft < 0 ? Math.abs(daysLeft) : 0);
  const onTrackProb = guardianReport?.onTrackProbability ?? (healthScore >= 80 ? 85 : healthScore >= 60 ? 55 : 20);

  const decisionFeed = buildDecisionFeed(project, allF, guardianReport).filter(it => !dismissed.has(it.id));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, fontFamily: "'DM Sans', sans-serif" }}>

      {/* ── Status Strip ──────────────────────────────────────────────────── */}
      <div style={{ background: healthBg, border: `1px solid ${healthColor}30`, borderRadius: 14, padding: "16px 22px", display: "flex", alignItems: "center", gap: 24, flexWrap: "wrap" }}>

        {/* RAG badge + score */}
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ background: healthColor, color: "#fff", borderRadius: 8, padding: "4px 12px", fontSize: 10, fontWeight: 800, letterSpacing: "0.08em" }}>{ragLabel}</div>
          <div style={{ fontSize: 36, fontWeight: 900, color: healthColor, letterSpacing: "-2px", lineHeight: 1 }}>{healthScore}</div>
          <div style={{ fontSize: 10, color: "#9E9C93", fontWeight: 600 }}>/ 100<br />Health Score</div>
        </div>

        <div style={{ width: 1, height: 36, background: "#E5E2D9", flexShrink: 0 }} />

        {/* Key signals */}
        {[
          { label: "On-Track Prob.", value: `${onTrackProb}%`, color: onTrackProb >= 70 ? "#059669" : onTrackProb >= 45 ? "#D97706" : "#DC2626" },
          { label: "Est. Delay",     value: delayDays > 0 ? `+${delayDays} days` : "None", color: delayDays > 14 ? "#DC2626" : delayDays > 0 ? "#D97706" : "#059669" },
          { label: "Budget Risk",    value: BAC > 0 && EAC > BAC * 1.1 ? `+${Math.round(((EAC - BAC) / BAC) * 100)}% forecast overrun` : "Within budget", color: BAC > 0 && EAC > BAC * 1.1 ? "#DC2626" : "#059669" },
          { label: "Progress",       value: `${pct}%`, color: "#18170F" },
          { label: "Blocked",        value: String(totalBlocked), color: totalBlocked > 0 ? "#DC2626" : "#059669" },
        ].map(s => (
          <div key={s.label} style={{ textAlign: "center" }}>
            <div style={{ fontSize: 10, color: "#9E9C93", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 3 }}>{s.label}</div>
            <div style={{ fontSize: 14, fontWeight: 800, color: s.color, letterSpacing: "-0.3px" }}>{s.value}</div>
          </div>
        ))}

        {/* EVM strip */}
        {BAC > 0 && (
          <>
            <div style={{ width: 1, height: 36, background: "#E5E2D9", flexShrink: 0 }} />
            {[
              { label: "SPI", value: SPI.toFixed(2), color: SPI >= 1 ? "#059669" : SPI >= 0.8 ? "#D97706" : "#DC2626", title: "Schedule Performance Index" },
              { label: "CPI", value: CPI.toFixed(2), color: CPI >= 1 ? "#059669" : CPI >= 0.8 ? "#D97706" : "#DC2626", title: "Cost Performance Index" },
              { label: "EAC", value: fmt(EAC), color: EAC > BAC ? "#DC2626" : "#059669", title: "Estimate at Completion" },
            ].map(s => (
              <div key={s.label} title={s.title} style={{ textAlign: "center" }}>
                <div style={{ fontSize: 10, color: "#9E9C93", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 3 }}>{s.label}</div>
                <div style={{ fontSize: 13, fontWeight: 800, color: s.color, letterSpacing: "-0.3px", fontFamily: "'DM Mono', monospace" }}>{s.value}</div>
              </div>
            ))}
          </>
        )}
      </div>

      {/* ── Decision Feed ─────────────────────────────────────────────────── */}
      <div style={{ background: "#fff", border: "1px solid #E5E2D9", borderRadius: 14, overflow: "hidden" }}>
        <div style={{ padding: "14px 20px", borderBottom: "1px solid #F4F2EC", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#18170F" }}>Decision Feed</div>
            <div style={{ fontSize: 11, color: "#9E9C93", marginTop: 1 }}>Prioritised actions — ranked by urgency and impact</div>
          </div>
          {guardianLoading && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "#9E9C93" }}>
              <span style={{ display: "inline-block", width: 6, height: 6, borderRadius: "50%", background: "#006D6B", animation: "blink 1.2s infinite" }} />
              Guardian analyzing…
            </div>
          )}
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          {decisionFeed.length === 0 ? (
            <div style={{ padding: "28px 20px", textAlign: "center", color: "#9E9C93", fontSize: 13 }}>
              No active decisions — project is on track.
            </div>
          ) : (
            decisionFeed.map((item, i) => {
              const ps = PRIORITY_STYLE[item.priority];
              return (
                <div key={item.id} style={{
                  padding: "16px 20px",
                  background: i % 2 === 0 ? ps.bg : "#fff",
                  borderBottom: i < decisionFeed.length - 1 ? "1px solid #F4F2EC" : "none",
                  display: "flex", alignItems: "flex-start", gap: 14,
                }}>
                  {/* Priority dot */}
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: ps.dot, flexShrink: 0, marginTop: 5 }} />

                  {/* Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: 9, fontWeight: 800, color: "#fff", background: ps.badgeBg, borderRadius: 4, padding: "2px 7px", letterSpacing: "0.06em" }}>{ps.badge}</span>
                      <span style={{ fontSize: 13, fontWeight: 600, color: "#18170F" }}>{item.title}</span>
                    </div>
                    <div style={{ fontSize: 12, color: "#5C5A52", lineHeight: 1.5, marginBottom: item.impact ? 6 : 0 }}>{item.detail}</div>
                    {item.impact && (
                      <div style={{ fontSize: 11, color: "#006D6B", fontWeight: 600 }}>→ {item.impact}</div>
                    )}
                  </div>

                  {/* Actions */}
                  <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                    {item.action && item.actionType !== "dismiss" && (
                      <button style={{ fontSize: 11, fontWeight: 600, padding: "5px 12px", borderRadius: 7, border: `1px solid ${ps.border}`, background: "#fff", color: "#5C5A52", cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}>
                        {item.action}
                      </button>
                    )}
                    <button onClick={() => setDismissed(d => new Set([...d, item.id]))} style={{ fontSize: 11, padding: "5px 10px", borderRadius: 7, border: "1px solid #F4F2EC", background: "#F8FAFC", color: "#9E9C93", cursor: "pointer", fontFamily: "inherit" }}>
                      Dismiss
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ── Guardian Narrative ────────────────────────────────────────────── */}
      {(guardianReport?.explanation || guardianReport?.narrative) && (
        <div style={{ background: "#FDFCFA", border: "1px solid #E5E2D9", borderRadius: 14, padding: "16px 20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#18170F" }}>Guardian Analysis</span>
            <span style={{ fontSize: 9, fontWeight: 700, color: "#006D6B", background: "rgba(0,109,107,0.1)", borderRadius: 5, padding: "2px 8px", letterSpacing: "0.06em" }}>AI</span>
          </div>
          <p style={{ fontSize: 13, color: "#5C5A52", lineHeight: 1.7, margin: 0 }}>
            {guardianReport.explanation ?? guardianReport.narrative}
          </p>
          {guardianReport.recommendations?.length > 0 && (
            <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 6 }}>
              {guardianReport.recommendations.slice(0, 3).map((r: string, i: number) => (
                <div key={i} style={{ display: "flex", gap: 8, fontSize: 12, color: "#5C5A52" }}>
                  <span style={{ color: "#006D6B", fontWeight: 700, flexShrink: 0 }}>→</span>
                  {r}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Sprint progress overview ───────────────────────────────────────── */}
      <div style={{ background: "#fff", border: "1px solid #E5E2D9", borderRadius: 14, overflow: "hidden" }}>
        <div style={{ padding: "14px 20px", borderBottom: "1px solid #F4F2EC" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#18170F" }}>Sprint Health</div>
        </div>
        <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 8 }}>
          {project.sprints.length === 0 ? (
            <div style={{ fontSize: 12, color: "#9E9C93", textAlign: "center", padding: 12 }}>No sprints yet</div>
          ) : (
            project.sprints.slice(0, 6).map((s: any) => {
              const done = s.features.filter((f: any) => f.status === "DONE").length;
              const blk  = s.features.filter((f: any) => f.status === "BLOCKED").length;
              const pctS = s.features.length ? Math.round((done / s.features.length) * 100) : 0;
              const barColor = s.status === "DONE" ? "#059669" : blk > 0 ? "#DC2626" : s.status === "ACTIVE" ? "#2563EB" : "#CCC9BF";
              const statusColor: any = { DONE: { c: "#059669", bg: "#ECFDF5" }, ACTIVE: { c: "#2563EB", bg: "#EFF6FF" }, UPCOMING: { c: "#9E9C93", bg: "#F8FAFC" } };
              const sc = statusColor[s.status] ?? statusColor.UPCOMING;
              return (
                <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 130, fontSize: 12, color: "#5C5A52", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flexShrink: 0 }}>{s.name}</div>
                  <span style={{ fontSize: 9, fontWeight: 700, color: sc.c, background: sc.bg, borderRadius: 4, padding: "2px 7px", flexShrink: 0 }}>{s.status}</span>
                  <div style={{ flex: 1, height: 8, background: "#F4F2EC", borderRadius: 4, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: pctS + "%", background: barColor, borderRadius: 4, transition: "width 0.4s" }} />
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#5C5A52", width: 32, textAlign: "right", flexShrink: 0 }}>{pctS}%</span>
                  {blk > 0 && <span style={{ fontSize: 10, fontWeight: 700, color: "#DC2626", flexShrink: 0 }}>⚠ {blk}</span>}
                </div>
              );
            })
          )}
        </div>
      </div>

      <style>{`@keyframes blink{0%,100%{opacity:1}50%{opacity:.3}}`}</style>
    </div>
  );
}
