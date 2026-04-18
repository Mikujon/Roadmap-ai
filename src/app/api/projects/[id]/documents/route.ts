import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";
import { db } from "@/lib/prisma";
import { DocumentType } from "@prisma/client";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const ctx = await getAuthContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const project = await db.project.findFirst({
    where: { id, organisationId: ctx.org.id },
    select: { id: true },
  });
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const docs = await db.projectDocument.findMany({
    where:   { projectId: id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ documents: docs });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const ctx = await getAuthContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const project = await db.project.findFirst({
    where: { id, organisationId: ctx.org.id },
    select: { id: true },
  });
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json() as {
    type: DocumentType;
    title: string;
    content?: Record<string, unknown>;
  };

  const doc = await db.projectDocument.create({
    data: {
      projectId: id,
      type:      body.type,
      title:     body.title,
      content:   (body.content ?? {}) as object,
      status:    "DRAFT",
      version:   1,
      createdBy: ctx.user.name ?? ctx.user.email,
    },
  });

  return NextResponse.json({ document: doc }, { status: 201 });
}
