import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
// remove this duplicate
// import { NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { getAuthContext } from "@/lib/auth";
import { UpdateFeatureSchema } from "@/lib/validations";
import { triggerGuardian } from "@/lib/guardian-trigger";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const ctx = await getAuthContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // ── Org isolation check ──────────────────────────────────────────────────
  const existing = await db.feature.findFirst({
    where: { id },
    include: { sprint: { include: { project: true } } },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (existing.sprint.project.organisationId !== ctx.org.id)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  // ────────────────────────────────────────────────────────────────────────

  const body = UpdateFeatureSchema.parse(await req.json());

  const feature = await db.feature.update({
    where: { id },
    data: {
      ...(body.status        && { status:       body.status as any }),
      ...(body.priority      && { priority:     body.priority as any }),
      ...(body.title         && { title:        body.title }),
      ...(body.module        !== undefined && { module:       body.module }),
      ...(body.notes         !== undefined && { notes:        body.notes }),
      ...(body.assignedToId  !== undefined && { assignedToId: body.assignedToId }),
      ...(body.estimatedHours !== undefined && { estimatedHours: body.estimatedHours }),
      ...(body.actualHours    !== undefined && { actualHours:    body.actualHours }),
    },
    include: {
      sprint: {
        include: {
          features: true,
          project: { include: { sprints: { include: { features: true } } } },
        },
      },
    },
  });

  // Auto-update sprint status
  const sprint = feature.sprint;
  const allFeatures = sprint.features.map(f =>
    f.id === id ? { ...f, status: body.status ?? f.status } : f
  );
  const allDone   = allFeatures.every(f => f.status === "DONE");
  const anyActive = allFeatures.some(f => f.status === "IN_PROGRESS");

  let newSprintStatus = sprint.status;
  if (allDone) newSprintStatus = "DONE";
  else if (anyActive && sprint.status === "UPCOMING") newSprintStatus = "ACTIVE";

  if (newSprintStatus !== sprint.status) {
    await db.sprint.update({ where: { id: sprint.id }, data: { status: newSprintStatus } });
  }

  // Auto-update project status
  const project = sprint.project;
  const allSprints = project.sprints.map(s =>
    s.id === sprint.id ? { ...s, status: newSprintStatus } : s
  );
  const allSprintsDone = allSprints.every(s => s.status === "DONE");

  if (allSprintsDone) {
    await db.project.update({ where: { id: project.id }, data: { status: "COMPLETED" } });
  } else if (project.status === "COMPLETED") {
    await db.project.update({ where: { id: project.id }, data: { status: "ACTIVE" } });
  }
  revalidatePath("/dashboard");
  revalidatePath("/portfolio");
  revalidatePath("/cost");
  triggerGuardian(project.id);
  await db.guardianReport.deleteMany({ where: { projectId: project.id } });
  return NextResponse.json({ ok: true });
}
  