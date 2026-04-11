import { NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { getAuthContext } from "@/lib/auth";
import { z } from "zod";

const Schema = z.object({
  projectId:   z.string(),
  dependsOnId: z.string(),
});

async function verifyProjectOrg(projectId: string, orgId: string) {
  const p = await db.project.findFirst({ where: { id: projectId, organisationId: orgId } });
  return p ?? null;
}

export async function POST(req: Request) {
  const ctx = await getAuthContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = Schema.parse(await req.json());

  if (body.projectId === body.dependsOnId)
    return NextResponse.json({ error: "A project cannot depend on itself" }, { status: 400 });

  const project   = await verifyProjectOrg(body.projectId,   ctx.org.id);
  const dependsOn = await verifyProjectOrg(body.dependsOnId, ctx.org.id);
  if (!project || !dependsOn)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const dep = await db.projectDependency.create({
    data: { projectId: body.projectId, dependsOnId: body.dependsOnId },
  });
  return NextResponse.json(dep);
}

export async function DELETE(req: Request) {
  const ctx = await getAuthContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = Schema.parse(await req.json());

  const project = await verifyProjectOrg(body.projectId, ctx.org.id);
  if (!project)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await db.projectDependency.deleteMany({
    where: { projectId: body.projectId, dependsOnId: body.dependsOnId },
  });
  return NextResponse.json({ ok: true });
}