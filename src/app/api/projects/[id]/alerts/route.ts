import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";
import { db } from "@/lib/prisma";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await getAuthContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const project = await db.project.findFirst({
    where: { id, organisationId: ctx.org.id },
  });
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const { title, detail, level = "INFO", requiresValidation = false } = body;

  if (!title?.trim()) return NextResponse.json({ error: "Title required" }, { status: 400 });

  const alert = await db.alert.create({
    data: {
      organisationId: ctx.org.id,
      projectId: id,
      type: "escalation",
      title,
      detail: detail ?? "",
      level: level.toLowerCase(),
      requiresValidation,
    },
  });

  return NextResponse.json({ alertId: alert.id });
}
