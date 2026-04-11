"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { KpiCard, KpiIntent } from "@/components/ui/kpi-card";
import { DecisionItem, DecisionPriority } from "@/components/ui/decision-item";
import { ValidationInbox } from "@/components/ui/validation-inbox";
import { StatusBadge, healthToStatus } from "@/components/ui/status-badge";

type Role = "PMO" | "CEO" | "STK" | "DEV";

interface ProjectStat {
  id: string;
  name: string;
  status: string;
  pct: number;
  done: number;
  blocked: number;
  inProgress: number;
  allF: unknown[];
  activeSprints: number;
  costActual: number;
  costEstimated: number;
  costForecast: number;
  budgetVariance: number;
  openRisks: number;
  highRisks: number;
  daysLeft: number;
  riskScore: number;
  health: string;
  healthScore: number;
  spi: number;
  cpi: number;
  sprintDone: number;
  sprintTotal: number;
  sprintName: string | null;
}

interface AlertItem {
  id: string;
  title: string;
  detail: string;
  level: string;
  requiresValidation: boolean;
  resolved: boolean;
  project?: { id: string; name: string } | null;
  createdAt: string;
}

interface KpiSet {
  totalActive: number;
  atRiskCount: number;
  onTrackCount: number;
  budgetExposure: number;
  validationPending: number;
}

interface Props {
  orgName: string;
  userName: string;
  preferredView: Role;
  projects: ProjectStat[];
  alerts: AlertItem[];
  kpis: KpiSet;
}

function fmt(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}

function buildKpis(role: Role, projects: ProjectStat[], kpis: KpiSet) {
  const blocked   = projects.reduce((s, p) => s + p.blocked, 0);
  const inProg    = projects.reduce((s, p) => s + p.inProgress, 0);
  const avgHealth = projects.length
    ? Math.round(projects.reduce((s, p) => s + p.healthScore, 0) / projects.length)
    : 0;
  const overdue   = projects.filter(p => p.daysLeft < 0).length;
  const sprintVelocity = projects.reduce((s, p) => s + p.sprintDone, 0);

  if (role === "PMO") return [
    { label: "Active Projects",  value: kpis.totalActive,  intent: "default" as KpiIntent, accent: "P" },
    { label: "At Risk / Off Track", value: kpis.atRiskCount, intent: kpis.atRiskCount > 0 ? "danger" : "ok" as KpiIntent, accent: "!" },
    { label: "On Track",         value: kpis.onTrackCount, intent: "ok"      as KpiIntent, accent: "✓" },
    { label: "Budget Exposure",  value: fmt(kpis.budgetExposure), intent: kpis.budgetExposure > 0 ? "warn" : "default" as KpiIntent, accent: "$" },
  ];

  if (role === "CEO") return [
    { label: "Active Projects",  value: kpis.totalActive,  intent: "default" as KpiIntent, accent: "P" },
    { label: "At Risk",          value: kpis.atRiskCount,  intent: kpis.atRiskCount > 0 ? "danger" : "ok" as KpiIntent, accent: "!" },
    { label: "Budget Exposure",  value: fmt(kpis.budgetExposure), intent: kpis.budgetExposure > 0 ? "warn" : "default" as KpiIntent, accent: "$" },
    { label: "Avg Health Score", value: `${avgHealth}`, sub: "out of 100", intent: avgHealth >= 70 ? "ok" : avgHealth >= 40 ? "warn" : "danger" as KpiIntent, accent: "H" },
  ];

  if (role === "STK") return [
    { label: "Active Projects",  value: kpis.totalActive,  intent: "default" as KpiIntent, accent: "P" },
    { label: "On Track",         value: kpis.onTrackCount, intent: "ok"      as KpiIntent, accent: "✓" },
    { label: "Overdue Projects", value: overdue,           intent: overdue > 0 ? "danger" : "ok" as KpiIntent, accent: "D" },
    { label: "Validations Pending", value: kpis.validationPending, intent: kpis.validationPending > 0 ? "warn" : "default" as KpiIntent, accent: "V" },
  ];

  // DEV
  return [
    { label: "Active Projects",  value: kpis.totalActive,  intent: "default" as KpiIntent, accent: "P" },
    { label: "Blocked Features", value: blocked,           intent: blocked > 0 ? "danger" : "ok" as KpiIntent, accent: "B" },
    { label: "In Progress",      value: inProg,            intent: "info"    as KpiIntent, accent: "►" },
    { label: "Sprint Velocity",  value: sprintVelocity,    sub: "items done this sprint", intent: "ok" as KpiIntent, accent: "V" },
  ];
}

function buildDecisions(projects: ProjectStat[]): { priority: DecisionPriority; text: string; meta: string; action: string; href: string }[] {
  const items: { priority: DecisionPriority; text: string; meta: string; action: string; href: string }[] = [];

  for (const p of projects) {
    if (p.health === "OFF_TRACK") {
      items.push({
        priority: "urgent",
        text: `${p.name} is off track — immediate action required`,
        meta: `Health ${p.healthScore}/100 · SPI ${p.spi.toFixed(2)} · CPI ${p.cpi.toFixed(2)}`,
        action: "Review",
        href: `/projects/${p.id}`,
      });
    } else if (p.health === "AT_RISK" && p.highRisks > 0) {
      items.push({
        priority: "urgent",
        text: `${p.name} has ${p.highRisks} high-severity risk${p.highRisks > 1 ? "s" : ""} open`,
        meta: `${p.openRisks} open risks total · Health ${p.healthScore}/100`,
        action: "View Risks",
        href: `/projects/${p.id}?tab=risks`,
      });
    } else if (p.health === "AT_RISK") {
      items.push({
        priority: "watch",
        text: `${p.name} is at risk`,
        meta: `Health ${p.healthScore}/100 · ${p.daysLeft} days left · ${p.pct}% complete`,
        action: "Review",
        href: `/projects/${p.id}`,
      });
    }

    if (p.daysLeft < 0) {
      items.push({
        priority: "urgent",
        text: `${p.name} is overdue by ${Math.abs(p.daysLeft)} day${Math.abs(p.daysLeft) > 1 ? "s" : ""}`,
        meta: `${p.pct}% complete · ${p.done} of ${(p.allF as unknown[]).length} features done`,
        action: "View",
        href: `/projects/${p.id}`,
      });
    } else if (p.budgetVariance > 0) {
      items.push({
        priority: "watch",
        text: `${p.name} budget overrun forecast: ${fmt(p.budgetVariance)}`,
        meta: `CPI ${p.cpi.toFixed(2)} · Actual ${fmt(p.costActual)} vs Budget ${fmt(p.costEstimated)}`,
        action: "Financials",
        href: `/projects/${p.id}?tab=financials`,
      });
    } else if (p.blocked > 0) {
      items.push({
        priority: "watch",
        text: `${p.name} has ${p.blocked} blocked feature${p.blocked > 1 ? "s" : ""}`,
        meta: `${p.inProgress} in progress · ${p.pct}% complete`,
        action: "View",
        href: `/projects/${p.id}`,
      });
    }

    if (p.health === "ON_TRACK" && p.pct >= 80) {
      items.push({
        priority: "good",
        text: `${p.name} on track — ${p.pct}% complete`,
        meta: `${p.daysLeft} days left · Health ${p.healthScore}/100`,
        action: "View",
        href: `/projects/${p.id}`,
      });
    }
  }

  // Deduplicate by project+priority (keep most severe per project)
  const seen = new Set<string>();
  return items.filter(item => {
    const key = item.href + item.priority;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 10);
}

export default function DashboardClient({ orgName, userName, preferredView, projects, alerts, kpis }: Props) {
  const [role, setRole] = useState<Role>(preferredView);

  useEffect(() => {
    const handler = (e: Event) => setRole((e as CustomEvent<Role>).detail);
    window.addEventListener("rolechange", handler);
    return () => window.removeEventListener("rolechange", handler);
  }, []);

  const kpiCards  = buildKpis(role, projects, kpis);
  const decisions = buildDecisions(projects);
  const validationAlerts = alerts.filter(a => a.requiresValidation && !a.resolved);

  const firstName = userName.split(" ")[0] || "there";

  return (
    <div style={{ padding: "20px 22px", maxWidth: 1300, margin: "0 auto" }}>
      {/* ── Header ── */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 18, fontWeight: 700, color: "var(--text)", letterSpacing: "-.3px", marginBottom: 2 }}>
          Good {getGreeting()}, {firstName}
        </h1>
        <p style={{ fontSize: 12, color: "var(--text2)" }}>
          {orgName} · {new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        </p>
      </div>

      {/* ── KPI Cards ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 20 }}>
        {kpiCards.map(k => (
          <KpiCard key={k.label} label={k.label} value={k.value} sub={(k as any).sub} intent={k.intent} accent={k.accent} />
        ))}
      </div>

      {/* ── Main content grid ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 14, alignItems: "start" }}>

        {/* ── Left: Projects table ── */}
        <div>
          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", overflow: "hidden" }}>
            <div style={{ padding: "13px 15px 11px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text)" }}>Projects</span>
              <Link href="/projects/new" style={{ fontSize: 11, color: "var(--guardian)", fontWeight: 600, textDecoration: "none" }}>+ New</Link>
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "var(--surface2)" }}>
                  <Th>Project</Th>
                  <Th>Health</Th>
                  <Th>Progress</Th>
                  {(role === "PMO" || role === "CEO") && <Th>CPI</Th>}
                  {(role === "PMO" || role === "CEO") && <Th>Budget Δ</Th>}
                  {role === "DEV" && <Th>Sprint</Th>}
                  {role === "STK" && <Th>Days Left</Th>}
                  <Th>Risks</Th>
                  <Th></Th>
                </tr>
              </thead>
              <tbody>
                {projects.length === 0 && (
                  <tr>
                    <td colSpan={8} style={{ padding: "32px 15px", textAlign: "center", fontSize: 12, color: "var(--text3)" }}>
                      No active projects
                    </td>
                  </tr>
                )}
                {projects.map((p, i) => (
                  <tr
                    key={p.id}
                    style={{ borderTop: i === 0 ? "none" : "1px solid var(--border)" }}
                  >
                    <td style={{ padding: "10px 15px" }}>
                      <Link href={`/projects/${p.id}`} style={{ fontSize: 12, fontWeight: 500, color: "var(--text)", textDecoration: "none" }}>
                        {p.name}
                      </Link>
                    </td>
                    <td style={{ padding: "10px 12px" }}>
                      <StatusBadge status={healthToStatus(p.health)} />
                    </td>
                    <td style={{ padding: "10px 12px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                        <div style={{ flex: 1, height: 5, background: "var(--surface2)", borderRadius: 99, overflow: "hidden", minWidth: 60 }}>
                          <div style={{ height: "100%", width: `${p.pct}%`, background: p.pct >= 80 ? "var(--green)" : p.pct >= 50 ? "var(--blue)" : "var(--amber)", borderRadius: 99, transition: "width .3s" }} />
                        </div>
                        <span style={{ fontSize: 10, color: "var(--text2)", width: 26, textAlign: "right" }}>{p.pct}%</span>
                      </div>
                    </td>
                    {(role === "PMO" || role === "CEO") && (
                      <td style={{ padding: "10px 12px" }}>
                        <span style={{ fontSize: 11, fontWeight: 600, color: p.cpi >= 1 ? "var(--green-text)" : p.cpi >= 0.8 ? "var(--amber-text)" : "var(--red-text)" }}>
                          {p.cpi.toFixed(2)}
                        </span>
                      </td>
                    )}
                    {(role === "PMO" || role === "CEO") && (
                      <td style={{ padding: "10px 12px" }}>
                        <span style={{ fontSize: 11, fontWeight: 600, color: p.budgetVariance > 0 ? "var(--red-text)" : "var(--green-text)" }}>
                          {p.budgetVariance > 0 ? "+" : ""}{fmt(p.budgetVariance)}
                        </span>
                      </td>
                    )}
                    {role === "DEV" && (
                      <td style={{ padding: "10px 12px" }}>
                        <span style={{ fontSize: 11, color: "var(--text2)" }}>
                          {p.sprintName ? `${p.sprintDone}/${p.sprintTotal} done` : "—"}
                        </span>
                      </td>
                    )}
                    {role === "STK" && (
                      <td style={{ padding: "10px 12px" }}>
                        <span style={{ fontSize: 11, fontWeight: 500, color: p.daysLeft < 0 ? "var(--red-text)" : p.daysLeft <= 7 ? "var(--amber-text)" : "var(--text2)" }}>
                          {p.daysLeft < 0 ? `${Math.abs(p.daysLeft)}d overdue` : `${p.daysLeft}d`}
                        </span>
                      </td>
                    )}
                    <td style={{ padding: "10px 12px" }}>
                      {p.openRisks > 0 ? (
                        <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 6px", borderRadius: 4, background: p.highRisks > 0 ? "var(--red-bg)" : "var(--amber-bg)", color: p.highRisks > 0 ? "var(--red-text)" : "var(--amber-text)", border: `1px solid ${p.highRisks > 0 ? "var(--red-border)" : "var(--amber-border)"}` }}>
                          {p.openRisks} {p.highRisks > 0 ? "· " + p.highRisks + " high" : ""}
                        </span>
                      ) : (
                        <span style={{ fontSize: 10, color: "var(--text3)" }}>—</span>
                      )}
                    </td>
                    <td style={{ padding: "10px 12px" }}>
                      <Link href={`/projects/${p.id}`} style={{ fontSize: 11, color: "var(--text3)", textDecoration: "none" }}>→</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Right column ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

          {/* Validation Inbox */}
          {validationAlerts.length > 0 && (
            <div style={{ background: "var(--surface)", border: "1px solid var(--amber-border)", borderRadius: "var(--radius-lg)", overflow: "hidden" }}>
              <div style={{ padding: "11px 13px 9px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text)" }}>Validation Inbox</span>
                <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 10, background: "var(--amber)", color: "#fff" }}>
                  {validationAlerts.length}
                </span>
              </div>
              <ValidationInbox alerts={validationAlerts as any} />
            </div>
          )}

          {/* Decision Feed */}
          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", overflow: "hidden" }}>
            <div style={{ padding: "11px 13px 9px", borderBottom: "1px solid var(--border)" }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text)" }}>Decision Feed</span>
            </div>
            {decisions.length === 0 ? (
              <div style={{ padding: "20px 13px", textAlign: "center", fontSize: 11, color: "var(--text3)" }}>
                All projects healthy ✓
              </div>
            ) : (
              decisions.map((d, i) => (
                <DecisionItem
                  key={i}
                  priority={d.priority}
                  text={d.text}
                  meta={d.meta}
                  action={d.action}
                  href={d.href}
                />
              ))
            )}
          </div>

          {/* Guardian AI status */}
          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", overflow: "hidden" }}>
            <div style={{ padding: "11px 13px 9px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 7 }}>
              <span className="g-dot-pulse" style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--guardian)", flexShrink: 0, display: "inline-block" }} />
              <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text)" }}>Guardian AI</span>
            </div>
            <div style={{ padding: "11px 13px" }}>
              <p style={{ fontSize: 11, color: "var(--text2)", lineHeight: 1.6 }}>
                Monitoring {projects.length} active project{projects.length !== 1 ? "s" : ""} across{" "}
                {projects.reduce((s, p) => s + (p.allF as unknown[]).length, 0)} features.{" "}
                {kpis.atRiskCount > 0
                  ? `${kpis.atRiskCount} project${kpis.atRiskCount > 1 ? "s need" : " needs"} attention.`
                  : "All projects within normal parameters."}
              </p>
              <Link href="/alerts" style={{ fontSize: 11, color: "var(--guardian)", fontWeight: 600, textDecoration: "none", display: "inline-block", marginTop: 8 }}>
                View all alerts →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Th({ children }: { children?: React.ReactNode }) {
  return (
    <th style={{ padding: "7px 12px", fontSize: 10, fontWeight: 600, color: "var(--text3)", textAlign: "left", textTransform: "uppercase", letterSpacing: ".05em", whiteSpace: "nowrap" }}>
      {children}
    </th>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}
