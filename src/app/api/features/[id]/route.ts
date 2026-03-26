import { NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { getAuthContext } from "@/lib/auth";
import { UpdateFeatureSchema } from "@/lib/validations";

async function recalculateHealth(projectId: string) {
  const project = await db.project.findUnique({
    where: { id: projectId },
    include: {
      sprints: { include: { features: true } },
      risks: true,
      assignments: { include: { resource: true } },
    },
  });
  if (!project) return;

  const allFeatures = project.sprints.flatMap(s => s.features);
  const total = allFeatures.length;
  const done  = allFeatures.filter(f => f.status === "DONE").length;

  const now   = Date.now();
  const start = new Date(project.startDate).getTime();
  const end   = new Date(project.endDate).getTime();
  const plannedProgress = end > start ? Math.min((now - start) / (end - start), 1) : 0;
  const actualProgress  = total > 0 ? done / total : 0;
  const scheduleScore   = plannedProgress > 0
    ? Math.min(actualProgress / plannedProgress, 1) * 100
    : actualProgress * 100;

  const budget = project.budgetTotal;
  let costScore = 100;
  if (budget > 0) {
    const ratio = project.costActual / budget;
    costScore = ratio <= 1 ? 100 : Math.max(0, 100 - (ratio - 1) * 200);
  }

  let resourceScore = 100;
  if (project.assignments.length > 0) {
    const utilizations = project.assignments.map(a =>
      a.resource.capacityHours > 0 ? a.actualHours / a.resource.capacityHours : 0
    );
    const avgUtil = utilizations.reduce((a, b) => a + b, 0) / utilizations.length;
    resourceScore = avgUtil <= 0.8 ? 100 : avgUtil <= 1.0 ? 80 : avgUtil <= 1.2 ? 50 : 20;
  }

  let riskScore = 100;
  const openRisks = project.risks.filter(r => r.status === "OPEN");
  if (openRisks.length > 0) {
    const avgRisk = openRisks.reduce((a, r) => a + (r.probability * r.impact), 0) / openRisks.length;
    riskScore = Math.max(0, 100 - (avgRisk / 25) * 100);
  }

  const healthScore = Math.round(
    scheduleScore * 0.30 +
    costScore     * 0.30 +
    resourceScore * 0.20 +
    riskScore     * 0.20
  );

  await db.project.update({ where: { id: projectId }, data: { healthScore } });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const ctx = await getAuthContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = UpdateFeatureSchema.parse(await req.json());

  const feature = await db.feature.update({
    where: { id },
    data: {
      ...(body.status   && { status:   body.status as any }),
      ...(body.priority && { priority: body.priority as any }),
      ...(body.title    && { title:    body.title }),
      ...(body.module   !== undefined && { module: body.module }),
      ...(body.notes    !== undefined && { notes:  body.notes }),
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

  // Recalculate health score
  await recalculateHealth(project.id);

  return NextResponse.json({ ok: true });
}