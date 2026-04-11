import { NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { getAuthContext } from "@/lib/auth";
import { can } from "@/lib/permissions";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const ctx = await getAuthContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const snapshots = await db.projectSnapshot.findMany({
    where:   { projectId: id, project: { organisationId: ctx.org.id } },
    orderBy: { createdAt: "desc" },
    select:  { id: true, version: true, name: true, reason: true, createdBy: true, createdAt: true },
  });

  return NextResponse.json(snapshots);
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const ctx = await getAuthContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!can.editProject(ctx.role!))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => ({}));

  const project = await db.project.findFirst({
    where: { id, organisationId: ctx.org.id },
    include: {
      phases:      { orderBy: { order: "asc" } },
      sprints:     { orderBy: { order: "asc" }, include: { features: { orderBy: { order: "asc" } } } },
      assignments: { include: { resource: true } },
      risks:       true,
    },
  });
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const lastSnapshot = await db.projectSnapshot.findFirst({
    where:   { projectId: id },
    orderBy: { version: "desc" },
    select:  { version: true },
  });
  const version = (lastSnapshot?.version ?? 0) + 1;

  const snapshot = await db.projectSnapshot.create({
    data: {
      projectId: id,
      version,
      name:      `v${version} — ${new Date().toLocaleDateString("en-GB")}`,
      reason:    body.reason ?? null,
      createdBy: ctx.user?.name ?? ctx.user?.email ?? "Unknown",
      data: {
        name:        project.name,
        description: project.description,
        startDate:   project.startDate,
        endDate:     project.endDate,
        budgetTotal: project.budgetTotal,
        phases:      project.phases,
        sprints:     project.sprints,
        assignments: project.assignments,
        risks:       project.risks,
        snapshotAt:  new Date().toISOString(),
      },
    },
  });

  return NextResponse.json(snapshot);
}