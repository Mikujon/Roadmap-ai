import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";
import { db } from "@/lib/prisma";

export async function POST() {
  const ctx = await getAuthContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { count } = await db.alert.updateMany({
    where: { organisationId: ctx.org.id, read: false },
    data:  { read: true },
  });

  return NextResponse.json({ ok: true, count });
}
