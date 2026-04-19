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
      email:          body.email,
      role:           body.role as any,
      expiresAt,
      organisationId: ctx.org.id,
    },
  });

  const link       = `${process.env.NEXT_PUBLIC_APP_URL}/api/invitations/accept?token=${invite.token}`;
  const inviterName = ctx.user?.name ?? ctx.user?.email ?? "Someone";

  await resend.emails.send({
    from:    "RoadmapAI <noreply@roadmapai.com>",
    to:      body.email,
    subject: `${inviterName} invited you to join ${ctx.org.name} on RoadmapAI`,
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;background:#F0F2F5;font-family:'Segoe UI',Arial,sans-serif;">
  <div style="max-width:520px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
    <!-- Header -->
    <div style="background:linear-gradient(135deg,#006D6B,#0891B2);padding:32px 40px;text-align:center;">
      <div style="width:48px;height:48px;background:rgba(255,255,255,0.2);border-radius:12px;display:inline-flex;align-items:center;justify-content:center;font-weight:800;font-size:18px;color:#fff;margin-bottom:12px;">RM</div>
      <h1 style="color:#fff;font-size:22px;font-weight:800;margin:0;letter-spacing:-0.5px;">You're invited!</h1>
    </div>
    <!-- Body -->
    <div style="padding:32px 40px;">
      <p style="font-size:15px;color:#0F172A;margin:0 0 16px;line-height:1.6;">
        <strong>${inviterName}</strong> has invited you to join <strong>${ctx.org.name}</strong> on RoadmapAI — the AI-powered PMO platform.
      </p>
      <p style="font-size:14px;color:#64748B;margin:0 0 28px;line-height:1.6;">
        You've been invited as <strong style="color:#006D6B;">${body.role}</strong>. Click below to accept your invitation and get started.
      </p>
      <div style="text-align:center;margin-bottom:28px;">
        <a href="${link}" style="display:inline-block;background:#006D6B;color:#fff;text-decoration:none;padding:14px 32px;border-radius:10px;font-weight:700;font-size:15px;letter-spacing:-0.2px;">
          Accept Invitation →
        </a>
      </div>
      <div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:10px;padding:14px 16px;margin-bottom:24px;">
        <p style="font-size:12px;color:#94A3B8;margin:0 0 6px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">Or copy this link</p>
        <p style="font-size:12px;color:#475569;margin:0;word-break:break-all;">${link}</p>
      </div>
      <p style="font-size:12px;color:#94A3B8;margin:0;text-align:center;">
        This invitation expires in 7 days. If you didn't expect this, you can safely ignore this email.
      </p>
    </div>
    <!-- Footer -->
    <div style="padding:16px 40px;background:#F8FAFC;border-top:1px solid #E2E8F0;text-align:center;">
      <p style="font-size:12px;color:#94A3B8;margin:0;">RoadmapAI · AI-Powered PMO Platform</p>
    </div>
  </div>
</body>
</html>`,
  });

  return NextResponse.json({ ok: true, inviteId: invite.id });
}

export async function GET() {
  const ctx = await getAuthContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const invitations = await db.invitation.findMany({
    where:   { organisationId: ctx.org.id, status: "PENDING" },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(invitations);
}
