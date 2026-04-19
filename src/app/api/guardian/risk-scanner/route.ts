import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";
import { db } from "@/lib/prisma";

export async function POST() {
  const ctx = await getAuthContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const projects = await db.project.findMany({
    where: { organisationId: ctx.org.id, status: { notIn: ["CLOSED", "ARCHIVED", "COMPLETED"] } },
    include: {
      sprints: { include: { features: true } },
      risks: { where: { status: "OPEN" } },
    },
  });

  let alertsCreated = 0;

  for (const project of projects) {
    const allFeatures   = project.sprints.flatMap(s => s.features);
    const blocked       = allFeatures.filter(f => f.status === "BLOCKED").length;
    const highRisks     = project.risks.filter(r => r.probability * r.impact >= 9);
    const daysLeft      = Math.ceil((new Date(project.endDate).getTime() - Date.now()) / 86400000);

    // Create alert for high risks not yet alerted
    for (const risk of highRisks) {
      const existing = await db.alert.findFirst({
        where: { projectId: project.id, type: "at_risk", resolved: false,
                 detail: { contains: risk.id } },
      });
      if (!existing) {
        await db.alert.create({
          data: {
            organisationId: ctx.org.id,
            projectId:      project.id,
            type:           "at_risk",
            level:          "critical",
            title:          `High risk: ${risk.title}`,
            detail:         `Risk score ${risk.probability * risk.impact}/25 — ${risk.description ?? ""} [${risk.id}]`,
            requiresValidation: true,
          },
        });
        alertsCreated++;
      }
    }

    if (blocked >= 3) {
      const existing = await db.alert.findFirst({
        where: { projectId: project.id, type: "blocked", resolved: false },
      });
      if (!existing) {
        await db.alert.create({
          data: {
            organisationId: ctx.org.id,
            projectId:      project.id,
            type:           "blocked",
            level:          "warning",
            title:          `${blocked} features blocked in ${project.name}`,
            detail:         `Sprint velocity at risk · ${daysLeft}d left`,
          },
        });
        alertsCreated++;
      }
    }
  }

  return NextResponse.json({ status: "ok", projectsProcessed: projects.length, alertsCreated });
}
