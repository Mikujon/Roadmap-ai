import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";
import { db } from "@/lib/prisma";

export async function POST() {
  const ctx = await getAuthContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const projects = await db.project.findMany({
    where: { organisationId: ctx.org.id, status: { notIn: ["CLOSED", "ARCHIVED"] } },
    include: {
      dependsOn: { include: { dependsOn: true } },
      sprints:   { include: { features: { include: { blockedBy: { include: { blocker: true } } } } } },
    },
  });

  let alertsCreated = 0;

  for (const project of projects) {
    // Check project-level dependencies
    const blockedByProjects = project.dependsOn.filter(
      dep => dep.dependsOn.status !== "COMPLETED"
    );

    if (blockedByProjects.length > 0) {
      const exists = await db.alert.findFirst({
        where: { projectId: project.id, type: "blocked", resolved: false,
                 title: { contains: "dependency" } },
      });
      if (!exists) {
        await db.alert.create({
          data: {
            organisationId: ctx.org.id,
            projectId:      project.id,
            type:           "blocked",
            level:          "warning",
            title:          `${project.name} blocked by ${blockedByProjects.length} project dependency`,
            detail:         blockedByProjects.map(d => d.dependsOn.name).join(", ") + " not yet completed",
            requiresValidation: false,
          },
        });
        alertsCreated++;
      }
    }

    // Check feature-level blocked dependencies
    const allFeatures = project.sprints.flatMap(s => s.features);
    const featuresWithActiveDeps = allFeatures.filter(f =>
      f.blockedBy.some(dep => dep.blocker.status !== "DONE")
    );

    if (featuresWithActiveDeps.length >= 3) {
      const exists = await db.alert.findFirst({
        where: { projectId: project.id, type: "blocked", resolved: false,
                 title: { contains: "features blocked by dependencies" } },
      });
      if (!exists) {
        await db.alert.create({
          data: {
            organisationId: ctx.org.id,
            projectId:      project.id,
            type:           "blocked",
            level:          "warning",
            title:          `${featuresWithActiveDeps.length} features blocked by dependencies in ${project.name}`,
            detail:         "Unresolved feature dependencies are blocking sprint progress",
          },
        });
        alertsCreated++;
      }
    }
  }

  return NextResponse.json({ status: "ok", projectsProcessed: projects.length, alertsCreated });
}
