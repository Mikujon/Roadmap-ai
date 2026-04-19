import { NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { getAuthContext } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { triggerAgents } from "@/lib/agent-triggers";
import { revalidatePath } from "next/cache";
import { logActivity } from "@/lib/activity";
import { generateClosureReport } from "@/lib/closure-report";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const ctx = await getAuthContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const project = await db.project.findFirst({
    where: { id, organisationId: ctx.org.id },
    include: {
      phases: { orderBy: { order: "asc" } },
      sprints: {
        orderBy: { order: "asc" },
        include: { features: { orderBy: { order: "asc" } }, phase: true },
      },
      statusLogs: { orderBy: { createdAt: "desc" }, take: 10 },
    },
  });
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(project);
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const ctx = await getAuthContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!can.editProject(ctx.role!))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();

  const existing = await db.project.findFirst({
    where: { id, organisationId: ctx.org.id },
    select: { status: true },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const project = await db.project.update({
    where: { id, organisationId: ctx.org.id },
    data: {
      ...(body.name            !== undefined && { name:            body.name }),
      ...(body.description     !== undefined && { description:     body.description }),
      ...(body.status          !== undefined && { status:          body.status }),
      ...(body.budgetTotal     !== undefined && { budgetTotal:     body.budgetTotal }),
      ...(body.revenueExpected !== undefined && { revenueExpected: body.revenueExpected }),
      ...(body.requestedById   !== undefined && { requestedById:   body.requestedById }),
      ...(body.startDate       !== undefined && { startDate:       new Date(body.startDate) }),
      ...(body.endDate         !== undefined && { endDate:         new Date(body.endDate) }),
    },
  });
  
if (body.status !== undefined) {
    revalidatePath("/dashboard");
    revalidatePath("/portfolio");
    revalidatePath("/cost");
    revalidatePath("/archive");
    // Auto-snapshot on significant changes
if (body.endDate !== undefined || body.budgetTotal !== undefined) {
  fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/projects/${id}/snapshots`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reason: `Auto-snapshot: ${body.endDate ? "deadline changed" : "budget changed"}` }),
  }).catch((err) => console.error("[auto-snapshot] failed:", err));
}
  }
  // Log status change
  if (body.status && body.status !== existing.status) {
    const userName = ctx.user?.name ?? ctx.user?.email ?? "Unknown";

    await db.projectStatusLog.create({
      data: {
        projectId: id,
        status:    body.status,
        note:      body.statusNote ?? null,
        changedBy: userName,
      },
    });

    await logActivity({
      organisationId: ctx.org.id,
      projectId: id,
      userId: ctx.user?.id,
      userName: ctx.user?.name ?? "Unknown",
      action: "project.status_changed",
      entity: "project",
      entityId: id,
      entityName: project.name,
      meta: { from: existing.status, to: body.status, note: body.statusNote },
    });

    if (body.status === "CLOSED") {
      generateClosureReport(id, ctx.org.id).catch((err) =>
        console.error("[closure-report] failed for project", id, err)
      );
    }
  }
  // Fire agents for budget/date changes — health & EVM need recomputing
  if (body.budgetTotal !== undefined || body.endDate !== undefined) {
    triggerAgents("budget_updated", id, ctx.org.id);
  }

  return NextResponse.json(project);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const ctx = await getAuthContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!can.deleteProject(ctx.role!))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await db.project.delete({ where: { id, organisationId: ctx.org.id } });
  return NextResponse.json({ ok: true });
}