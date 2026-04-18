import { getAuthContext } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { db } from "@/lib/prisma";
import ProjectGovernanceClient from "./GovernanceClient";

export default async function GovernancePage({
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
      statusLogs: { orderBy: { createdAt: "desc" }, take: 20 },
      snapshots:  { orderBy: { createdAt: "desc" }, take: 10 },
      dependsOn:  { include: { dependsOn: { select: { id: true, name: true, status: true } } } },
      blockedBy:  { include: { project: { select: { id: true, name: true, status: true } } } },
    },
  });

  if (!project) notFound();

  return (
    <ProjectGovernanceClient
      projectId={id}
      projectName={project.name}
      statusLogs={(project as any).statusLogs.map((l: any) => ({
        id:        l.id,
        status:    l.status ?? "",
        note:      l.note   ?? "",
        changedBy: l.changedBy ?? "System",
        createdAt: l.createdAt.toISOString(),
      }))}
      snapshots={(project as any).snapshots.map((s: any) => ({
        id:          s.id,
        reason:      s.reason   ?? "",
        createdAt:   s.createdAt.toISOString(),
        healthScore: s.healthScore ?? 0,
        status:      s.status   ?? "",
      }))}
      dependencies={(project as any).dependsOn.map((d: any) => ({
        id:       d.dependsOn.id,
        name:     d.dependsOn.name,
        status:   d.dependsOn.status,
        type:     "depends_on" as const,
        blocked:  false,
      }))}
      blockers={(project as any).blockedBy.map((d: any) => ({
        id:     d.project.id,
        name:   d.project.name,
        status: d.project.status,
        type:   "blocked_by" as const,
        blocked: false,
      }))}
    />
  );
}
