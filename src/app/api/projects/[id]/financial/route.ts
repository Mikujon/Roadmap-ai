// src/app/api/projects/[id]/financial/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { getAuthContext } from "@/lib/auth";
import { z } from "zod";

const Schema = z.object({
  budgetTotal: z.number().optional(),
  costActual: z.number().optional(),
  revenueExpected: z.number().optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const ctx = await getAuthContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = Schema.parse(await req.json());

  const project = await db.project.update({
    where: { id, organisationId: ctx.org.id },
    data: {
      ...(body.budgetTotal !== undefined && { budgetTotal: body.budgetTotal }),
      ...(body.costActual !== undefined && { costActual: body.costActual }),
      ...(body.revenueExpected !== undefined && {
        revenueExpected: body.revenueExpected,
      }),
    },
  });

  return NextResponse.json(project);
}
