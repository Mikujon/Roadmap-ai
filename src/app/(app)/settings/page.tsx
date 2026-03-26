import { getAuthContext } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function SettingsPage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/sign-in");

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "40px 32px" }}>
      <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4, color: "#E2EBF6" }}>Settings</h2>
      <p style={{ fontSize: 13, color: "#64748B", marginBottom: 32 }}>
        Manage your organization settings.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <Link href="/settings/team" style={{ background: "#0D1929", border: "1px solid #1E3A5F", borderRadius: 12, padding: "18px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", textDecoration: "none" }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#E2EBF6" }}>Team Members</div>
            <div style={{ fontSize: 12, color: "#64748B", marginTop: 2 }}>Invite and manage your team</div>
          </div>
          <span style={{ color: "#64748B", fontSize: 18 }}>→</span>
        </Link>

        <Link href="/settings/billing" style={{ background: "#0D1929", border: "1px solid #1E3A5F", borderRadius: 12, padding: "18px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", textDecoration: "none" }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#E2EBF6" }}>Billing & Plans</div>
            <div style={{ fontSize: 12, color: "#64748B", marginTop: 2 }}>
              Current plan: <strong style={{ color: "#007A73" }}>{ctx.org.subscriptionStatus}</strong>
            </div>
          </div>
          <span style={{ color: "#64748B", fontSize: 18 }}>→</span>
        </Link>
      </div>
    </div>
  );
}