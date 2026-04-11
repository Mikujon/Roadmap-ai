import { NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { getAuthContext } from "@/lib/auth";
import { nanoid } from "nanoid";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const ctx = await getAuthContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const project = await db.project.update({
    where: { id, organisationId: ctx.org.id },
    data: { shareToken: nanoid(16), shareEnabled: true },
    select: { shareToken: true },
  });

  const url = `${process.env.NEXT_PUBLIC_APP_URL}/share/${project.shareToken}`;
  return NextResponse.json({ url, token: project.shareToken });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const ctx = await getAuthContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await db.project.update({
    where: { id, organisationId: ctx.org.id },
    data: { shareEnabled: false, shareToken: null },
  });
  return NextResponse.json({ ok: true });
}