import { NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { getAuthContext } from "@/lib/auth";
import { z } from "zod";

const Schema = z.object({
  featureId: z.string(),
  dependsOnId: z.string(),
});

export async function POST(req: Request) {
  const ctx = await getAuthContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = Schema.parse(await req.json());

  if (body.featureId === body.dependsOnId)
    return NextResponse.json({ error: "A feature cannot depend on itself" }, { status: 400 });

  const dep = await db.featureDependency.create({
    data: { featureId: body.featureId, dependsOnId: body.dependsOnId },
  });

  return NextResponse.json(dep);
}

export async function DELETE(req: Request) {
  const ctx = await getAuthContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = Schema.parse(await req.json());

  await db.featureDependency.deleteMany({
    where: { featureId: body.featureId, dependsOnId: body.dependsOnId },
  });

  return NextResponse.json({ ok: true });
}