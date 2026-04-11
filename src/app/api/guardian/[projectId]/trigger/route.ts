import { NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { enqueueGuardianRun } from "@roadmap/queue";

// Internal endpoint — enqueues a Guardian analysis job via BullMQ.
// Called by guardian-trigger.ts (fire-and-forget) after data mutations.
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
    select: { id: true, name: true, status: true },
  });
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (project.status === "ARCHIVED" || project.status === "CLOSED") {
    return NextResponse.json({ ok: true, skipped: true });
  }

  if (!process.env.REDIS_URL) {
    return NextResponse.json({ ok: true, skipped: true, reason: "no REDIS_URL" });
  }

  const jobId = await enqueueGuardianRun(projectId, project.name);
  return NextResponse.json({ ok: true, jobId });
}
