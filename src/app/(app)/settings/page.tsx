import { getAuthContext } from "@/lib/auth";
import { redirect } from "next/navigation";
import { can } from "@/lib/permissions";
import { Role } from "@prisma/client";
import Link from "next/link";
import { Breadcrumb } from "@/components/ui/breadcrumb";

const ChevronRight = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
    <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export default async function SettingsPage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/sign-in");

  const role = ctx.role as Role;

  const SETTINGS = [
    {
      href: "/settings/team",
      icon: "👥",
      label: "Team Members",
      sub: can.inviteMembers(role) ? "Invite and manage your team" : "View team members",
      show: true,
      badge: can.inviteMembers(role) ? null : "View only",
    },
    {
      href: "/settings/departments",
      icon: "🏢",
      label: "Departments",
      sub: "Create and manage departments for your organization",
      show: true,
      badge: null,
    },
    {
      href: "/settings/billing",
      icon: "💳",
      label: "Billing & Plans",
      sub: `Current plan: ${ctx.org.subscriptionStatus}`,
      show: can.viewBilling(role),
      badge: null,
    },
    {
      href: "/settings/integrations",
      icon: "🔗",
      label: "Integrations",
      sub: "Connect Slack, Jira, GitHub and more",
      show: true,
      badge: null,
    },
    {
      href: "/settings/org",
      icon: "🏛️",
      label: "Organization",
      sub: `${ctx.org.name} · Org-level settings and branding`,
      show: role === "ADMIN",
      badge: null,
    },
  ].filter(s => s.show);

  const permList = [
    { label: "Create Projects",  allowed: can.createProject(role) },
    { label: "Edit Features",    allowed: can.editFeature(role) },
    { label: "Edit Financials",  allowed: can.editFinancials(role) },
    { label: "Manage Resources", allowed: can.editResources(role) },
    { label: "Add Risks",        allowed: can.editRisks(role) },
    { label: "Invite Members",   allowed: can.inviteMembers(role) },
    { label: "View Billing",     allowed: can.viewBilling(role) },
    { label: "Share Projects",   allowed: can.shareProject(role) },
  ];

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "40px 32px" }}>
      <Breadcrumb items={[{ label: "Settings" }]} />
      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4, color: "#18170F" }}>Settings</h2>
      <p style={{ fontSize: 13, color: "#5C5A52", marginBottom: 32 }}>Manage your organization settings.</p>

      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 32 }}>
        {SETTINGS.map(s => (
          <Link
            key={s.href}
            href={s.href}
            className="settings-row"
            style={{
              background: "#fff", border: "1px solid #E5E2D9", borderRadius: 10,
              padding: "16px 20px", display: "flex", alignItems: "center",
              justifyContent: "space-between", textDecoration: "none",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <span style={{ fontSize: 18 }}>{s.icon}</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#18170F" }}>{s.label}</div>
                <div style={{ fontSize: 12, color: "#5C5A52", marginTop: 2 }}>{s.sub}</div>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {s.badge && (
                <span style={{ fontSize: 10, color: "#5C5A52", background: "#F4F2EC", border: "1px solid #E5E2D9", borderRadius: 4, padding: "2px 8px" }}>
                  {s.badge}
                </span>
              )}
              <span style={{ color: "#9E9C93" }}><ChevronRight /></span>
            </div>
          </Link>
        ))}
      </div>

      {/* Permissions panel */}
      <div style={{ background: "#fff", border: "1px solid #E5E2D9", borderRadius: 10, padding: "18px 20px" }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: "#9E9C93", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 14 }}>
          Your Permissions · {role}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {permList.map(p => (
            <div key={p.label} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
              <span style={{ color: p.allowed ? "#059669" : "#CCC9BF", fontWeight: 700 }}>
                {p.allowed ? "✓" : "✕"}
              </span>
              <span style={{ color: p.allowed ? "#18170F" : "#9E9C93" }}>{p.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
