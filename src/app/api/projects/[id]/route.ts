import { NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { getAuthContext } from "@/lib/auth";
import { can } from "@/lib/permissions";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const ctx = await getAuthContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const project = await db.project.findFirst({
    where: { id: params.id, organisationId: ctx.org.id },
    include: {
      phases: { orderBy: { order: "asc" } },
      sprints: {
        orderBy: { order: "asc" },
        include: { features: { orderBy: { order: "asc" } }, phase: true },
      },
    },
  });
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(project);
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const ctx = await getAuthContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!can.editProject(ctx.role!))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const project = await db.project.update({
    where: { id: params.id, organisationId: ctx.org.id },
    data: {
      name: body.name,
      description: body.description,
      status: body.status,
    },
  });
  return NextResponse.json(project);
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const ctx = await getAuthContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!can.deleteProject(ctx.role!))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await db.project.delete({
    where: { id: params.id, organisationId: ctx.org.id },
  });
  return NextResponse.json({ ok: true });
}