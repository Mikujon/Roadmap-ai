import { NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { getAuthContext } from "@/lib/auth";
import { InviteSchema } from "@/lib/validations";
import { can } from "@/lib/permissions";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  const ctx = await getAuthContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!can.inviteMembers(ctx.role!))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = InviteSchema.parse(await req.json());
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const invite = await db.invitation.create({
    data: {
      email: body.email,
      role: body.role as any,
      expiresAt,
      organisationId: ctx.org.id,
    },
  });

  const link = `${process.env.NEXT_PUBLIC_APP_URL}/api/invitations/accept?token=${invite.token}`;

  await resend.emails.send({
    from: "RoadmapAI <onboarding@resend.dev>",
    to: body.email,
    subject: `You've been invited to ${ctx.org.name} on RoadmapAI`,
    html: `<p>Click the link to join: <a href="${link}">${link}</a></p><p>Expires in 7 days.</p>`,
  });

  return NextResponse.json({ ok: true, inviteId: invite.id });
}

export async function GET() {
  const ctx = await getAuthContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const invitations = await db.invitation.findMany({
    where: { organisationId: ctx.org.id, status: "PENDING" },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(invitations);
}