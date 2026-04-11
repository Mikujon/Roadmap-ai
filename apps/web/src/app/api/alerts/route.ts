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

  const { alertId } = await req.json();
  await db.alert.update({
    where: { id: alertId },
    data:  { read: true },
  });
  return NextResponse.json({ ok: true });
}