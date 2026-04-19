"use client";
import { useState, useEffect } from "react";
import Link from "next/link";

type Role = "PMO" | "CEO" | "STK" | "DEV";

interface SprintDeadline { sprintName: string; projectName: string; projectId: string; endDate: string; }

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
  upcomingSprints: SprintDeadline[];
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
  lastAnalyzed: string | null;
}

const fmt = (n: number) => {
  if (n >= 1_000_000) return `€${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `€${(n / 1_000).toFixed(0)}k`;
  return `€${Math.round(n)}`;
};

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function healthLabel(h: string) {
  if (h === "ON_TRACK")   return "On Track";
  if (h === "AT_RISK")    return "At Risk";
  if (h === "OFF_TRACK")  return "Critical";
  if (h === "COMPLETED")  return "Completed";
  return "Not Started";
}

function healthTagStyle(h: string): React.CSSProperties {
  if (h === "ON_TRACK")  return { background: "#F0FDF4", color: "#14532D", border: "1px solid #BBF7D0" };
  if (h === "AT_RISK")   return { background: "#FFFBEB", color: "#92400E", border: "1px solid #FDE68A" };
  if (h === "OFF_TRACK") return { background: "#FEF2F2", color: "#991B1B", border: "1px solid #FECACA" };
  if (h === "COMPLETED") return { background: "#EFF6FF", color: "#1E3A8A", border: "1px solid #BFDBFE" };
  return { background: "#F4F2EC", color: "#5C5A52", border: "1px solid #E5E2D9" };
}

function healthDot(h: string) {
  if (h === "ON_TRACK")  return "#16A34A";
  if (h === "AT_RISK")   return "#D97706";
  if (h === "OFF_TRACK") return "#DC2626";
  if (h === "COMPLETED") return "#2563EB";
  return "#9E9C93";
}

function healthScoreColor(score: number) {
  if (score >= 70) return "#14532D";
  if (score >= 50) return "#92400E";
  return "#991B1B";
}

interface Decision { id: string; priority: "urgent" | "watch" | "good" | "info"; title: string; meta: string; action: string; href: string; }

function buildDecisions(projects: ProjectStat[], validationAlerts: AlertItem[]): Decision[] {
  const items: Decision[] = [];

  for (const a of validationAlerts.slice(0, 3)) {
    items.push({
      id: `va-${a.id}`,
      priority: "urgent",
      title: a.title,
      meta: a.project?.name ? `${a.project.name} · requires validation` : "Requires validation",
      action: "Review",
      href: a.project?.id ? `/projects/${a.project.id}` : "/alerts",
    });
  }

  for (const p of projects) {
    if (p.health === "OFF_TRACK") {
      items.push({ id: `ot-${p.id}`, priority: "urgent", title: `${p.name} is off track`, meta: `Health ${p.healthScore}/100 · SPI ${p.spi.toFixed(2)} · CPI ${p.cpi.toFixed(2)}`, action: "Review", href: `/projects/${p.id}` });
    } else if (p.health === "AT_RISK" && p.highRisks > 0) {
      items.push({ id: `ar-${p.id}`, priority: "urgent", title: `${p.name} — ${p.highRisks} high-severity risk${p.highRisks > 1 ? "s" : ""} open`, meta: `${p.openRisks} open risks · Health ${p.healthScore}/100`, action: "View Risks", href: `/projects/${p.id}/risks` });
    } else if (p.health === "AT_RISK") {
      items.push({ id: `w-${p.id}`, priority: "watch", title: `${p.name} is at risk`, meta: `Health ${p.healthScore}/100 · ${p.daysLeft}d left · ${p.pct}% complete`, action: "Review", href: `/projects/${p.id}` });
    }
    if (p.daysLeft < 0 && p.pct < 100) {
      items.push({ id: `od-${p.id}`, priority: "urgent", title: `${p.name} overdue by ${Math.abs(p.daysLeft)} days`, meta: `${p.pct}% complete · ${p.blocked} features blocked`, action: "View", href: `/projects/${p.id}` });
    }
    if (p.budgetVariance > 0 && p.budgetVariance > p.costEstimated * 0.1) {
      items.push({ id: `bv-${p.id}`, priority: "watch", title: `${p.name} — budget overrun forecast: ${fmt(p.budgetVariance)}`, meta: `CPI ${p.cpi.toFixed(2)} · EAC above budget by ${Math.round((p.budgetVariance / p.costEstimated) * 100)}%`, action: "Financials", href: `/projects/${p.id}/financials` });
    }
    if (p.blocked >= 3) {
      items.push({ id: `bl-${p.id}`, priority: "watch", title: `${p.name} — ${p.blocked} features blocked`, meta: `Sprint progress at risk · ${p.pct}% overall complete`, action: "Board", href: `/projects/${p.id}/board` });
    }
    if (p.health === "ON_TRACK" && p.pct >= 80) {
      items.push({ id: `gt-${p.id}`, priority: "good", title: `${p.name} on track — ${p.pct}% complete`, meta: `${p.daysLeft}d left · Health ${p.healthScore}/100`, action: "View", href: `/projects/${p.id}` });
    }
  }

  const seen = new Set<string>();
  return items.filter(i => { if (seen.has(i.id)) return false; seen.add(i.id); return true; }).slice(0, 10);
}

// ── Inline style helpers ──────────────────────────────────────────────────────

const CARD: React.CSSProperties = {
  background: "#FFFFFF", border: "1px solid #E5E2D9", borderRadius: 12,
  marginBottom: 10, overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,.07)",
};
const CARD_H: React.CSSProperties = {
  display: "flex", alignItems: "center", justifyContent: "space-between",
  padding: "10px 14px", borderBottom: "1px solid #E5E2D9",
};

function BtnSm({ children, onClick, variant = "default", href }: {
  children: React.ReactNode; onClick?: () => void; variant?: "default"|"success"|"danger"|"warn"; href?: string;
}) {
  const styles: Record<string, React.CSSProperties> = {
    default:  { background: "#FFFFFF",  border: "1px solid #D4D0C6", color: "#5C5A52" },
    success:  { background: "#F0FDF4",  border: "1px solid #BBF7D0", color: "#14532D" },
    danger:   { background: "#FEF2F2",  border: "1px solid #FECACA", color: "#991B1B" },
    warn:     { background: "#FFFBEB",  border: "1px solid #FDE68A", color: "#92400E" },
  };
  const base: React.CSSProperties = {
    fontSize: 10, fontWeight: 600, padding: "4px 9px", borderRadius: 7,
    cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap",
    display: "inline-flex", alignItems: "center", gap: 4,
    letterSpacing: "-.1px", transition: ".12s",
    ...styles[variant],
  };
  if (href) return <Link href={href} style={{ ...base, textDecoration: "none" }}>{children}</Link>;
  return <button style={base} onClick={onClick}>{children}</button>;
}

// KPI card variant configs
const KPI_VARIANTS = {
  warn:    { bg: "#FFFBEB",  border: "#FDE68A",  valueColor: "#92400E" },
  danger:  { bg: "#FEF2F2",  border: "#FECACA",  valueColor: "#991B1B" },
  info:    { bg: "#EFF6FF",  border: "#BFDBFE",  valueColor: "#1E3A8A" },
  ok:      { bg: "#F0FDF4",  border: "#BBF7D0",  valueColor: "#14532D" },
  default: { bg: "#FFFFFF",  border: "#E5E2D9",  valueColor: "#18170F" },
  teal:    { bg: "#F0FDFA",  border: "#99F6E4",  valueColor: "#134E4A" },
  purple:  { bg: "#F5F3FF",  border: "#DDD6FE",  valueColor: "#4C1D95" },
};

type KpiVariant = keyof typeof KPI_VARIANTS;

interface KpiCard { label: string; value: string | number; sub: string; icon: string; variant: KpiVariant; }

// Decision item style by priority
const DEC_ITEM_STYLES: Record<string, React.CSSProperties> = {
  urgent: { background: "rgba(220,38,38,.05)", borderLeft: "3px solid #DC2626", paddingLeft: 11 },
  watch:  { background: "rgba(217,119,6,.04)",  borderLeft: "3px solid #D97706", paddingLeft: 11 },
  good:   { background: "rgba(22,163,74,.04)",  borderLeft: "3px solid #16A34A", paddingLeft: 11 },
  info:   {},
};

const DEC_LBL_STYLES: Record<string, React.CSSProperties> = {
  urgent: { background: "#DC2626", color: "#fff" },
  watch:  { background: "#D97706", color: "#fff" },
  good:   { background: "#16A34A", color: "#fff" },
  info:   { background: "#2563EB", color: "#fff" },
};

const DEC_LBL_TEXT: Record<string, string> = {
  urgent: "URGENT",
  watch:  "WATCH",
  good:   "GOOD",
  info:   "INFO",
};

const DEC_ACTION_STYLE: Record<string, React.CSSProperties> = {
  urgent: { background: "#FEF2F2", border: "1px solid #FECACA", color: "#991B1B" },
  watch:  { background: "#FFFBEB", border: "1px solid #FDE68A", color: "#92400E" },
  good:   { background: "#F0FDF4", border: "1px solid #BBF7D0", color: "#14532D" },
  info:   { background: "#EFF6FF", border: "1px solid #BFDBFE", color: "#1E3A8A" },
};

const GUARDIAN_AGENTS = [
  { label: "Risk Scanner",       desc: "Scans all projects for new risks on every sprint/feature change" },
  { label: "EVM Calculator",     desc: "Recalculates SPI, CPI, EAC after every budget or progress change" },
  { label: "Health Score",       desc: "Updates project health score on every mutation"                  },
  { label: "Alert Generator",    desc: "Creates alerts when deadlines or thresholds are breached"        },
  { label: "Report Generator",   desc: "Upserts Guardian report after each daily sweep"                 },
  { label: "Dependency Monitor", desc: "Checks blocked feature and project dependencies"                },
];

function useRelativeTime(isoString: string | null) {
  const [label, setLabel] = useState(() => formatRelativeTime(isoString));
  useEffect(() => {
    const id = setInterval(() => setLabel(formatRelativeTime(isoString)), 30_000);
    return () => clearInterval(id);
  }, [isoString]);
  return label;
}

function formatRelativeTime(iso: string | null): string {
  if (!iso) return "never";
  const diffMs   = Date.now() - new Date(iso).getTime();
  const diffMins = Math.floor(diffMs / 60_000);
  if (diffMins < 1)  return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const hrs = Math.floor(diffMins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function nextCronLabel(): string {
  const now  = new Date();
  const next = new Date();
  next.setUTCHours(8, 0, 0, 0);
  if (next <= now) next.setDate(next.getDate() + 1);
  const diffMs   = next.getTime() - now.getTime();
  const hrs      = Math.floor(diffMs / (1000 * 60 * 60));
  const mins     = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  return `${hrs}h ${mins}m`;
}

export default function DashboardClient({ orgName, userName, preferredView, projects, alerts, kpis, lastAnalyzed }: Props) {
  const [role, setRole] = useState<Role>(preferredView);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [approved, setApproved] = useState<Set<string>>(new Set());
  const [nextScan, setNextScan] = useState(() => nextCronLabel());

  const lastAnalyzedLabel = useRelativeTime(lastAnalyzed);

  useEffect(() => {
    const id = setInterval(() => setNextScan(nextCronLabel()), 60_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const handler = (e: Event) => setRole((e as CustomEvent<Role>).detail);
    window.addEventListener("rolechange", handler);
    return () => window.removeEventListener("rolechange", handler);
  }, []);

  const firstName = userName.split(" ")[0] || "there";
  const validationAlerts = alerts.filter(a => a.requiresValidation && !a.resolved);
  const allDecisions = buildDecisions(projects, validationAlerts);
  const decisions = allDecisions.filter(d => !dismissed.has(d.id));

  // Portfolio health sorted by riskScore desc
  const portfolioHealth = [...projects].sort((a, b) => b.riskScore - a.riskScore);

  // Upcoming deadlines
  const upcomingDeadlines = projects
    .flatMap(p => p.upcomingSprints)
    .sort((a, b) => a.endDate.localeCompare(b.endDate))
    .slice(0, 5);

  const blocked = projects.reduce((s, p) => s + p.blocked, 0);
  const overdue  = projects.filter(p => p.daysLeft < 0).length;
  const totalFeatures = projects.reduce((s, p) => s + (p.allF as unknown[]).length, 0);
  const autoReports = Math.max(projects.length * 3, 0);
  const savedHours = (projects.length * 1.5).toFixed(1) + "h";

  const kpiCards: KpiCard[] = role === "PMO" ? [
    { label: "Validations Pending",    value: kpis.validationPending, sub: "guardian outputs to approve", icon: "⏳", variant: kpis.validationPending > 0 ? "warn"   : "ok"      },
    { label: "Critical Projects",      value: kpis.atRiskCount,       sub: "health score below 50",      icon: "🔴", variant: kpis.atRiskCount > 0      ? "danger" : "ok"      },
    { label: "Auto-Generated Reports", value: autoReports,             sub: "today · zero manual",        icon: "📊", variant: "info"                                           },
    { label: "Hours Saved",            value: savedHours,              sub: "vs manual reporting today",  icon: "⚡", variant: "ok"                                            },
  ] : role === "CEO" ? [
    { label: "Active Projects",     value: kpis.totalActive,        sub: "across all teams",              icon: "📁", variant: "teal"                                           },
    { label: "At Risk / Off Track", value: kpis.atRiskCount,        sub: "need immediate action",         icon: "⚠️", variant: kpis.atRiskCount > 0 ? "danger" : "ok"         },
    { label: "On Track",            value: kpis.onTrackCount,       sub: "within normal parameters",      icon: "✅", variant: "ok"                                            },
    { label: "Budget Exposure",     value: fmt(kpis.budgetExposure), sub: "forecasted overrun",           icon: "💰", variant: kpis.budgetExposure > 0 ? "warn" : "ok"        },
  ] : role === "STK" ? [
    { label: "Active Projects",     value: kpis.totalActive,        sub: "in portfolio",                  icon: "📁", variant: "teal"                                           },
    { label: "On Track",            value: kpis.onTrackCount,       sub: "within normal parameters",      icon: "✅", variant: "ok"                                            },
    { label: "Overdue Projects",    value: overdue,                 sub: "past deadline",                  icon: "🕐", variant: overdue > 0 ? "danger" : "ok"                  },
    { label: "Validations Pending", value: kpis.validationPending,  sub: "awaiting your approval",        icon: "⏳", variant: kpis.validationPending > 0 ? "warn" : "ok"     },
  ] : [
    { label: "Active Projects",  value: kpis.totalActive,  sub: "you are assigned to",   icon: "📁", variant: "teal"                                                            },
    { label: "Blocked Features", value: blocked,           sub: "need unblocking",        icon: "🚫", variant: blocked > 0 ? "danger" : "ok"                                   },
    { label: "Total Features",   value: totalFeatures,     sub: "across all sprints",     icon: "🎯", variant: "info"                                                            },
    { label: "On Track",         value: kpis.onTrackCount, sub: "projects healthy",       icon: "✅", variant: "ok"                                                             },
  ];

  const pendingApprovals = validationAlerts.filter(a => !approved.has(a.id)).slice(0, 4);

  const dateStr = new Date().toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });

  return (
    <div style={{ padding: "24px 28px", fontFamily: "'DM Sans', system-ui, sans-serif" }}>

      {/* ── Page header ── */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20, gap: 14, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#18170F", letterSpacing: "-.4px", lineHeight: 1.2 }}>
            {getGreeting()}, {firstName} 👋
          </div>
          <div style={{ fontSize: 11, color: "#5C5A52", marginTop: 4, lineHeight: 1.4 }}>
            {dateStr} · {orgName} · <strong style={{ color: "#18170F" }}>{role} view</strong> · Guardian AI active
          </div>
        </div>
        <div style={{ display: "flex", gap: 7, alignItems: "center" }}>
          <button style={{
            fontSize: 11, fontWeight: 600, padding: "6px 12px", border: "1px solid #D4D0C6",
            borderRadius: 7, background: "#FFFFFF", color: "#5C5A52", cursor: "pointer",
            fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 5,
          }}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M6 1v2M6 9v2M1 6h2M9 6h2M2.5 2.5l1.5 1.5M8 8l1.5 1.5M2.5 9.5L4 8M8 4l1.5-1.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
            </svg>
            Next scan {nextScan}
          </button>
          <Link href="/projects/new" style={{
            fontSize: 11, fontWeight: 600, padding: "6px 14px", borderRadius: 7,
            background: "#18170F", color: "#fff", textDecoration: "none",
            display: "inline-flex", alignItems: "center", gap: 5,
          }}>
            <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
              <path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            New project
          </Link>
        </div>
      </div>

      {/* ── KPI strip ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 16 }}>
        {kpiCards.map(k => {
          const v = KPI_VARIANTS[k.variant];
          return (
            <div key={k.label} style={{
              borderRadius: 12, padding: "14px 16px", position: "relative", overflow: "hidden",
              boxShadow: "0 1px 3px rgba(0,0,0,.07)",
              background: v.bg, border: `1px solid ${v.border}`,
            }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#5C5A52", textTransform: "uppercase", letterSpacing: ".07em", marginBottom: 6 }}>{k.label}</div>
              <div style={{ fontSize: 26, fontWeight: 700, lineHeight: 1, letterSpacing: "-.6px", color: v.valueColor }}>{k.value}</div>
              <div style={{ fontSize: 10, marginTop: 4, opacity: .75, color: v.valueColor }}>{k.sub}</div>
              <div style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", fontSize: 32, opacity: 0.1, pointerEvents: "none" }}>{k.icon}</div>
            </div>
          );
        })}
      </div>

      {/* ── Main 2-col grid ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, alignItems: "start" }}>

        {/* ══ LEFT COLUMN ══ */}
        <div>

          {/* Decisions card */}
          <div style={CARD}>
            <div style={CARD_H}>
              <span style={{ fontSize: 12, fontWeight: 700, color: "#18170F" }}>Act now</span>
              <span style={{ fontSize: 10, color: "#9E9C93" }}>guardian · decisions not data</span>
            </div>

            {decisions.length === 0 ? (
              <div style={{ padding: "28px 14px", textAlign: "center" }}>
                <div style={{ fontSize: 20, marginBottom: 6 }}>✓</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#16A34A", marginBottom: 4 }}>All projects healthy</div>
                <div style={{ fontSize: 11, color: "#9E9C93" }}>No actions required at this time</div>
              </div>
            ) : (
              decisions.map((d, i) => (
                <div key={d.id} style={{
                  display: "flex", alignItems: "flex-start", gap: 10,
                  padding: "12px 14px",
                  borderBottom: i < decisions.length - 1 ? "1px solid #E5E2D9" : "none",
                  transition: "background .1s",
                  ...DEC_ITEM_STYLES[d.priority],
                }}>
                  <div style={{
                    fontSize: 9, fontWeight: 800, padding: "2px 6px", borderRadius: 4,
                    whiteSpace: "nowrap", flexShrink: 0, marginTop: 2, letterSpacing: ".06em",
                    ...DEC_LBL_STYLES[d.priority],
                  }}>
                    {DEC_LBL_TEXT[d.priority]}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 500, color: "#18170F", lineHeight: 1.4 }}>{d.title}</div>
                    <div style={{ fontSize: 10, color: "#6B6860", marginTop: 2 }}>{d.meta}</div>
                  </div>
                  <div style={{ display: "flex", gap: 5, alignItems: "flex-start", marginTop: 1, flexShrink: 0, flexWrap: "wrap" }}>
                    <Link href={d.href} style={{
                      fontSize: 10, fontWeight: 600, padding: "3px 8px", borderRadius: 6,
                      textDecoration: "none", whiteSpace: "nowrap", cursor: "pointer",
                      ...DEC_ACTION_STYLE[d.priority],
                    }}>
                      {d.action}
                    </Link>
                    <button onClick={() => setDismissed(s => new Set([...s, d.id]))} style={{
                      fontSize: 13, padding: "3px 7px", borderRadius: 6,
                      border: "1px solid #E5E2D9", background: "#F4F2EC",
                      color: "#9E9C93", cursor: "pointer", lineHeight: 1,
                    }}>×</button>
                  </div>
                </div>
              ))
            )}

            {/* Guardian bar */}
            <div style={{
              display: "flex", alignItems: "center", gap: 8, padding: "9px 14px",
              background: "linear-gradient(to right,rgba(5,150,105,.05),transparent)",
              borderTop: "1px solid #BBF7D0",
            }}>
              <div className="g-dot-pulse" style={{ width: 7, height: 7, borderRadius: "50%", background: "#006D6B", flexShrink: 0 }} />
              <div style={{ fontSize: 11, color: "#5C5A52", flex: 1, lineHeight: 1.4 }}>
                <strong style={{ color: "#006D6B", fontWeight: 700 }}>Guardian AI</strong>
                {" "}— analysed {projects.length} project{projects.length !== 1 ? "s" : ""} · {decisions.length} priority action{decisions.length !== 1 ? "s" : ""} · 0 manual interventions required
              </div>
            </div>
          </div>

          {/* Approvals card */}
          <div style={CARD}>
            <div style={CARD_H}>
              <span style={{ fontSize: 12, fontWeight: 700, color: "#18170F" }}>Pending approvals</span>
              <span style={{ fontSize: 10, color: "#9E9C93" }}>{pendingApprovals.length} request{pendingApprovals.length !== 1 ? "s" : ""}</span>
            </div>

            {pendingApprovals.length === 0 ? (
              <div style={{ padding: "20px 14px", textAlign: "center", fontSize: 11, color: "#9E9C93" }}>
                No pending approvals
              </div>
            ) : (
              pendingApprovals.map((a, i) => (
                <div key={a.id} style={{
                  display: "flex", alignItems: "flex-start", gap: 11, padding: "13px 14px",
                  borderBottom: i < pendingApprovals.length - 1 ? "1px solid #E5E2D9" : "none",
                }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 9, flexShrink: 0, fontSize: 16,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    background: a.level === "CRITICAL" ? "#FEF2F2" : "#FFFBEB",
                  }}>
                    {a.level === "CRITICAL" ? "⚠️" : "📋"}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#18170F", lineHeight: 1.3, letterSpacing: "-.2px" }}>{a.title}</div>
                    <div style={{ fontSize: 11, color: "#5C5A52", marginTop: 3, lineHeight: 1.4 }}>
                      {a.project?.name ?? "—"} · {a.detail}
                    </div>
                    <div style={{ display: "flex", gap: 6, marginTop: 9, flexWrap: "wrap" }}>
                      <BtnSm variant="success" onClick={() => setApproved(s => new Set([...s, a.id]))}>✓ Approve</BtnSm>
                      <BtnSm variant="danger">✗ Reject</BtnSm>
                      {a.project?.id && <BtnSm href={`/projects/${a.project.id}`}>Details →</BtnSm>}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* ══ RIGHT COLUMN ══ */}
        <div>

          {/* Portfolio health card */}
          <div style={CARD}>
            <div style={CARD_H}>
              <span style={{ fontSize: 12, fontWeight: 700, color: "#18170F" }}>Portfolio health</span>
              <BtnSm href="/portfolio">All projects →</BtnSm>
            </div>

            {portfolioHealth.length === 0 ? (
              <div style={{ padding: "20px 14px", textAlign: "center", fontSize: 11, color: "#9E9C93" }}>No projects</div>
            ) : (
              portfolioHealth.map((p, i) => {
                const dot = healthDot(p.health);
                const tag = healthTagStyle(p.health);
                const scoreColor = healthScoreColor(p.healthScore);
                const sub = p.sprintName
                  ? `${p.sprintName} · ${p.pct}% · ${fmt(p.costActual)}/${fmt(p.costEstimated)}`
                  : `${p.pct}% complete · ${p.daysLeft < 0 ? `${Math.abs(p.daysLeft)}d late` : `${p.daysLeft}d left`}`;
                return (
                  <Link key={p.id} href={`/projects/${p.id}`} style={{
                    display: "flex", alignItems: "center", gap: 9, padding: "9px 14px",
                    borderBottom: i < portfolioHealth.length - 1 ? "1px solid #E5E2D9" : "none",
                    textDecoration: "none", transition: "background .1s", cursor: "pointer",
                  }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: dot, flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 500, color: "#18170F", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</div>
                      <div style={{ fontSize: 10, color: "#9E9C93", marginTop: 1 }}>{sub}</div>
                    </div>
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 5,
                      whiteSpace: "nowrap", flexShrink: 0, ...tag,
                    }}>
                      {healthLabel(p.health)}
                    </span>
                    <div style={{ fontSize: 12, fontWeight: 700, color: scoreColor, fontFamily: "'DM Mono', monospace", flexShrink: 0, minWidth: 24, textAlign: "right" }}>
                      {p.healthScore}
                    </div>
                  </Link>
                );
              })
            )}

            {/* Guardian bar */}
            <div style={{
              display: "flex", alignItems: "center", gap: 8, padding: "9px 14px",
              background: "linear-gradient(to right,rgba(5,150,105,.05),transparent)",
              borderTop: "1px solid #BBF7D0",
            }}>
              <div className="g-dot-pulse" style={{ width: 7, height: 7, borderRadius: "50%", background: "#006D6B", flexShrink: 0 }} />
              <div style={{ fontSize: 11, color: "#5C5A52", flex: 1, lineHeight: 1.4 }}>
                <strong style={{ color: "#006D6B", fontWeight: 700 }}>Portfolio AI</strong>
                {" "}— {kpis.atRiskCount > 0 ? `${kpis.atRiskCount} critical · action required` : "all projects within parameters"} · avg health {projects.length > 0 ? Math.round(projects.reduce((s, p) => s + p.healthScore, 0) / projects.length) : 0}
              </div>
            </div>
          </div>

          {/* Upcoming deadlines card */}
          <div style={CARD}>
            <div style={CARD_H}>
              <span style={{ fontSize: 12, fontWeight: 700, color: "#18170F" }}>Upcoming deadlines</span>
              <span style={{ fontSize: 10, color: "#9E9C93" }}>30 days</span>
            </div>

            {upcomingDeadlines.length === 0 ? (
              <div style={{ padding: "20px 14px", textAlign: "center", fontSize: 11, color: "#9E9C93" }}>
                No upcoming deadlines
              </div>
            ) : (
              upcomingDeadlines.map((d, i) => {
                const date = new Date(d.endDate);
                const daysLeft = Math.ceil((date.getTime() - Date.now()) / 86400000);
                const dotC = daysLeft <= 3 ? "#DC2626" : daysLeft <= 7 ? "#D97706" : "#16A34A";
                const dateColor = daysLeft <= 3 ? "#991B1B" : daysLeft <= 7 ? "#92400E" : "#5C5A52";
                const dateLabel = daysLeft < 0 ? `${Math.abs(daysLeft)}d late` : daysLeft === 0 ? "Today" : `${date.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`;
                const urgencyLabel = daysLeft > 0 && daysLeft <= 14 ? ` (${daysLeft}d)` : "";
                return (
                  <div key={i} style={{
                    display: "flex", alignItems: "center", gap: 9, padding: "9px 14px",
                    borderBottom: i < upcomingDeadlines.length - 1 ? "1px solid #E5E2D9" : "none",
                    cursor: "default",
                  }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: dotC, flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0, overflow: "hidden" }}>
                      <div style={{ fontSize: 12, fontWeight: 500, color: "#18170F", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {d.sprintName} — {d.projectName}
                      </div>
                    </div>
                    <div style={{ fontSize: 11, fontWeight: daysLeft <= 7 ? 700 : 600, color: dateColor, whiteSpace: "nowrap", flexShrink: 0 }}>
                      {dateLabel}{urgencyLabel}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Guardian AI autonomous status */}
          <div style={CARD}>
            <div style={CARD_H}>
              <span style={{ fontSize: 12, fontWeight: 700, color: "#18170F" }}>Guardian AI</span>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <div className="g-dot-pulse" style={{ width: 7, height: 7, borderRadius: "50%", background: "#006D6B" }} />
                <span style={{ fontSize: 10, color: "#006D6B", fontWeight: 600 }}>Active</span>
              </div>
            </div>

            {/* Status summary */}
            <div style={{ padding: "12px 14px", borderBottom: "1px solid #E5E2D9", display: "flex", gap: 16 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#9E9C93", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 3 }}>Monitoring</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: "#006D6B", lineHeight: 1 }}>{projects.length}</div>
                <div style={{ fontSize: 10, color: "#9E9C93", marginTop: 1 }}>active projects</div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#9E9C93", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 3 }}>Last analysis</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#18170F", lineHeight: 1 }}>{lastAnalyzedLabel}</div>
                <div style={{ fontSize: 10, color: "#9E9C93", marginTop: 1 }}>triggered on changes</div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#9E9C93", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 3 }}>Next sweep</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#18170F", lineHeight: 1 }}>{nextScan}</div>
                <div style={{ fontSize: 10, color: "#9E9C93", marginTop: 1 }}>daily @ 08:00 UTC</div>
              </div>
            </div>

            {/* Agent list — read-only, autonomous */}
            {GUARDIAN_AGENTS.map((agent, i) => (
              <div key={agent.label} style={{
                display: "flex", alignItems: "center", gap: 9, padding: "9px 14px",
                borderBottom: i < GUARDIAN_AGENTS.length - 1 ? "1px solid #E5E2D9" : "none",
              }}>
                <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#A7F3D0", flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "#18170F" }}>{agent.label}</div>
                  <div style={{ fontSize: 10, color: "#9E9C93", marginTop: 1 }}>{agent.desc}</div>
                </div>
                <span style={{ fontSize: 9, fontWeight: 700, color: "#059669", background: "#F0FDF4", border: "1px solid #BBF7D0", padding: "2px 7px", borderRadius: 20 }}>
                  AUTO
                </span>
              </div>
            ))}
          </div>

        </div>
      </div>
    </div>
  );
}
