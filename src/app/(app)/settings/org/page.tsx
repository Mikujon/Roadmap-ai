export const dynamic = "force-dynamic";
import { getAuthContext } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import OrgSettingsClient from "./OrgSettingsClient";

export default async function OrgSettingsPage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/sign-in");
  if (ctx.role !== "ADMIN") redirect("/settings");

  return (
    <div style={{ maxWidth: 700, margin: "0 auto", padding: "32px 28px" }}>
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 11, color: "#5C5A52", marginBottom: 4 }}>
          <Link href="/settings" style={{ color: "#006D6B", textDecoration: "none", fontWeight: 600 }}>Settings</Link>
          {" / "}Organization
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "#18170F", letterSpacing: "-0.4px", marginBottom: 6 }}>Organization Settings</h1>
        <p style={{ fontSize: 13, color: "#5C5A52" }}>Manage your organization profile, branding, and preferences.</p>
      </div>
      <OrgSettingsClient
        orgName={ctx.org.name}
        orgId={ctx.org.id}
        brandColor={ctx.org.brandColor}
        documentHeader={ctx.org.documentHeader}
        documentFooter={ctx.org.documentFooter}
      />
    </div>
  );
}
