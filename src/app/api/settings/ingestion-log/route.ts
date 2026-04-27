import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";
import { db } from "@/lib/prisma";

export async function GET() {
  const ctx = await getAuthContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const messages = await db.ambientMessage.findMany({
    where: { orgId: ctx.org.id },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: {
      id: true,
      platform: true,
      type: true,
      sender: true,
      summary: true,
      confidence: true,
      applied: true,
      createdAt: true,
      projectId: true,
      projectIdRelation: { select: { name: true } },
    },
  });

  return NextResponse.json({ messages });
}
