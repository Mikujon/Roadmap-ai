import { db } from "@/lib/prisma";
import { getAuthContext } from "@/lib/auth";
import { notFound, redirect } from "next/navigation";
import RoadmapClient from "./RoadmapClient";

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await getAuthContext();
  if (!ctx) redirect("/sign-in");

  const [project, allProjects] = await Promise.all([
    db.project.findFirst({
      where: { id, organisationId: ctx.org.id },
      include: {
        phases: { orderBy: { order: "asc" } },
        sprints: {
          orderBy: { order: "asc" },
          include: {
            features: {
              orderBy: { order: "asc" },
              include: { dependsOn: true },
            },
          },
        },
        dependsOn: { include: { dependsOn: true } },
      },
    }),
    db.project.findMany({
      where: { organisationId: ctx.org.id },
      select: { id: true, name: true },
    }),
  ]);

  if (!project) notFound();

  // Convert dates to strings for client component
  const serialized = {
    ...project,
    startDate: project.startDate.toISOString(),
    endDate: project.endDate.toISOString(),
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
    sprints: project.sprints.map(s => ({
      ...s,
      startDate: s.startDate?.toISOString() ?? null,
      endDate: s.endDate?.toISOString() ?? null,
      features: s.features.map(f => ({
        ...f,
        createdAt: f.createdAt.toISOString(),
        updatedAt: f.updatedAt.toISOString(),
      })),
    })),
  };

  return <RoadmapClient project={serialized as any} role={ctx.role} allProjects={allProjects} />;
}