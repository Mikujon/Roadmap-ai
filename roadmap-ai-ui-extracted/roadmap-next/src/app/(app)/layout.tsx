import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { Role } from "@prisma/client";
import { db } from "@/lib/prisma";
import { calculateHealth } from "@/lib/health";
import TopbarClient from "./TopbarClient";
import { SidebarNavLinks } from "./SidebarNav";
import { InactivityModal } from "@/components/ui/inactivity-modal";

const HEALTH_DOT: Record<string, string> = {
  OFF_TRACK:   "#DC2626",
  AT_RISK:     "#D97706",
  ON_TRACK:    "#059669",
  COMPLETED:   "#2563EB",
  NOT_STARTED: "#CCC9BF",
};

const IC = {
  dashboard: <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><rect x="1" y="1" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.3"/><rect x="9" y="1" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.3"/><rect x="1" y="9" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.3"/><rect x="9" y="9" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.3"/></svg>,
  portfolio:  <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><path d="M1 11L5 7l4 3 6-7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  financials: <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.3"/><path d="M8 4v8M6 10.5h3.5a1.5 1.5 0 000-3H6.5a1.5 1.5 0 010-3H10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>,
  alerts:     <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><path d="M8 1.5A4.5 4.5 0 003.5 6v3L2.5 11h11l-1-2V6A4.5 4.5 0 008 1.5zM6.5 13a1.5 1.5 0 003 0" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>,
  archive:    <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><rect x="1" y="5" width="14" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.3"/><path d="M1 5l2-3h10l2 3M6 10h4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>,
  team:       <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><circle cx="6" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.3"/><circle cx="11" cy="5" r="2" stroke="currentColor" strokeWidth="1.3"/><path d="M1 13c0-2.5 2-4.5 5-4.5s5 2 5 4.5M11 9c1.5.5 2.5 2 2.5 3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>,
  integrations: <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><path d="M6 8l-4 4M10 8l4-4M3 13a1.5 1.5 0 100-3 1.5 1.5 0 000 3zM13 6a1.5 1.5 0 100-3 1.5 1.5 0 000 3zM8 9a1.5 1.5 0 100-3 1.5 1.5 0 000 3z" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>,
  billing:    <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><rect x="1.5" y="3.5" width="13" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.3"/><path d="M1.5 7h13" stroke="currentColor" strokeWidth="1.3"/></svg>,
  roadmap:    <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><path d="M2 4h5M2 8h9M2 12h6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/><circle cx="9" cy="4" r="1.5" stroke="currentColor" strokeWidth="1.2"/><circle cx="13" cy="8" r="1.5" stroke="currentColor" strokeWidth="1.2"/><circle cx="10" cy="12" r="1.5" stroke="currentColor" strokeWidth="1.2"/></svg>,
  settings:   <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="2.5" stroke="currentColor" strokeWidth="1.3"/><path d="M8 1.5v1M8 13.5v1M1.5 8h1M13.5 8h1M3.3 3.3l.7.7M12 12l.7.7M12 4l-.7.7M4 12l-.7.7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>,
  plus:       <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><path d="M8 2v12M2 8h12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>,
};

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/sign-in");

  const role = ctx.role as Role;

  const [rawProjects, unreadCount] = await Promise.all([
    db.project.findMany({
      where: { organisationId: ctx.org.id, status: { notIn: ["CLOSED","ARCHIVED"] } },
      select: {
        id: true, name: true, startDate: true, endDate: true, budgetTotal: true,
        sprints: { select: { status: true, features: { select: { status: true } } } },
        risks: { select: { status: true, probability: true, impact: true } },
        assignments: { select: { estimatedHours: true, actualHours: true, resource: { select: { costPerHour: true, capacityHours: true } } } },
      },
      orderBy: { updatedAt: "desc" },
      take: 10,
    }),
    db.alert.count({ where: { organisationId: ctx.org.id, read: false } }),
  ]);

  const sidebarProjects = rawProjects.map(p => {
    const allF       = p.sprints.flatMap(s => s.features);
    const done       = allF.filter(f => f.status === "DONE").length;
    const blocked    = allF.filter(f => f.status === "BLOCKED").length;
    const inProg     = allF.filter(f => f.status === "IN_PROGRESS").length;
    const costActual = p.assignments.reduce((s, a) => s + a.actualHours * a.resource.costPerHour, 0);
    const costEst    = p.assignments.reduce((s, a) => s + a.estimatedHours * a.resource.costPerHour, 0);
    const openRisks  = p.risks.filter(r => r.status === "OPEN").length;
    const highRisks  = p.risks.filter(r => r.status === "OPEN" && r.probability * r.impact >= 9).length;
    const maxRisk    = p.risks.filter(r => r.status === "OPEN").reduce((m, r) => Math.max(m, r.probability * r.impact), 0);
    const h = calculateHealth({
      startDate: p.startDate, endDate: p.endDate,
      totalFeatures: allF.length, doneFeatures: done,
      blockedFeatures: blocked, inProgressFeatures: inProg,
      totalSprints: p.sprints.length,
      doneSprints: p.sprints.filter(s => s.status === "DONE").length,
      activeSprints: p.sprints.filter(s => s.status === "ACTIVE").length,
      budgetTotal: p.budgetTotal, costActual, costEstimated: costEst,
      totalCapacityHours: p.assignments.reduce((s, a) => s + a.resource.capacityHours, 0),
      totalActualHours: p.assignments.reduce((s, a) => s + a.actualHours, 0),
      openRisks, highRisks, maxRiskScore: maxRisk,
    });
    return { id: p.id, name: p.name, dot: HEALTH_DOT[h.status] ?? "#CCC9BF" };
  });

  const initials = (ctx.user.name ?? ctx.user.email ?? "U")
    .split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase();

  const mainNavItems = [
    { href: "/dashboard", label: "Command Center", icon: IC.dashboard },
    { href: "/portfolio",  label: "Portfolio",      icon: IC.portfolio },
    { href: "/cost",       label: "Financials",     icon: IC.financials },
    { href: "/alerts",     label: "Alerts",         icon: IC.alerts, badge: unreadCount },
  ];

  const workspaceNavItems = [
    { href: "/archive",               label: "Archive",      icon: IC.archive      },
    { href: "/settings/team",         label: "Team",         icon: IC.team         },
    { href: "/settings/integrations", label: "Integrations", icon: IC.integrations },
    { href: "/settings/billing",      label: "Billing",      icon: IC.billing      },
    { href: "/roadmap",               label: "Roadmap",      icon: IC.roadmap      },
    { href: "/settings",              label: "Settings",     icon: IC.settings     },
  ];

  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box }
        .app      { display: flex; flex-direction: column; height: 100vh; overflow: hidden }
        .topbar   { height: 52px; background: #FFFFFF; border-bottom: 1px solid #E5E2D9; display: flex; align-items: center; padding: 0 18px; gap: 8px; flex-shrink: 0; z-index: 20 }
        .body-wrap { display: flex; flex: 1; overflow: hidden }
        .sidebar  { width: 220px; background: #FFFFFF; border-right: 1px solid #E5E2D9; display: flex; flex-direction: column; overflow-y: auto; flex-shrink: 0 }
        .sb-inner { padding: 8px 0 16px; display: flex; flex-direction: column; flex: 1 }
        .sb-sect  { padding: 14px 12px 4px; font-size: 9px; font-weight: 700; color: #9E9C93; letter-spacing: .09em; text-transform: uppercase }
        .sb-div   { height: 1px; background: #E5E2D9; margin: 8px 12px; flex-shrink: 0 }
        .sb-proj  { display: flex; align-items: center; gap: 8px; padding: 6px 10px; font-size: 12px; color: #5C5A52; border-radius: 7px; margin: 1px 6px; transition: .1s; text-decoration: none; overflow: hidden }
        .sb-proj:hover { background: #F0EEE8; color: #18170F }
        .p-dot    { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; display: inline-block }
        .sb-proj-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap }
        .sb-new-proj { display: flex; align-items: center; gap: 8px; padding: 6px 10px; border-radius: 7px; text-decoration: none; font-size: 12px; color: #5C5A52; margin: 1px 6px; transition: .1s; border: none; background: none; cursor: pointer; font-family: inherit; width: calc(100% - 12px); text-align: left }
        .sb-new-proj:hover { background: #F0EEE8; color: #18170F }
        .main-area { flex: 1; overflow-y: auto; background: #F8F7F3; min-width: 0 }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:.4} }
        @keyframes modalEnter { from{opacity:0;transform:scale(.96) translateY(-8px)} to{opacity:1;transform:scale(1) translateY(0)} }
        @keyframes slideIn { from{transform:translateX(120%)} to{transform:translateX(0)} }
        .g-dot-pulse { animation: blink 2s infinite }
      `}</style>

      <div className="app">
        <header className="topbar">
          <TopbarClient
            orgName={ctx.org.name}
            unreadCount={unreadCount}
            initials={initials}
            preferredView={(ctx.user.preferredView ?? "PMO") as "PMO"|"CEO"|"STK"|"DEV"}
          />
        </header>

        <div className="body-wrap">
          <aside className="sidebar">
            <div className="sb-inner">
              <div className="sb-sect">Main</div>
              <SidebarNavLinks items={mainNavItems} />

              <div className="sb-div" />

              <div className="sb-sect">Projects</div>
              {sidebarProjects.map(p => (
                <Link key={p.id} href={`/projects/${p.id}`} className="sb-proj">
                  <span className="p-dot" style={{ background: p.dot }} />
                  <span className="sb-proj-name">{p.name}</span>
                </Link>
              ))}
              {can.createProject(role) && (
                <Link href="/projects/new" className="sb-new-proj">
                  <span style={{ width: 15, height: 15, display: "flex", alignItems: "center", justifyContent: "center", opacity: 0.55 }}>{IC.plus}</span>
                  New project
                </Link>
              )}

              <div className="sb-div" />

              <div className="sb-sect">Workspace</div>
              <SidebarNavLinks items={workspaceNavItems} />
            </div>
          </aside>

          <main className="main-area">
            {children}
          </main>
        </div>
      </div>

      <InactivityModal />
    </>
  );
}
