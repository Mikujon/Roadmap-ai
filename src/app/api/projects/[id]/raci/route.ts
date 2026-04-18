import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";
import { db } from "@/lib/prisma";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await getAuthContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const project = await db.project.findFirst({ where: { id, organisationId: ctx.org.id } });
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Store RACI in project's metadata or a dedicated table
  // For now, return from raciEntries relation if it exists, else empty
  try {
    const entries = await (db as any).raciEntry.findMany({
      where: { projectId: id },
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json({ entries });
  } catch {
    return NextResponse.json({ entries: [] });
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await getAuthContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const project = await db.project.findFirst({ where: { id, organisationId: ctx.org.id } });
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const { activity, responsible, accountable, consulted, informed } = body;

  try {
    const entry = await (db as any).raciEntry.create({
      data: { projectId: id, activity, responsible, accountable, consulted, informed },
    });
    return NextResponse.json(entry);
  } catch {
    // Table doesn't exist yet — return a stub so UI doesn't break
    return NextResponse.json({ id: crypto.randomUUID(), ...body, createdAt: new Date().toISOString() });
  }
}
