import { UserButton, OrganizationSwitcher } from "@clerk/nextjs";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth";

const NAV = [
  { href: "/dashboard",        label: "Dashboard",  icon: "◉" },
  { href: "/projects/new",     label: "New Project", icon: "✦" },
  { href: "/settings/team",    label: "Team",        icon: "👥" },
  { href: "/settings/billing", label: "Billing",     icon: "💳" },
  { href: "/settings",         label: "Settings",    icon: "⚙️" },
];

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/sign-in");

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#080E1A", color: "#E2EBF6", fontFamily: "'DM Sans', sans-serif" }}>
      {/* Sidebar */}
      <aside style={{ width: 220, background: "#0A1220", borderRight: "1px solid #1E3A5F", display: "flex", flexDirection: "column", padding: "20px 12px", gap: 8, position: "sticky", top: 0, height: "100vh" }}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "0 8px 16px", borderBottom: "1px solid #1E3A5F" }}>
          <div style={{ width: 32, height: 32, background: "linear-gradient(135deg,#007A73,#3B82F6)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 13, color: "#fff" }}>RM</div>
          <span style={{ fontWeight: 700, fontSize: 14 }}>RoadmapAI</span>
        </div>

        {/* Org switcher */}
        <div style={{ padding: "8px 0" }}>
          <OrganizationSwitcher
            hidePersonal
            afterSelectOrganizationUrl="/dashboard"
            appearance={{
              elements: {
                rootBox: { width: "100%" },
                organizationSwitcherTrigger: {
                  width: "100%",
                  borderRadius: 8,
                  background: "#0F1827",
                  border: "1px solid #1E3A5F",
                  color: "#E2EBF6",
                  padding: "8px 10px",
                },
              },
            }}
          />
        </div>

        {/* Nav links */}
        <nav style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1, marginTop: 8 }}>
          {NAV.map(n => (
            <Link
              key={n.href + n.label}
              href={n.href}
              style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderRadius: 8, color: "#94A3B8", textDecoration: "none", fontSize: 13 }}
            >
              <span style={{ fontSize: 14 }}>{n.icon}</span> {n.label}
            </Link>
          ))}
        </nav>

        {/* User */}
        <div style={{ borderTop: "1px solid #1E3A5F", paddingTop: 16, display: "flex", alignItems: "center", gap: 10 }}>
          <UserButton />
          <div>
            <div style={{ fontSize: 12, fontWeight: 600 }}>{ctx.user.name}</div>
            <div style={{ fontSize: 10, color: "#64748B", textTransform: "capitalize" }}>
              {ctx.role?.toLowerCase()}
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main style={{ flex: 1, overflowY: "auto" }}>{children}</main>
    </div>
  );
}