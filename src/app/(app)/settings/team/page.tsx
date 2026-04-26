export const dynamic = "force-dynamic";
import { getAuthContext } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/prisma";
import TeamPageClient from "./TeamPageClient";

export default async function Page() {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/sign-in");

  const [members, invitations] = await Promise.all([
    db.member.findMany({
      where: { organisationId: ctx.org.id },
      include: { user: { select: { id: true, name: true, email: true, avatarUrl: true, createdAt: true } } },
      orderBy: { joinedAt: "asc" },
    }),
    db.invitation.findMany({
      where: { organisationId: ctx.org.id, status: "PENDING" },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <TeamPageClient
      orgName={ctx.org.name}
      members={members.map(m => ({
        id:       m.id,
        userId:   m.user.id,
        name:     m.user.name ?? m.user.email,
        email:    m.user.email,
        role:     m.role,
        joinedAt: m.joinedAt.toISOString(),
        isMe:     m.user.id === ctx.user.id,
      }))}
      invitations={invitations.map(i => ({
        id:        i.id,
        email:     i.email,
        role:      i.role,
        expiresAt: i.expiresAt.toISOString(),
        createdAt: i.createdAt.toISOString(),
      }))}
    />
  );
}
