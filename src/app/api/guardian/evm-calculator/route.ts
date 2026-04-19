import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";
import { db } from "@/lib/prisma";

export async function POST() {
  const ctx = await getAuthContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const projects = await db.project.findMany({
    where: { organisationId: ctx.org.id, status: { notIn: ["CLOSED", "ARCHIVED"] } },
    include: {
      sprints:     { include: { features: true } },
      assignments: { include: { resource: true } },
    },
  });

  let projectsProcessed = 0;
  let alertsCreated = 0;

  for (const project of projects) {
    const allF     = project.sprints.flatMap(s => s.features);
    const done     = allF.filter(f => f.status === "DONE").length;
    const pct      = allF.length ? done / allF.length : 0;

    const bac      = project.budgetTotal;
    const ev       = bac * pct;
    const ac       = project.assignments.reduce((s, a) => s + a.actualHours * a.resource.costPerHour, 0);
    const pv       = bac * Math.min(1, Math.max(0, (Date.now() - new Date(project.startDate).getTime()) /
                       (new Date(project.endDate).getTime() - new Date(project.startDate).getTime())));

    const cpi      = ac > 0 ? ev / ac : 1;
    const spi      = pv > 0 ? ev / pv : 1;
    const eac      = bac > 0 && cpi > 0 ? bac / cpi : bac;

    if (bac > 0 && (cpi < 0.85 || spi < 0.85)) {
      const existing = await db.alert.findFirst({
        where: { projectId: project.id, type: "spi_critical", resolved: false },
      });
      if (!existing) {
        await db.alert.create({
          data: {
            organisationId: ctx.org.id,
            projectId:      project.id,
            type:           "spi_critical",
            level:          cpi < 0.7 || spi < 0.7 ? "critical" : "warning",
            title:          `EVM alert: ${project.name}`,
            detail:         `CPI ${cpi.toFixed(2)} · SPI ${spi.toFixed(2)} · EAC $${Math.round(eac).toLocaleString()}`,
            requiresValidation: cpi < 0.7,
          },
        });
        alertsCreated++;
      }
    }

    projectsProcessed++;
  }

  return NextResponse.json({ status: "ok", projectsProcessed, alertsCreated });
}
