import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";
import { db } from "@/lib/prisma";

export async function GET(req: Request) {
  const ctx = await getAuthContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() ?? "";
  if (!q || q.length < 2) return NextResponse.json({ results: [] });

  const orgId = ctx.org.id;

  const [projects, sprints, features] = await Promise.all([
    db.project.findMany({
      where: {
        organisationId: orgId,
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { description: { contains: q, mode: "insensitive" } },
        ],
      },
      select: { id: true, name: true, description: true, status: true },
      take: 5,
    }),
    db.sprint.findMany({
      where: {
        project: { organisationId: orgId },
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { goal: { contains: q, mode: "insensitive" } },
        ],
      },
      select: { id: true, name: true, goal: true, projectId: true, project: { select: { name: true } } },
      take: 5,
    }),
    db.feature.findMany({
      where: {
        sprint: { project: { organisationId: orgId } },
        title: { contains: q, mode: "insensitive" },
      },
      select: { id: true, title: true, status: true, sprint: { select: { projectId: true, project: { select: { name: true } } } } },
      take: 5,
    }),
  ]);

  const results = [
    ...projects.map(p => ({
      type: "project",
      id: p.id,
      title: p.name,
      subtitle: p.description?.slice(0, 60) ?? p.status,
      href: `/projects/${p.id}`,
    })),
    ...sprints.map(s => ({
      type: "sprint",
      id: s.id,
      title: s.name,
      subtitle: `${s.project.name} · ${s.goal?.slice(0, 60) ?? ""}`,
      href: `/projects/${s.projectId}?tab=board`,
    })),
    ...features.map(f => ({
      type: "feature",
      id: f.id,
      title: f.title,
      subtitle: `${f.sprint.project.name} · ${f.status.replace("_", " ")}`,
      href: `/projects/${f.sprint.projectId}?tab=board`,
    })),
  ];

  return NextResponse.json({ results });
}
