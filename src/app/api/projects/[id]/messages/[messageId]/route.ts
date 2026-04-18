import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";
import { db } from "@/lib/prisma";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; messageId: string }> }
) {
  const { id, messageId } = await params;
  const ctx = await getAuthContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const project = await db.project.findFirst({
    where: { id, organisationId: ctx.org.id },
    select: { id: true },
  });
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const existing = await db.projectMessage.findFirst({
    where: { id: messageId, projectId: id },
  });
  if (!existing) return NextResponse.json({ error: "Message not found" }, { status: 404 });
  if (existing.userId !== ctx.user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json() as { content: string };
  const content = (body.content ?? "").trim();
  if (!content) return NextResponse.json({ error: "Content required" }, { status: 400 });

  const updated = await db.projectMessage.update({
    where: { id: messageId },
    data:  { content, editedAt: new Date() },
  });

  return NextResponse.json({ message: { id: updated.id, content: updated.content, editedAt: updated.editedAt?.toISOString() } });
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string; messageId: string }> }
) {
  const { id, messageId } = await params;
  const ctx = await getAuthContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const project = await db.project.findFirst({
    where: { id, organisationId: ctx.org.id },
    select: { id: true },
  });
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const existing = await db.projectMessage.findFirst({
    where: { id: messageId, projectId: id },
  });
  if (!existing) return NextResponse.json({ error: "Message not found" }, { status: 404 });
  if (existing.userId !== ctx.user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await db.projectMessage.delete({ where: { id: messageId } });

  return NextResponse.json({ ok: true });
}
