import { triggerGuardian } from "@/lib/guardian-trigger";
import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";
import { db } from "@/lib/prisma";

const CACHE_TTL_HOURS = 2;

export async function GET(
  req: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;
  const ctx = await getAuthContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url          = new URL(req.url);
  const forceRefresh = url.searchParams.get("refresh") === "true";

  // Verify project ownership
  const project = await db.project.findFirst({
    where: { id: projectId, organisationId: ctx.org.id },
    select: { id: true, name: true, status: true },
  });
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Return cached report if fresh
  const cached = await db.guardianReport.findUnique({ where: { projectId } });
  if (cached && !forceRefresh) {
    const ageHours = (Date.now() - cached.updatedAt.getTime()) / (1000 * 60 * 60);
    if (ageHours < CACHE_TTL_HOURS) {
      return NextResponse.json({ ...cached, _cached: true, _cacheAgeMin: Math.round(ageHours * 60) });
    }
  }

  // Enqueue fresh analysis — worker will upsert GuardianReport when done
  if (process.env.REDIS_URL) {
    await triggerGuardian(projectId, project.name);
  }

  // Return stale cached if available while worker runs
  if (cached) {
    return NextResponse.json({ ...cached, _cached: true, _stale: true });
  }

  // No report yet — return minimal placeholder
  return NextResponse.json({
    projectId,
    healthScore:    0,
    healthStatus:   "UNKNOWN",
    insight:        "Analysis in progress…",
    recommendation: "Guardian is running the first analysis for this project.",
    riskFlag:       false,
    confidence:     0,
    alertCount:     0,
    _cached:        false,
    _pending:       true,
  });
}

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;
  const ctx = await getAuthContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const project = await db.project.findFirst({
    where: { id: projectId, organisationId: ctx.org.id },
    select: { id: true, name: true },
  });
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (process.env.REDIS_URL) {
    await triggerGuardian(projectId, project.name);
  }

  return NextResponse.json({ ok: true, message: "Guardian analysis queued" });
}

