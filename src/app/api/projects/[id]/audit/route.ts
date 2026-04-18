import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";
import { db } from "@/lib/prisma";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await getAuthContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const project = await db.project.findFirst({ where: { id, organisationId: ctx.org.id } });
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Derive audit log from alerts (created events) + synthetic project events
  const alerts = await db.alert.findMany({
    where: { projectId: id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const logs = [
    // Project creation
    {
      id: `proj-${id}`,
      action: "created",
      detail: `Project "${project.name}" created`,
      userName: "System",
      createdAt: project.createdAt,
    },
    // Alerts as audit events
    ...alerts.map(a => ({
      id: a.id,
      action: a.title.toLowerCase().includes("scope") ? "scope_change" :
              a.title.toLowerCase().includes("escalat") ? "escalation" :
              a.requiresValidation ? "validation_required" : "alert_created",
      detail: a.title + (a.detail ? ` — ${a.detail.slice(0, 100)}` : ""),
      userName: undefined,
      createdAt: a.createdAt,
    })),
    // Status changes
    project.updatedAt && project.updatedAt.getTime() !== project.createdAt.getTime() ? {
      id: `update-${id}`,
      action: "updated",
      detail: `Project status: ${project.status}`,
      userName: "User",
      createdAt: project.updatedAt,
    } : null,
  ].filter(Boolean).sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return NextResponse.json({ logs });
}
