import { NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { getAuthContext } from "@/lib/auth";
import { z } from "zod";
import { triggerGuardian } from "@/lib/guardian-trigger";

const UpdateSprintSchema = z.object({
  status: z.enum(["UPCOMING", "ACTIVE"]).optional(),
  name:   z.string().min(1).max(100).optional(),
  goal:   z.string().max(500).optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const ctx = await getAuthContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // ── Org isolation check ──────────────────────────────────────────────────
  const existing = await db.sprint.findFirst({
    where: { id },
    include: { project: true },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (existing.project.organisationId !== ctx.org.id)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  // ────────────────────────────────────────────────────────────────────────

  const body = UpdateSprintSchema.parse(await req.json());

  if ((body.status as string) === "DONE")
    return NextResponse.json({ error: "Sprint status DONE is set automatically" }, { status: 400 });

  const sprint = await db.sprint.update({
    where: { id },
    data: {
      ...(body.status !== undefined && { status: body.status }),
      ...(body.name   !== undefined && { name:   body.name }),
      ...(body.goal   !== undefined && { goal:   body.goal }),
    },
  });

  await db.guardianReport.deleteMany({ where: { projectId: existing.projectId } });
  triggerGuardian(existing.projectId);
  return NextResponse.json(sprint);
}
