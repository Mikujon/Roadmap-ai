import { getAuthContext } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { db } from "@/lib/prisma";
import { getProjectMetrics } from "@/lib/metrics";
import ProjectOverviewClient from "./ProjectOverviewClient";

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/sign-in");
  const { id } = await params;

  const project = await db.project.findFirst({
    where: { id, organisationId: ctx.org.id },
    include: {
      phases: { orderBy: { order: "asc" } },
      sprints: {
        orderBy: { order: "asc" },
        include: { features: { orderBy: { order: "asc" } } },
      },
      risks: { where: { status: "OPEN" }, orderBy: [{ probability: "desc" }, { impact: "desc" }], take: 5 },
      assignments: { include: { resource: true } },
      requestedBy: { select: { name: true, email: true } },
      departments: { include: { department: true } },
      dependsOn: { include: { dependsOn: true } },
    },
  });

  if (!project) notFound();

  const metrics = getProjectMetrics(project as any);

  function getPhaseDate(
    phaseIndex: number,
    totalPhases: number,
    projectStart: Date,
    projectEnd: Date,
    edge: "start" | "end"
  ): Date {
    const totalMs = projectEnd.getTime() - projectStart.getTime();
    const phaseMs = totalMs / totalPhases;
    if (edge === "start") return new Date(projectStart.getTime() + phaseIndex * phaseMs);
    return new Date(projectStart.getTime() + (phaseIndex + 1) * phaseMs);
  }

  const activeSprint = project.sprints.find(s => s.status === "ACTIVE") ?? project.sprints[project.sprints.length - 1] ?? null;
  const totalPts = activeSprint?.features.reduce((s: number, f: any) => s + (f.storyPoints ?? 0), 0) ?? 0;
  const donePts  = activeSprint?.features.filter((f: any) => f.status === "DONE").reduce((s: number, f: any) => s + (f.storyPoints ?? 0), 0) ?? 0;

  const daysLeft = activeSprint?.endDate
    ? Math.ceil((new Date(activeSprint.endDate).getTime() - Date.now()) / 86400000)
    : null;

  const teamLead = project.requestedBy?.name ?? project.requestedBy?.email ?? "—";

  return (
    <ProjectOverviewClient
      projectId={id}
      project={{
        id:           project.id,
        name:         project.name,
        description:  project.description ?? "",
        startDate:    project.startDate.toISOString(),
        endDate:      project.endDate.toISOString(),
        budgetTotal:  project.budgetTotal,
        status:       project.status,
      }}
      metrics={{
        spi:             metrics.health.spi,
        cpi:             metrics.health.cpi,
        healthScore:     metrics.health.healthScore,
        healthStatus:    metrics.health.status,
        progressNominal: metrics.health.progressNominal,
        costActual:      metrics.costActual,
        alerts:          metrics.health.alerts as any[],
      }}
      phases={project.phases.map((ph: any, i: number) => {
        const pStart = ph.startDate ?? getPhaseDate(i, project.phases.length, project.startDate, project.endDate, "start");
        const pEnd   = ph.endDate   ?? getPhaseDate(i, project.phases.length, project.startDate, project.endDate, "end");
        const now    = new Date();
        const pct    = ph.completionPct > 0 ? ph.completionPct
          : now < pStart ? 0
          : now > pEnd   ? 100
          : Math.round((now.getTime() - pStart.getTime()) / (pEnd.getTime() - pStart.getTime()) * 100);
        const status = pct === 100 ? "DONE" : pct > 0 ? "IN_PROGRESS" : (ph.status ?? "PLANNED");
        return {
          id:        ph.id,
          name:      ph.label ?? ph.name ?? `Phase ${i + 1}`,
          startDate: pStart.toISOString(),
          endDate:   pEnd.toISOString(),
          status,
          pct,
        };
      })}
      activeSprint={activeSprint ? {
        id:        activeSprint.id,
        name:      activeSprint.name,
        startDate: activeSprint.startDate?.toISOString() ?? null,
        endDate:   activeSprint.endDate?.toISOString()   ?? null,
        totalPts,
        donePts,
        daysLeft:  daysLeft ?? 0,
        features:  activeSprint.features.map((f: any) => ({
          id:     f.id,
          title:  f.title,
          status: f.status,
          source: f.externalId ? "jira" : "native",
          storyPoints: f.storyPoints ?? 0,
        })),
      } : null}
      risks={project.risks.map((r: any) => ({
        id:          r.id,
        title:       r.title,
        probability: r.probability,
        impact:      r.impact,
        score:       r.probability * r.impact,
        status:      r.status,
        owner:       r.owner ?? "—",
        category:    r.category,
      }))}
      assignments={project.assignments.map((a: any) => ({
        id:             a.id,
        name:           a.resource.name,
        role:           a.resource.role,
        estimatedHours: a.estimatedHours,
        actualHours:    a.actualHours,
        capacityHours:  a.resource.capacityHours,
      }))}
      teamLead={teamLead}
      allSprints={project.sprints.map((s: any) => ({
        id:        s.id,
        name:      s.name,
        startDate: s.startDate?.toISOString() ?? null,
        endDate:   s.endDate?.toISOString()   ?? null,
        status:    s.status,
        phaseId:   s.phaseId ?? null,
        features:  s.features.map((f: any) => ({
          id:             f.id,
          title:          f.title,
          status:         f.status,
          priority:       f.priority,
          estimatedHours: f.estimatedHours ?? null,
        })),
      }))}
    />
  );
}
