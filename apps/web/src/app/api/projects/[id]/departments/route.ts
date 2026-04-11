import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";
import { db } from "@/lib/prisma";
import { can } from "@/lib/permissions";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await getAuthContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!can.editProject(ctx.role!)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { departmentId } = await req.json();
  await db.projectDepartment.create({ data: { projectId: id, departmentId } });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await getAuthContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!can.editProject(ctx.role!)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { departmentId } = await req.json();
  await db.projectDepartment.deleteMany({ where: { projectId: id, departmentId } });
  return NextResponse.json({ ok: true });
}
