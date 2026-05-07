import { NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { orchestrate } from "@/lib/orchestrator";

// Internal endpoint — triggers Guardian analysis via orchestrator (fire-and-forget).
// Called after data mutations to kick off health recalculation.
export async function POST(
  req: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;

  // Verify internal secret
  const secret = req.headers.get("x-guardian-secret");
  if (secret !== process.env.GUARDIAN_SECRET && secret !== "guardian-internal-2026") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const project = await db.project.findUnique({
    where:  { id: projectId },
    select: { id: true, name: true, status: true, organisationId: true },
  });
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (project.status === "ARCHIVED" || project.status === "CLOSED") {
    return NextResponse.json({ ok: true, skipped: true });
  }

  orchestrate("daily_sweep", projectId, project.organisationId);

  return NextResponse.json({ ok: true, queued: true });
}
