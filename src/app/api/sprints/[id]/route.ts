import { NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { getAuthContext } from "@/lib/auth";
import { z } from "zod";
import { emit } from "@roadmap/events";
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

  const existing = await db.sprint.findFirst({
    where: { id },
    include: { project: true },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (existing.project.organisationId !== ctx.org.id)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

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

  // Emit domain event if sprint was started
  if (body.status === "ACTIVE" && existing.status !== "ACTIVE") {
    await emit(db as any, {
      type:          "sprint.started",
      aggregateType: "sprint",
      aggregateId:   id,
      organisationId: ctx.org.id,
      projectId:     existing.projectId,
      actorId:       ctx.user.id,
      actorName:     ctx.user.name ?? ctx.user.email,
      payload: {
        sprintId:   id,
        sprintName: sprint.name,
        sprintNum:  sprint.num,
        startDate:  sprint.startDate?.toISOString() ?? new Date().toISOString(),
        endDate:    sprint.endDate?.toISOString() ?? null,
      },
    });
  } else {
    // Non-event mutations still trigger Guardian via queue
    triggerGuardian(existing.projectId, existing.project.name);
  }

  return NextResponse.json(sprint);
}
