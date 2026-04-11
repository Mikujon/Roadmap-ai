import { NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { getAuthContext } from "@/lib/auth";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string; snapshotId: string }> }
) {
  const { id, snapshotId } = await params;
  const ctx = await getAuthContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const snapshot = await db.projectSnapshot.findFirst({
    where: {
      id:        snapshotId,
      projectId: id,
      project:   { organisationId: ctx.org.id },
    },
  });

  if (!snapshot) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(snapshot);
}