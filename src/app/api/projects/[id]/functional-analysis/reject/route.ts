import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";
import { db } from "@/lib/prisma";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const ctx = await getAuthContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (ctx.role === "VIEWER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const project = await db.project.findFirst({
    where: { id, organisationId: ctx.org.id },
    select: { id: true },
  });
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { reason } = await req.json() as { reason?: string };

  const updated = await db.functionalAnalysis.update({
    where: { projectId: id },
    data:  { status: "REJECTED" },
  });

  // Log rejection as FA version note
  if (reason) {
    await db.fAVersion.create({
      data: {
        analysisId: updated.id,
        version:    updated.version,
        content:    updated.content as object,
        changedBy:  ctx.user.name ?? ctx.user.email,
        changeNote: `REJECTED: ${reason}`,
      },
    });
  }

  return NextResponse.json({ fa: updated });
}
