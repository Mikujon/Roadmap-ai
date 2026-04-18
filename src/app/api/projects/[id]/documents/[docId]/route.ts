import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";
import { db } from "@/lib/prisma";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; docId: string }> }
) {
  const { id, docId } = await params;
  const ctx = await getAuthContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (ctx.role === "VIEWER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const project = await db.project.findFirst({
    where: { id, organisationId: ctx.org.id },
    select: { id: true },
  });
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db.projectDocument.deleteMany({ where: { id: docId, projectId: id } });
  return NextResponse.json({ ok: true });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; docId: string }> }
) {
  const { id, docId } = await params;
  const ctx = await getAuthContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (ctx.role === "VIEWER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const project = await db.project.findFirst({
    where: { id, organisationId: ctx.org.id },
    select: { id: true },
  });
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json() as { title?: string; status?: string; fileUrl?: string };

  const doc = await db.projectDocument.update({
    where: { id: docId },
    data: {
      ...(body.title   ? { title: body.title }     : {}),
      ...(body.status  ? { status: body.status }   : {}),
      ...(body.fileUrl ? { fileUrl: body.fileUrl } : {}),
    },
  });

  return NextResponse.json({ document: doc });
}
