import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";
import { db } from "@/lib/prisma";

export async function POST() {
  const ctx = await getAuthContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const projects = await db.project.findMany({
    where: { organisationId: ctx.org.id, status: { notIn: ["CLOSED", "ARCHIVED"] } },
    include: { sprints: { include: { features: true } } },
  });

  let alertsCreated = 0;

  for (const project of projects) {
    const allF    = project.sprints.flatMap(s => s.features);
    const done    = allF.filter(f => f.status === "DONE").length;
    const pct     = allF.length ? Math.round((done / allF.length) * 100) : 0;
    const daysLeft = Math.ceil((new Date(project.endDate).getTime() - Date.now()) / 86400000);

    if (daysLeft < 0 && pct < 100) {
      const exists = await db.alert.findFirst({
        where: { projectId: project.id, type: "overdue", resolved: false },
      });
      if (!exists) {
        await db.alert.create({
          data: {
            organisationId: ctx.org.id,
            projectId:      project.id,
            type:           "overdue",
            level:          "critical",
            title:          `${project.name} is overdue`,
            detail:         `${Math.abs(daysLeft)}d past deadline at ${pct}% completion`,
            requiresValidation: true,
          },
        });
        alertsCreated++;
      }
    }

    if (daysLeft >= 0 && daysLeft <= 7 && pct < 80) {
      const exists = await db.alert.findFirst({
        where: { projectId: project.id, type: "milestone", resolved: false },
      });
      if (!exists) {
        await db.alert.create({
          data: {
            organisationId: ctx.org.id,
            projectId:      project.id,
            type:           "milestone",
            level:          "warning",
            title:          `${project.name} deadline in ${daysLeft}d`,
            detail:         `${pct}% complete — at risk of delay`,
          },
        });
        alertsCreated++;
      }
    }
  }

  return NextResponse.json({ status: "ok", projectsProcessed: projects.length, alertsCreated });
}
