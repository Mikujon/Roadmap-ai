import { NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { getAuthContext } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { Resend } from "resend";
import { nanoid } from "nanoid";
import { buildInviteEmail } from "../route";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await getAuthContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!can.inviteMembers(ctx.role!))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;

  await db.invitation.deleteMany({
    where: { id, organisationId: ctx.org.id },
  });

  return NextResponse.json({ ok: true });
}

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await getAuthContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!can.inviteMembers(ctx.role!))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;

  const inv = await db.invitation.findFirst({
    where:   { id, organisationId: ctx.org.id },
    include: { organisation: true },
  });
  if (!inv) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const newToken    = nanoid(32);
  const newExpiry   = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await db.invitation.update({
    where: { id },
    data:  { token: newToken, expiresAt: newExpiry, status: "PENDING" },
  });

  const link        = `${process.env.NEXT_PUBLIC_APP_URL}/invite/${newToken}`;
  const inviterName = ctx.user?.name ?? ctx.user?.email ?? "Someone";
  const { subject, html } = await buildInviteEmail({
    inviterName,
    orgName: inv.organisation.name,
    role:    inv.role,
    link,
  });

  await resend.emails.send({ from: "RoadmapAI <onboarding@resend.dev>", to: inv.email, subject, html });

  return NextResponse.json({ ok: true });
}
