import { getAuthContext } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/prisma";
import { can } from "@/lib/permissions";
import { Role } from "@prisma/client";
import InviteForm from "./InviteForm";

export default async function TeamPage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/sign-in");

  const isAdmin = can.inviteMembers(ctx.role as Role);

  const members = await db.member.findMany({
    where: { organisationId: ctx.org.id },
    include: { user: true },
    orderBy: { joinedAt: "asc" },
  });

  const ROLE_COLOR: Record<string, string> = {
    ADMIN:   "#F97316",
    MANAGER: "#3B82F6",
    VIEWER:  "#64748B",
  };

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "40px 32px" }}>
      <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4, color: "#E2EBF6" }}>Team Members</h2>
      <p style={{ fontSize: 13, color: "#64748B", marginBottom: 32 }}>
        {ctx.org.name} · {members.length} member{members.length !== 1 ? "s" : ""}
        {!isAdmin && <span style={{ marginLeft: 8, color: "#475569" }}>· View only</span>}
      </p>

      {isAdmin && <InviteForm />}

      <div style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 8 }}>
        {members.map(m => (
          <div key={m.id} style={{ background: "#0D1929", border: "1px solid #1E3A5F", borderRadius: 10, padding: "14px 18px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg,#007A73,#3B82F6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: "#fff" }}>
                {(m.user.name ?? m.user.email)[0].toUpperCase()}
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#E2EBF6" }}>{m.user.name ?? "—"}</div>
                <div style={{ fontSize: 11, color: "#64748B" }}>{m.user.email}</div>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: ROLE_COLOR[m.role], background: ROLE_COLOR[m.role] + "18", padding: "3px 10px", borderRadius: 20 }}>
                {m.role}
              </span>
              {isAdmin && m.user.clerkId !== ctx.user.clerkId && (
                <span style={{ fontSize: 10, color: "#475569", cursor: "pointer" }}>✕</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}