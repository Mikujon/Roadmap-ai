import { NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { getAuthContext } from "@/lib/auth";
import { z } from "zod";

const Schema = z.object({
  projectId: z.string(),
  dependsOnId: z.string(),
});

export async function POST(req: Request) {
  const ctx = await getAuthContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = Schema.parse(await req.json());

  if (body.projectId === body.dependsOnId)
    return NextResponse.json({ error: "A project cannot depend on itself" }, { status: 400 });

  const dep = await db.projectDependency.create({
    data: { projectId: body.projectId, dependsOnId: body.dependsOnId },
  });

  return NextResponse.json(dep);
}

export async function DELETE(req: Request) {
  const ctx = await getAuthContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = Schema.parse(await req.json());

  await db.projectDependency.deleteMany({
    where: { projectId: body.projectId, dependsOnId: body.dependsOnId },
  });

  return NextResponse.json({ ok: true });
}