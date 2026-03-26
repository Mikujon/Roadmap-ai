// src/app/api/projects/[id]/risks/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { getAuthContext } from "@/lib/auth";
import { z } from "zod";

const Schema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  probability: z.number().min(1).max(5).default(3),
  impact: z.number().min(1).max(5).default(3),
  mitigation: z.string().optional(),
});

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const ctx = await getAuthContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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

  const body = Schema.parse(await req.json());

  const risk = await db.risk.create({
    data: { ...body, projectId: id },
  });

  return NextResponse.json(risk);
}
