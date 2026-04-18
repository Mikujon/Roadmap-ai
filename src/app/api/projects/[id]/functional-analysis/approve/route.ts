import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";
import { db } from "@/lib/prisma";

export async function POST(
  _req: Request,
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

  const fa = await db.functionalAnalysis.findUnique({ where: { projectId: id } });
  if (!fa) return NextResponse.json({ error: "No FA found" }, { status: 404 });

  const updated = await db.functionalAnalysis.update({
    where:  { projectId: id },
    data:   { status: "APPROVED", approvedBy: ctx.user.name ?? ctx.user.email, approvedAt: new Date() },
  });

  return NextResponse.json({ fa: updated });
}
