import { NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { getAuthContext } from "@/lib/auth";
import { z } from "zod";

const Schema = z.object({
  featureId:   z.string(),
  dependsOnId: z.string(),
});

async function verifyFeatureOrg(featureId: string, orgId: string) {
  const f = await db.feature.findFirst({
    where: { id: featureId },
    include: { sprint: { include: { project: true } } },
  });
  return f?.sprint.project.organisationId === orgId ? f : null;
}

export async function POST(req: Request) {
  const ctx = await getAuthContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = Schema.parse(await req.json());

  if (body.featureId === body.dependsOnId)
    return NextResponse.json({ error: "A feature cannot depend on itself" }, { status: 400 });

  // Org isolation — both features must belong to same org
  const feature    = await verifyFeatureOrg(body.featureId,   ctx.org.id);
  const dependsOn  = await verifyFeatureOrg(body.dependsOnId, ctx.org.id);
  if (!feature || !dependsOn)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const dep = await db.featureDependency.create({
    data: { featureId: body.featureId, dependsOnId: body.dependsOnId },
  });
  return NextResponse.json(dep);
}

export async function DELETE(req: Request) {
  const ctx = await getAuthContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = Schema.parse(await req.json());

  // Org isolation
  const feature = await verifyFeatureOrg(body.featureId, ctx.org.id);
  if (!feature)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await db.featureDependency.deleteMany({
    where: { featureId: body.featureId, dependsOnId: body.dependsOnId },
  });
  return NextResponse.json({ ok: true });
}