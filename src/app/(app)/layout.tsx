import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { Role } from "@prisma/client";
import { db } from "@/lib/prisma";
import TopbarClient from "./TopbarClient";

const DOT_COLORS = [
  "#E5291A","#D97708","#16A34A","#2563EB",
  "#7C3AED","#0891B2","#059669","#EA580C",
];

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/sign-in");

  const role = ctx.role as Role;

  const [sidebarProjects, unreadCount] = await Promise.all([
    db.project.findMany({
      where:   { organisationId: ctx.org.id, status: { notIn: ["CLOSED", "ARCHIVED"] } },
      select:  { id: true, name: true },
      orderBy: { updatedAt: "desc" },
      take: 8,
    }),
    db.alert.count({ where: { organisationId: ctx.org.id, read: false } }),
  ]);

  const initials = (ctx.user.name ?? ctx.user.email)
    .split(" ")
    .map((w: string) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <>
      <style>{`
        .app-shell { display:flex; flex-direction:column; height:100vh; overflow:hidden; }

        /* ── Topbar ── */
        .topbar {
          height: var(--topbar);
          background: var(--surface);
          border-bottom: 1px solid var(--border);
          display: flex;
          align-items: center;
          padding: 0 14px;
          gap: 8px;
          flex-shrink: 0;
          z-index: 20;
        }
        .logo { font-size:14px; font-weight:700; color:var(--text); letter-spacing:-.4px; text-decoration:none; }
        .logo em { color:var(--guardian); font-style:normal; }
        .top-nav { display:flex; gap:1px; margin-left:6px; }
        .tl {
          padding: 5px 11px;
          font-size: 12px;
          color: var(--text2);
          cursor: pointer;
          border-radius: 6px;
          border: none;
          background: none;
          font-family: inherit;
          text-decoration: none;
          display: flex;
          align-items: center;
          transition: .12s;
        }
        .tl:hover { color:var(--text); background:var(--surface2); }
        .tl.active { color:var(--text); background:var(--surface2); font-weight:500; }

        /* ── Body ── */
        .body-wrap { display:flex; flex:1; overflow:hidden; }

        /* ── Sidebar ── */
        .sidebar {
          width: var(--sidebar);
          background: var(--surface);
          border-right: 1px solid var(--border);
          display: flex;
          flex-direction: column;
          overflow-y: auto;
          flex-shrink: 0;
        }
        .sb-sect { padding:12px 10px 3px; font-size:9px; font-weight:700; color:var(--text3); letter-spacing:.08em; text-transform:uppercase; }
        .sb-item {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 6px 10px;
          font-size: 12px;
          color: var(--text2);
          cursor: pointer;
          border-radius: 7px;
          margin: 1px 5px;
          transition: .1s;
          border: none;
          background: none;
          width: calc(100% - 10px);
          text-align: left;
          font-family: inherit;
          text-decoration: none;
        }
        .sb-item:hover { background:var(--surface2); color:var(--text); }
        .sb-item.active { background:var(--surface2); color:var(--text); font-weight:500; }
        .sb-badge { margin-left:auto; background:var(--red); color:#fff; border-radius:10px; font-size:9px; font-weight:700; padding:1px 5px; min-width:16px; text-align:center; }
        .sb-div { height:1px; background:var(--border); margin:7px 14px; }
        .sb-proj {
          display: flex;
          align-items: center;
          gap: 7px;
          padding: 5px 10px;
          font-size: 12px;
          color: var(--text2);
          cursor: pointer;
          border-radius: 7px;
          margin: 1px 5px;
          transition: .1s;
          text-decoration: none;
          overflow: hidden;
        }
        .sb-proj:hover { background:var(--surface2); color:var(--text); }
        .sb-proj span { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }

        /* ── Main ── */
        .main { flex:1; overflow-y:auto; background:var(--bg); }

        /* ── Mobile ── */
        @media (max-width: 768px) {
          .sidebar { display: none; }
          .top-nav { display: none; }
        }
      `}</style>

      <div className="app-shell">
        {/* ── Topbar ── */}
        <div className="topbar">
          <Link href="/dashboard" className="logo">Roadmap<em>AI</em></Link>

          {/* Org name */}
          <span style={{ fontSize: 11, color: 'var(--text2)', padding: '3px 9px', border: '1px solid var(--border)', borderRadius: 20, display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--guardian)', display: 'inline-block' }} className="g-dot-pulse" />
            {ctx.org.name}
          </span>

          {/* Top nav links */}
          <nav className="top-nav">
            {[
              { href: "/dashboard",  label: "Dashboard"  },
              { href: "/portfolio",  label: "Portfolio"  },
              { href: "/cost",       label: "Financials" },
              { href: "/archive",    label: "Archive"    },
            ].map(n => (
              <Link key={n.href} href={n.href} className="tl">{n.label}</Link>
            ))}
          </nav>

          {/* Right side — role switcher + alerts + avatar (client) */}
          <div style={{ marginLeft: 'auto' }}>
            <TopbarClient
              unreadCount={unreadCount}
              initials={initials}
              preferredView={(ctx.user.preferredView ?? "PMO") as "PMO" | "CEO" | "STK" | "DEV"}
            />
          </div>
        </div>

        <div className="body-wrap">
          {/* ── Sidebar ── */}
          <aside className="sidebar">
            <div style={{ padding: '6px 0 8px' }}>
              <div className="sb-sect">Main</div>

              {[
                { href: "/dashboard", label: "Dashboard",  icon: "⊞" },
                { href: "/portfolio", label: "Portfolio",  icon: "⟋" },
                { href: "/cost",      label: "Financials", icon: "◈" },
                { href: "/alerts",    label: "Alerts",     icon: "🔔", badge: unreadCount > 0 ? unreadCount : undefined },
              ].map(n => (
                <Link key={n.href} href={n.href} className="sb-item">
                  <span style={{ fontSize: 13, width: 16, textAlign: 'center', flexShrink: 0 }}>{n.icon}</span>
                  {n.label}
                  {n.badge ? <span className="sb-badge">{n.badge > 9 ? "9+" : n.badge}</span> : null}
                </Link>
              ))}

              <div className="sb-div" />
              <div className="sb-sect">Projects</div>

              {sidebarProjects.map((p, i) => (
                <Link key={p.id} href={`/projects/${p.id}`} className="sb-proj">
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: DOT_COLORS[i % DOT_COLORS.length], flexShrink: 0 }} />
                  <span>{p.name}</span>
                </Link>
              ))}

              {can.createProject(role) && (
                <Link href="/projects/new" className="sb-item" style={{ marginTop: 4, color: 'var(--guardian)', fontWeight: 600 }}>
                  <span style={{ fontSize: 14, width: 16, textAlign: 'center' }}>+</span>
                  New project
                </Link>
              )}

              <div className="sb-div" />
              <div className="sb-sect">Settings</div>

              {[
                { href: "/archive",         label: "Archive"      },
                { href: "/settings/team",   label: "Team"         },
                { href: "/settings",        label: "Settings"     },
                { href: "/settings/billing",label: "Billing"      },
              ].map(n => (
                <Link key={n.href} href={n.href} className="sb-item">
                  <span style={{ width: 16, flexShrink: 0 }} />
                  {n.label}
                </Link>
              ))}
            </div>
          </aside>

          {/* ── Main content ── */}
          <main className="main">
            {children}
          </main>
        </div>
      </div>
    </>
  );
}
