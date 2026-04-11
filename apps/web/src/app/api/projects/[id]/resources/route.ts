// src/app/api/projects/[id]/resources/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { getAuthContext } from "@/lib/auth";
import { z } from "zod";

const Schema = z.object({
  resourceId: z.string(),
  estimatedHours: z.number().min(0).default(0),
  actualHours: z.number().min(0).default(0),
});

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const ctx = await getAuthContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const assignments = await db.resourceAssignment.findMany({
    where: { projectId: id },
    include: { resource: true },
    orderBy: { resource: { name: "asc" } },
  });

  return NextResponse.json(assignments);
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const ctx = await getAuthContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = Schema.parse(await req.json());

  const assignment = await db.resourceAssignment.upsert({
    where: { projectId_resourceId: { projectId: id, resourceId: body.resourceId } },
    update: { estimatedHours: body.estimatedHours, actualHours: body.actualHours },
    create: {
      projectId: id,
      resourceId: body.resourceId,
      estimatedHours: body.estimatedHours,
      actualHours: body.actualHours,
    },
    include: { resource: true },
  });

  return NextResponse.json(assignment);
}
