import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";
import { db } from "@/lib/prisma";
import { nanoid } from "nanoid";

export async function GET() {
  const ctx = await getAuthContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const org = await db.organisation.findUnique({
    where: { id: ctx.org.id },
    select: { apiKey: true },
  });

  if (!org?.apiKey) {
    return NextResponse.json({ apiKey: null, masked: null });
  }

  const masked = `${org.apiKey.slice(0, 9)}...${org.apiKey.slice(-4)}`;
  return NextResponse.json({ apiKey: org.apiKey, masked });
}

export async function POST() {
  const ctx = await getAuthContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (ctx.role !== "ADMIN") return NextResponse.json({ error: "Admin only" }, { status: 403 });

  const newKey = `rmai_${nanoid(32)}`;
  await db.organisation.update({
    where: { id: ctx.org.id },
    data: { apiKey: newKey },
  });

  const masked = `${newKey.slice(0, 9)}...${newKey.slice(-4)}`;
  return NextResponse.json({ apiKey: newKey, masked });
}
