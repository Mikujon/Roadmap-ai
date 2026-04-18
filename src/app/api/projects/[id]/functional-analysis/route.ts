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

  const fa = await db.functionalAnalysis.findUnique({
    where: { projectId: id },
    include: { versions: { orderBy: { version: "desc" }, take: 20 } },
  });

  return NextResponse.json({ fa });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const ctx = await getAuthContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const project = await db.project.findFirst({
    where: { id, organisationId: ctx.org.id },
    select: { id: true, name: true, description: true },
  });
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Delegate to analyze-video route for AI generation
  const res = await fetch(
    new URL("/api/generate/analyze-video", req.url).toString(),
    {
      method:  "POST",
      headers: { "Content-Type": "application/json", cookie: req.headers.get("cookie") ?? "" },
      body:    JSON.stringify({ projectId: id, projectName: project.name, brief: project.description }),
    }
  );
  const data = await res.json() as { content: unknown };
  return NextResponse.json(data, { status: res.status });
}

export async function PATCH(
  req: Request,
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

  const body = await req.json() as { content: Record<string, unknown>; changeNote?: string };

  const existing = await db.functionalAnalysis.findUnique({ where: { projectId: id } });
  if (!existing) return NextResponse.json({ error: "No FA found" }, { status: 404 });

  // Save current version before updating
  await db.fAVersion.create({
    data: {
      analysisId: existing.id,
      version:    existing.version,
      content:    existing.content as object,
      changedBy:  ctx.user.name ?? ctx.user.email,
      changeNote: body.changeNote ?? "Manual edit",
    },
  });

  const updated = await db.functionalAnalysis.update({
    where: { projectId: id },
    data:  {
      content: body.content as object,
      version: existing.version + 1,
      status:  "DRAFT",
    },
  });

  return NextResponse.json({ fa: updated });
}
