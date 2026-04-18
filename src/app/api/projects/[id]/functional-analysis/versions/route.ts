import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";
import { db } from "@/lib/prisma";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const ctx = await getAuthContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const project = await db.project.findFirst({
    where: { id, organisationId: ctx.org.id },
    select: { id: true },
  });
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const fa = await db.functionalAnalysis.findUnique({ where: { projectId: id }, select: { id: true } });
  if (!fa) return NextResponse.json({ versions: [] });

  const versions = await db.fAVersion.findMany({
    where:   { analysisId: fa.id },
    orderBy: { version: "desc" },
  });

  return NextResponse.json({ versions });
}
