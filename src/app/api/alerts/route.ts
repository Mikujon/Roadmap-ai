import { NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { getAuthContext } from "@/lib/auth";
import { runHealthCheck } from "@/lib/alert-engine";

export async function GET() {
  const ctx = await getAuthContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const alerts = await db.alert.findMany({
    where: {
      organisationId: ctx.org.id,
      project: { status: { notIn: ["CLOSED", "ARCHIVED"] } },
    },
    include: { project: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" },
    take:    50,
  });

  return NextResponse.json(alerts);
}

export async function POST() {
  const ctx = await getAuthContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const result = await runHealthCheck(ctx.org.id);
  return NextResponse.json(result);
}

export async function PATCH(req: Request) {
  const ctx = await getAuthContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  if (body.markAllRead) {
    await db.alert.updateMany({
      where: { organisationId: ctx.org.id, read: false },
      data:  { read: true },
    });
  } else if (body.alertId) {
    await db.alert.update({
      where: { id: body.alertId },
      data:  { read: true },
    });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const ctx = await getAuthContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  if (body.clearAll) {
    await db.alert.deleteMany({ where: { organisationId: ctx.org.id } });
  } else if (body.alertId) {
    await db.alert.deleteMany({
      where: { id: body.alertId, organisationId: ctx.org.id },
    });
  }

  return NextResponse.json({ ok: true });
}