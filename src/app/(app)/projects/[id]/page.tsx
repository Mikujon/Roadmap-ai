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
      phases={project.phases.map((ph: any) => ({
        id:        ph.id,
        name:      ph.name,
        startDate: ph.startDate?.toISOString() ?? null,
        endDate:   ph.endDate?.toISOString()   ?? null,
        status:    ph.status,
        pct:       ph.completionPct ?? 0,
      }))}
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
    />
  );
}
