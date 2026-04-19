// src/app/api/projects/[id]/risks/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { getAuthContext } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { z } from "zod";
import { triggerAgents } from "@/lib/agent-triggers";

const Schema = z.object({
  title:       z.string().min(1).max(200),
  description: z.string().optional(),
  probability: z.number().int().min(1).max(5).default(3),
  impact:      z.number().int().min(1).max(5).default(3),
  mitigation:  z.string().optional(),
  ownerId:     z.string().optional(),
  ownerName:   z.string().optional(),
  category:    z.string().optional(),
});

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const ctx = await getAuthContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Org isolation: verify the project belongs to the authenticated org
  const project = await db.project.findFirst({
    where: { id, organisationId: ctx.org.id },
    select: { id: true },
  });
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const risks = await db.risk.findMany({
    where: { projectId: id },
    orderBy: [{ probability: "desc" }, { impact: "desc" }],
  });

  return NextResponse.json(risks);
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const ctx = await getAuthContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!can.editRisks(ctx.role!))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Org isolation: verify the project belongs to the authenticated org
  const project = await db.project.findFirst({
    where: { id, organisationId: ctx.org.id },
    select: { id: true },
  });
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = Schema.parse(await req.json());

  const risk = await db.risk.create({
    data: { ...body, projectId: id },
  });

  // Fire agents in background — don't block the response
  triggerAgents("risk_added", id, ctx.org.id);

  return NextResponse.json(risk);
}

