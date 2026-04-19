import { UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { Role } from "@prisma/client";
import { db } from "@/lib/prisma";
import { calculateHealth } from "@/lib/health";
import NotificationBell from "./NotificationBell";
import MobileSidebar from "./MobileSidebar";

// Health → dot color
const HEALTH_DOT: Record<string, string> = {
  OFF_TRACK:   "#DC2626",
  AT_RISK:     "#D97706",
  ON_TRACK:    "#059669",
  COMPLETED:   "#2563EB",
  NOT_STARTED: "#CBD5E1",
};

const MAIN_NAV = [
  { href: "/dashboard", label: "Command Center", icon: "⌘" },
  { href: "/portfolio",  label: "Portfolio",      icon: "▤" },
  { href: "/cost",       label: "Costs",           icon: "◈" },
  { href: "/archive",    label: "Archive",         icon: "◫" },
];

const BOTTOM_NAV = [
  { href: "/settings/team", label: "Team",     icon: "⊹" },
  { href: "/settings",      label: "Settings", icon: "◎" },
];

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/sign-in");

  const role = ctx.role as Role;

  // Fetch sidebar projects with enough data to compute health
  const rawProjects = await db.project.findMany({
    where: { organisationId: ctx.org.id, status: { notIn: ["CLOSED", "ARCHIVED"] } },
    select: {
      id: true,
      name: true,
      startDate: true,
      endDate: true,
      budgetTotal: true,
      sprints: {
        select: {
          status: true,
          features: { select: { status: true } },
        },
      },
      risks: { select: { status: true, probability: true, impact: true } },
      assignments: {
        select: {
          estimatedHours: true,
          actualHours: true,
          resource: { select: { costPerHour: true, capacityHours: true } },
        },
      },
    },
    orderBy: { updatedAt: "desc" },
    take: 10,
  });

  const sidebarProjects = rawProjects.map(p => {
    const allF        = p.sprints.flatMap(s => s.features);
    const done        = allF.filter(f => f.status === "DONE").length;
    const blocked     = allF.filter(f => f.status === "BLOCKED").length;
    const inProgress  = allF.filter(f => f.status === "IN_PROGRESS").length;
    const activeSprints = p.sprints.filter(s => s.status === "ACTIVE").length;
    const costActual  = p.assignments.reduce((s, a) => s + a.actualHours    * a.resource.costPerHour, 0);
    const costEst     = p.assignments.reduce((s, a) => s + a.estimatedHours * a.resource.costPerHour, 0);
    const openRisks   = p.risks.filter(r => r.status === "OPEN").length;
    const highRisks   = p.risks.filter(r => r.status === "OPEN" && r.probability * r.impact >= 9).length;
    const maxRiskScore = p.risks.filter(r => r.status === "OPEN").reduce((m, r) => Math.max(m, r.probability * r.impact), 0);

    const h = calculateHealth({
      startDate: p.startDate, endDate: p.endDate,
      totalFeatures: allF.length, doneFeatures: done,
      blockedFeatures: blocked, inProgressFeatures: inProgress,
      totalSprints: p.sprints.length,
      doneSprints: p.sprints.filter(s => s.status === "DONE").length,
      activeSprints,
      budgetTotal: p.budgetTotal, costActual, costEstimated: costEst,
      totalCapacityHours: p.assignments.reduce((s, a) => s + a.resource.capacityHours, 0),
      totalActualHours:   p.assignments.reduce((s, a) => s + a.actualHours, 0),
      openRisks, highRisks, maxRiskScore,
    });

    return { id: p.id, name: p.name, health: h.status };
  });

  const ALL_NAV_FOR_MOBILE = [
    ...MAIN_NAV,
    ...(can.createProject(role) ? [{ href: "/projects/new", label: "New Project", icon: "+", accent: true as const }] : []),
    ...BOTTOM_NAV,
  ];

  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Inter', system-ui, sans-serif; background: #F0F2F5; color: #0F172A; }

        .nav-link {
          display: flex; align-items: center; gap: 9px; padding: 7px 10px;
          border-radius: 8px; color: #64748B; text-decoration: none;
          font-size: 13px; font-weight: 500; transition: all 0.12s;
        }
        .nav-link:hover { background: #F1F5F9; color: #0F172A; }

        .nav-icon {
          width: 26px; height: 26px; display: flex; align-items: center;
          justify-content: center; border-radius: 6px; font-size: 12px;
          background: #F1F5F9; color: #64748B; flex-shrink: 0; transition: all 0.12s;
        }
        .nav-link:hover .nav-icon { background: #E2E8F0; color: #0F172A; }

        .nav-link.new-proj {
          background: #006D6B; color: #fff; font-weight: 600; margin-top: 4px;
        }
        .nav-link.new-proj:hover { background: #005a58; }
        .nav-link.new-proj .nav-icon { background: rgba(255,255,255,0.2); color: #fff; }

        .proj-link {
          display: flex; align-items: center; gap: 8px; padding: 5px 10px;
          border-radius: 7px; color: #64748B; text-decoration: none;
          font-size: 12px; font-weight: 500; transition: all 0.12s; overflow: hidden;
        }
        .proj-link:hover { background: #F1F5F9; color: #0F172A; }
        .proj-link span.name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

        .sb-label {
          font-size: 9px; font-weight: 700; color: #CBD5E1;
          letter-spacing: 0.08em; text-transform: uppercase; padding: 10px 10px 4px;
        }

        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #CBD5E1; border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: #94A3B8; }

        @media (max-width: 768px) {
          .sidebar-desktop { display: none !important; }
          .hamburger-btn { display: flex !important; }
          main { padding-top: 56px; }
        }
        .hamburger-btn {
          display: none; position: fixed; top: 12px; left: 12px; z-index: 300;
          width: 40px; height: 40px; background: #fff; border: 1px solid #E2E8F0;
          border-radius: 10px; align-items: center; justify-content: center;
          cursor: pointer; font-size: 18px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);
        }
      `}</style>

      <div style={{ display: "flex", minHeight: "100vh" }}>
        {/* ── Sidebar ── */}
        <aside className="sidebar-desktop" style={{
          width: 220, background: "#FFFFFF", borderRight: "1px solid #E2E8F0",
          display: "flex", flexDirection: "column", padding: "0 10px",
          position: "sticky", top: 0, height: "100vh", flexShrink: 0,
        }}>

          {/* Logo */}
          <Link href="/dashboard" style={{ padding: "16px 8px 12px", display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
            <div style={{ width: 30, height: 30, background: "linear-gradient(135deg, #006D6B, #0891B2)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 11, color: "#fff", letterSpacing: "-0.5px", flexShrink: 0 }}>RM</div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 13, color: "#0F172A", letterSpacing: "-0.3px" }}>RoadmapAI</div>
              <div style={{ fontSize: 10, color: "#94A3B8" }}>{ctx.org.name}</div>
            </div>
          </Link>

          {/* Main nav */}
          <div className="sb-label">Menu</div>
          <nav style={{ display: "flex", flexDirection: "column", gap: 1 }}>
            {MAIN_NAV.map(n => (
              <Link key={n.href} href={n.href} className="nav-link">
                <span className="nav-icon">{n.icon}</span>
                {n.label}
              </Link>
            ))}
            {can.createProject(role) && (
              <Link href="/projects/new" className="nav-link new-proj">
                <span className="nav-icon">+</span>
                New Project
              </Link>
            )}
          </nav>

          {/* Projects list with health dots */}
          {sidebarProjects.length > 0 && (
            <>
              <div className="sb-label" style={{ marginTop: 4 }}>Projects</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 1, overflowY: "auto", maxHeight: 240 }}>
                {sidebarProjects.map(p => (
                  <Link key={p.id} href={`/projects/${p.id}`} className="proj-link">
                    <span style={{
                      width: 7, height: 7, borderRadius: "50%", flexShrink: 0,
                      background: HEALTH_DOT[p.health] ?? HEALTH_DOT.NOT_STARTED,
                    }} />
                    <span className="name">{p.name}</span>
                  </Link>
                ))}
              </div>
            </>
          )}

          {/* Spacer */}
          <div style={{ flex: 1 }} />

          {/* Bottom nav */}
          <div className="sb-label">Workspace</div>
          <nav style={{ display: "flex", flexDirection: "column", gap: 1 }}>
            {BOTTOM_NAV.map(n => (
              <Link key={n.href} href={n.href} className="nav-link">
                <span className="nav-icon">{n.icon}</span>
                {n.label}
              </Link>
            ))}
          </nav>

          {/* Notification bell */}
          <div style={{ margin: "4px 0 2px" }}>
            <NotificationBell orgId={ctx.org.id} />
          </div>

          {/* User */}
          <div style={{ borderTop: "1px solid #F1F5F9", padding: "10px 8px 14px", display: "flex", alignItems: "center", gap: 10 }}>
            <UserButton />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#0F172A", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ctx.user.name ?? ""}</div>
              <div style={{ fontSize: 10, color: "#94A3B8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ctx.org.name}</div>
            </div>
          </div>
        </aside>

        {/* ── Main ── */}
        <main style={{ flex: 1, overflowY: "auto", background: "#F0F2F5" }}>
          {children}
        </main>

        <MobileSidebar nav={ALL_NAV_FOR_MOBILE} userName={ctx.user.name ?? ""} orgName={ctx.org.name} roleMeta={{ color: "#006D6B", bg: "rgba(0,109,107,0.1)", label: ctx.role }} />
      </div>
    </>
  );
}
