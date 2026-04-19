import { NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { getAuthContext } from "@/lib/auth";
import { z } from "zod";

const CreateDeptSchema = z.object({
  name:        z.string().min(1).max(50),
  description: z.string().max(200).optional(),
  color:       z.string().regex(/^#[0-9A-Fa-f]{6}$/).default("#006D6B"),
});

export async function GET() {
  const ctx = await getAuthContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const departments = await db.department.findMany({
    where: { organisationId: ctx.org.id },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(departments);
}

export async function POST(req: Request) {
  const ctx = await getAuthContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = CreateDeptSchema.parse(await req.json());

  // Check for duplicates
  const existing = await db.department.findFirst({
    where: { organisationId: ctx.org.id, name: { equals: body.name, mode: "insensitive" } },
  });
  if (existing) return NextResponse.json({ error: "Department already exists" }, { status: 409 });

  const dept = await db.department.create({
    data: {
      name:           body.name,
      color:          body.color,
      organisationId: ctx.org.id,
    },
  });
  return NextResponse.json(dept);
}