import { getAuthContext } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { db } from "@/lib/prisma";
import ProjectBoardClient from "./BoardClient";

export default async function BoardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/sign-in");
  const { id } = await params;

  const project = await db.project.findFirst({
    where: { id, organisationId: ctx.org.id },
    select: {
      id: true, name: true,
      sprints: {
        orderBy: { order: "asc" },
        include: { features: { orderBy: { order: "asc" } } },
      },
    },
  });

  if (!project) notFound();

  const activeSprint = project.sprints.find(s => s.status === "ACTIVE") ?? project.sprints[project.sprints.length - 1] ?? null;

  const totalPts = activeSprint?.features.reduce((s: number, f: any) => s + (f.storyPoints ?? 0), 0) ?? 0;
  const donePts  = activeSprint?.features.filter((f: any) => f.status === "DONE").reduce((s: number, f: any) => s + (f.storyPoints ?? 0), 0) ?? 0;
  const daysLeft = activeSprint?.endDate ? Math.ceil((new Date(activeSprint.endDate).getTime() - Date.now()) / 86400000) : null;

  const allSprints = project.sprints.map((s: any) => ({
    id:        s.id,
    name:      s.name,
    status:    s.status,
    startDate: s.startDate?.toISOString() ?? null,
    endDate:   s.endDate?.toISOString()   ?? null,
    totalPts:  s.features.reduce((sum: number, f: any) => sum + (f.storyPoints ?? 0), 0),
    donePts:   s.features.filter((f: any) => f.status === "DONE").reduce((sum: number, f: any) => sum + (f.storyPoints ?? 0), 0),
    features:  s.features.map((f: any) => ({
      id:          f.id,
      title:       f.title,
      status:      f.status,
      source:      f.externalId ? "jira" as const : "native" as const,
      storyPoints: f.storyPoints ?? 0,
      externalId:  f.externalId ?? null,
      description: f.description ?? "",
    })),
  }));

  return (
    <ProjectBoardClient
      projectId={id}
      projectName={project.name}
      sprints={allSprints}
      activeSprintId={activeSprint?.id ?? null}
      totalPts={totalPts}
      donePts={donePts}
      daysLeft={daysLeft ?? 0}
    />
  );
}
