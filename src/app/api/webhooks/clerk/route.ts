import { Webhook } from "svix";
import { headers } from "next/headers";
import { WebhookEvent } from "@clerk/nextjs/server";
import { db } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { nanoid } from "nanoid";

export async function POST(req: Request) {
  const payload = await req.text();
  const hdrs = Object.fromEntries((await headers()).entries());
  const wh = new Webhook(process.env.CLERK_WEBHOOK_SECRET!);
  let evt: WebhookEvent;
  try {
    evt = wh.verify(payload, hdrs) as WebhookEvent;
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const { type, data } = evt;

  if (type === "user.created" || type === "user.updated") {
    await db.user.upsert({
      where: { clerkId: data.id },
      update: {
        email: data.email_addresses[0]?.email_address,
        name: `${data.first_name ?? ""} ${data.last_name ?? ""}`.trim(),
        avatarUrl: data.image_url,
      },
      create: {
        clerkId: data.id,
        email: data.email_addresses[0]?.email_address,
        name: `${data.first_name ?? ""} ${data.last_name ?? ""}`.trim(),
        avatarUrl: data.image_url,
      },
    });
  }

  if (type === "organization.created") {
    const apiKey = `rmai_${nanoid(32)}`;
    await db.organisation.upsert({
      where: { clerkOrgId: data.id },
      update: { name: data.name, slug: data.slug ?? data.id },
      create: { clerkOrgId: data.id, name: data.name, slug: data.slug ?? data.id, apiKey },
    });
  }

  if (type === "organizationMembership.created") {
    const [user, org] = await Promise.all([
      db.user.findUnique({ where: { clerkId: data.public_user_data.user_id } }),
      db.organisation.findUnique({ where: { clerkOrgId: data.organization.id } }),
    ]);
    if (user && org) {
      await db.member.upsert({
        where: { userId_organisationId: { userId: user.id, organisationId: org.id } },
        update: { role: data.role === "org:admin" ? "ADMIN" : "VIEWER" },
        create: {
          userId: user.id,
          organisationId: org.id,
          role: data.role === "org:admin" ? "ADMIN" : "VIEWER",
        },
      });
    }
  }

  return NextResponse.json({ ok: true });
}