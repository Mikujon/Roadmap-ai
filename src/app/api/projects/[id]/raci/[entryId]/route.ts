import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";
import { db } from "@/lib/prisma";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string; entryId: string }> }) {
  const { entryId } = await params;
  const ctx = await getAuthContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    await (db as any).raciEntry.delete({ where: { id: entryId } });
  } catch {
    // ignore if table doesn't exist
  }
  return NextResponse.json({ ok: true });
}
