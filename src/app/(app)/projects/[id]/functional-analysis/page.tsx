export const dynamic = "force-dynamic";
import { getAuthContext } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { db } from "@/lib/prisma";
import FAClient from "./FAClient";

export default async function FunctionalAnalysisPage({
  params,
}: { params: Promise<{ id: string }> }) {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/sign-in");
  const { id } = await params;

  const project = await db.project.findFirst({
    where: { id, organisationId: ctx.org.id },
    select: { id: true, name: true, description: true },
  });
  if (!project) notFound();

  const fa = await db.functionalAnalysis.findUnique({
    where: { projectId: id },
    include: { versions: { orderBy: { version: "desc" }, take: 20 } },
  });

  return (
    <FAClient
      projectId={project.id}
      projectName={project.name}
      projectBrief={project.description ?? ""}
      fa={fa ? {
        id:         fa.id,
        content:    fa.content as Record<string, unknown>,
        status:     fa.status,
        version:    fa.version,
        approvedBy: fa.approvedBy,
        approvedAt: fa.approvedAt?.toISOString() ?? null,
        videoUrl:   fa.videoUrl,
        versions:   fa.versions.map(v => ({
          id:         v.id,
          version:    v.version,
          changedBy:  v.changedBy,
          changeNote: v.changeNote,
          createdAt:  v.createdAt.toISOString(),
        })),
      } : null}
      userRole={ctx.role}
      userName={ctx.user.name ?? ctx.user.email}
    />
  );
}
