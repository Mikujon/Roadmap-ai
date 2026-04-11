import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";
import { db } from "@/lib/prisma";
import { runGuardianAgent } from "@/lib/guardian-agent";

const CACHE_TTL_HOURS = 2;

export async function GET(
  req: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;
  const ctx = await getAuthContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url         = new URL(req.url);
  const forceRefresh = url.searchParams.get("refresh") === "true";

  // Check cache
  if (!forceRefresh) {
    const cached = await db.guardianReport.findUnique({ where: { projectId } });
    if (cached) {
      const ageHours = (Date.now() - cached.updatedAt.getTime()) / (1000 * 60 * 60);
      if (ageHours < CACHE_TTL_HOURS) {
        return NextResponse.json({ ...cached, _cached: true, _cacheAge: Math.round(ageHours * 60) + "min" });
      }
    }
  }

  // Fetch full project data for agent
  const p = await db.project.findFirst({
    where: { id: projectId, organisationId: ctx.org.id },
    include: {
      sprints: {
        include: {
          features: { include: { dependsOn: true } },
        },
      },
      assignments:  { include: { resource: true } },
      risks:        true,
      departments:  { include: { department: true } },
      statusLogs:   { orderBy: { createdAt: "desc" }, take: 10 },
      snapshots:    { orderBy: { createdAt: "desc" }, take: 3 },
    },
  });
  if (!p) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Run agent
  const report = await runGuardianAgent(p);

  // Save to cache
  await db.guardianReport.upsert({
    where:  { projectId },
    create: {
      projectId,
      healthScore:        report.healthScore,
      riskLevel:          report.riskLevel,
      onTrackProbability: report.onTrackProbability,
      estimatedDelay:     report.estimatedDelay,
      alerts:             report.alerts as any,
      recommendations:    report.recommendations as any,
      summary:            report.summary,
    },
    update: {
      healthScore:        report.healthScore,
      riskLevel:          report.riskLevel,
      onTrackProbability: report.onTrackProbability,
      estimatedDelay:     report.estimatedDelay,
      alerts:             report.alerts as any,
      recommendations:    report.recommendations as any,
      summary:            report.summary,
    },
  });

  return NextResponse.json({ ...report, _cached: false });
}

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;
  const ctx = await getAuthContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await db.guardianReport.deleteMany({ where: { projectId } });
  return NextResponse.json({ ok: true, message: "Cache cleared" });
}