import { getAuthContext } from "@/lib/auth";
import { redirect } from "next/navigation";
import { can } from "@/lib/permissions";
import { Role } from "@prisma/client";
import Link from "next/link";

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
      href: "/settings/billing",
      icon: "💳",
      label: "Billing & Plans",
      sub: `Current plan: ${ctx.org.subscriptionStatus}`,
      show: can.viewBilling(role),
      badge: null,
    },
  ].filter(s => s.show);

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "40px 32px" }}>
      <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4, color: "#E2EBF6" }}>Settings</h2>
      <p style={{ fontSize: 13, color: "#64748B", marginBottom: 32 }}>Manage your organization settings.</p>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {SETTINGS.map(s => (
          <Link key={s.href} href={s.href} style={{ background: "#0D1929", border: "1px solid #1E3A5F", borderRadius: 12, padding: "18px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", textDecoration: "none" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <span style={{ fontSize: 20 }}>{s.icon}</span>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#E2EBF6" }}>{s.label}</div>
                <div style={{ fontSize: 12, color: "#64748B", marginTop: 2 }}>{s.sub}</div>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {s.badge && <span style={{ fontSize: 10, color: "#64748B", background: "#0A1220", border: "1px solid #1E3A5F", borderRadius: 4, padding: "2px 8px" }}>{s.badge}</span>}
              <span style={{ color: "#64748B", fontSize: 18 }}>→</span>
            </div>
          </Link>
        ))}
      </div>

      {/* Role info */}
      <div style={{ marginTop: 32, background: "#0D1929", border: "1px solid #1E3A5F", borderRadius: 12, padding: "18px 20px" }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#E2EBF6", marginBottom: 12, letterSpacing: "0.05em" }}>YOUR PERMISSIONS</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {[
            { label: "Create Projects",    allowed: can.createProject(role) },
            { label: "Edit Features",      allowed: can.editFeature(role) },
            { label: "Edit Financials",    allowed: can.editFinancials(role) },
            { label: "Manage Resources",   allowed: can.editResources(role) },
            { label: "Add Risks",          allowed: can.editRisks(role) },
            { label: "Invite Members",     allowed: can.inviteMembers(role) },
            { label: "View Billing",       allowed: can.viewBilling(role) },
            { label: "Share Projects",     allowed: can.shareProject(role) },
          ].map(p => (
            <div key={p.label} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
              <span style={{ color: p.allowed ? "#00C97A" : "#475569", fontSize: 14 }}>{p.allowed ? "✓" : "✕"}</span>
              <span style={{ color: p.allowed ? "#C8D8E8" : "#475569" }}>{p.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}