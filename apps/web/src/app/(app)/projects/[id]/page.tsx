import { db } from "@/lib/prisma";
import { getAuthContext } from "@/lib/auth";
import { notFound, redirect } from "next/navigation";
import RoadmapClient from "./RoadmapClient";
 
export default async function ProjectPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await getAuthContext();
  if (!ctx) redirect("/sign-in");
 
  const [project, allProjects, allMembers, allDepartments] = await Promise.all([
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
        risks: { orderBy: { createdAt: "desc" } },
        assignments: {
          include: { resource: true },
        },
        requestedBy: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
        departments: {
          include: { department: true },
        },
      },
    }),
    db.project.findMany({
      where: { organisationId: ctx.org.id },
      select: { id: true, name: true },
    }),
    db.member.findMany({
      where: { organisationId: ctx.org.id },
      include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } },
    }),
    db.department.findMany({
      where: { organisationId: ctx.org.id },
      select: { id: true, name: true, color: true },
    }),
  ]);
 
  if (!project) notFound();
 
  const serialized = {
    ...project,
    startDate: project.startDate.toISOString(),
    endDate: project.endDate.toISOString(),
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
    risks: project.risks.map(r => ({
      ...r,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    })),
    assignments: project.assignments.map(a => ({
      ...a,
      createdAt: a.createdAt.toISOString(),
      updatedAt: a.updatedAt.toISOString(),
    })),
    departments: project.departments.map(pd => ({
      id: pd.department.id,
      name: pd.department.name,
      color: pd.department.color,
    })),
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
 
  return (
    <RoadmapClient
      project={serialized as any}
      role={ctx.role}
      allProjects={allProjects}
      allMembers={allMembers.map(m => ({ ...m.user, name: m.user.name ?? undefined }))}
      allDepartments={allDepartments}
    />
  );
}
 