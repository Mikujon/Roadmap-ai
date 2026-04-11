import { NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { runGuardianAgent } from "@/lib/guardian-agent";


// This endpoint is called internally to regenerate Guardian in background
// It's called after any data change (feature, sprint, risk, budget)
export async function POST(
  req: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;

  // Verify secret to prevent abuse
  const secret = req.headers.get("x-guardian-secret");
  if (secret !== process.env.GUARDIAN_SECRET && secret !== "guardian-internal-2026") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const p = await db.project.findFirst({
      where: { id: projectId },
      include: {
        sprints:     { include: { features: { include: { dependsOn: true } } } },
        assignments: { include: { resource: true } },
        risks:       true,
        departments: { include: { department: true } },
        statusLogs:  { orderBy: { createdAt: "desc" }, take: 10 },
        snapshots:   { orderBy: { createdAt: "desc" }, take: 3 },
      },
    });

    if (!p) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const report = await runGuardianAgent(p);

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

    return NextResponse.json({ ok: true, healthScore: report.healthScore });
  } catch (e) {
    console.error("Guardian trigger failed:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}