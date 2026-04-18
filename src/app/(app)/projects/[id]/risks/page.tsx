import { getAuthContext } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { db } from "@/lib/prisma";
import ProjectRisksClient from "./RisksClient";

export default async function RisksPage({
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
      risks: { orderBy: [{ probability: "desc" }, { impact: "desc" }] },
    },
  });

  if (!project) notFound();

  const risks = project.risks.map((r: any) => ({
    id:          r.id,
    title:       r.title,
    description: r.description ?? "",
    probability: r.probability,
    impact:      r.impact,
    score:       r.probability * r.impact,
    status:      r.status,
    owner:       r.owner ?? "—",
    category:    r.category ?? "Other",
    mitigation:  r.mitigation ?? "",
    createdAt:   r.createdAt.toISOString(),
  }));

  return (
    <ProjectRisksClient
      projectId={id}
      projectName={project.name}
      risks={risks}
    />
  );
}
