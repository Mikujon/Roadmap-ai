export const dynamic = "force-dynamic";
import { getAuthContext } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { db } from "@/lib/prisma";
import DocumentsClient from "./DocumentsClient";

export default async function DocumentsPage({
  params,
}: { params: Promise<{ id: string }> }) {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/sign-in");
  const { id } = await params;

  const project = await db.project.findFirst({
    where: { id, organisationId: ctx.org.id },
    select: { id: true, name: true },
  });
  if (!project) notFound();

  const documents = await db.projectDocument.findMany({
    where:   { projectId: id },
    orderBy: { createdAt: "desc" },
  });

  return (
    <DocumentsClient
      projectId={project.id}
      projectName={project.name}
      userRole={ctx.role}
      userName={ctx.user.name ?? ctx.user.email}
      initialDocuments={documents.map(d => ({
        id:        d.id,
        type:      d.type as string,
        title:     d.title,
        version:   d.version,
        status:    d.status,
        createdBy: d.createdBy,
        fileUrl:   d.fileUrl ?? null,
        createdAt: d.createdAt.toISOString(),
        updatedAt: d.updatedAt.toISOString(),
      }))}
    />
  );
}
