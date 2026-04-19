import { NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { getAuthContext } from "@/lib/auth";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const ctx = await getAuthContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const dept = await db.department.findFirst({
    where: { id, organisationId: ctx.org.id },
  });
  if (!dept) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db.department.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}