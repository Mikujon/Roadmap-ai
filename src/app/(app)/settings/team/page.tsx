import { getAuthContext } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/prisma";
import InviteForm from "./InviteForm";

export default async function MembersPage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/sign-in");

  const members = await db.member.findMany({
   where: { organisationId: ctx.org.id },
    include: { user: true },
    orderBy: { joinedAt: "asc" },
  });

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "40px 32px" }}>
      <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4, color: "#E2EBF6" }}>Team Members</h2>
      <p style={{ fontSize: 13, color: "#64748B", marginBottom: 32 }}>
        Manage your organization members and invite new ones.
      </p>

      <InviteForm />

      <div style={{ marginTop: 32, display: "flex", flexDirection: "column", gap: 8 }}>
        {members.map((m) => (
          <div key={m.id} style={{ background: "#0D1929", border: "1px solid #1E3A5F", borderRadius: 10, padding: "14px 18px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#E2EBF6" }}>{m.user.name}</div>
              <div style={{ fontSize: 12, color: "#64748B" }}>{m.user.email}</div>
            </div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#007A73", background: "#0A2A2A", padding: "4px 10px", borderRadius: 20 }}>
              {m.role}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}