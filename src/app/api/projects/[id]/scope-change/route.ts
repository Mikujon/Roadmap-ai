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
  const { title, reason, impact, newEndDate } = body;

  // Create an alert for the scope change request
  const alert = await db.alert.create({
    data: {
      organisationId: ctx.org.id,
      projectId: id,
      type: "scope_change",
      title: `Scope Change Request: ${title}`,
      detail: `Reason: ${reason}\n\nImpact: ${impact ?? "Not specified"}${newEndDate ? `\n\nProposed new end date: ${newEndDate}` : ""}`,
      level: "warning",
      requiresValidation: true,
    },
  });

  return NextResponse.json({ alertId: alert.id });
}
