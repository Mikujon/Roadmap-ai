import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";
import { db } from "@/lib/prisma";

export async function GET() {
  const ctx = await getAuthContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ org: ctx.org });
}

export async function PATCH(req: Request) {
  const ctx = await getAuthContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (ctx.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const { name, timezone, currency, dateFormat, fiscalStart, brandColor, documentHeader, documentFooter } = body;

  try {
    const updated = await db.organisation.update({
      where: { id: ctx.org.id },
      data: {
        ...(name           != null ? { name }           : {}),
        ...(brandColor     != null ? { brandColor }     : {}),
        ...(documentHeader != null ? { documentHeader } : {}),
        ...(documentFooter != null ? { documentFooter } : {}),
      },
    });
    return NextResponse.json({ org: updated });
  } catch {
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}
