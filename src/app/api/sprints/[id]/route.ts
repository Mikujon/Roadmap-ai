import { NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { getAuthContext } from "@/lib/auth";
import { z } from "zod";

const UpdateSprintSchema = z.object({
  status: z.enum(["UPCOMING", "ACTIVE"]).optional(),
  name: z.string().min(1).max(100).optional(),
  goal: z.string().max(500).optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const ctx = await getAuthContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = UpdateSprintSchema.parse(await req.json());

  // Validate: can only move to ACTIVE, not to DONE manually
  if (body.status) {
    const sprint = await db.sprint.findUnique({
      where: { id },
      include: { features: true },
    });
    if (!sprint) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Cannot manually set DONE — it's automatic
    if (body.status === "DONE") {
      return NextResponse.json({ error: "Sprint status DONE is set automatically when all features are completed" }, { status: 400 });
    }
  }

  const sprint = await db.sprint.update({
    where: { id },
    data: {
      ...(body.status && { status: body.status }),
      ...(body.name   && { name:   body.name }),
      ...(body.goal   !== undefined && { goal: body.goal }),
    },
  });

  return NextResponse.json(sprint);
}