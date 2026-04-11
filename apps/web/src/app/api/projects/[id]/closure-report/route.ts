import { NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { getAuthContext } from "@/lib/auth";
import Anthropic from "@anthropic-ai/sdk";
import { calculateHealth } from "@/lib/health";

const anthropic = new Anthropic();

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const ctx = await getAuthContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const project = await db.project.findFirst({
    where: { id, organisationId: ctx.org.id },
    include: {
      sprints:     { include: { features: true } },
      assignments: { include: { resource: true } },
      risks:       true,
      statusLogs:  { orderBy: { createdAt: "asc" } },
      phases:      { orderBy: { order: "asc" } },
    },
  });
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const allF        = project.sprints.flatMap(s => s.features);
  const done        = allF.filter(f => f.status === "DONE").length;
  const blocked     = allF.filter(f => f.status === "BLOCKED").length;
  const costActual  = project.assignments.reduce((s, a) => s + a.actualHours * a.resource.costPerHour, 0);
  const costEst     = project.assignments.reduce((s, a) => s + a.estimatedHours * a.resource.costPerHour, 0);
  const openRisks   = project.risks.filter(r => r.status === "OPEN");
  const highRisks   = project.risks.filter(r => r.status === "OPEN" && r.probability * r.impact >= 9);
  const maxRisk     = openRisks.length > 0 ? Math.max(...openRisks.map(r => r.probability * r.impact)) : 0;
  const doneSprints = project.sprints.filter(s => s.status === "DONE").length;

  const h = calculateHealth({
    startDate: project.startDate, endDate: project.endDate,
    totalFeatures: allF.length, doneFeatures: done,
    blockedFeatures: blocked, inProgressFeatures: allF.filter(f => f.status === "IN_PROGRESS").length,
    totalSprints: project.sprints.length, doneSprints,
    activeSprints: 0,
    budgetTotal: project.budgetTotal, costActual, costEstimated: costEst,
    totalCapacityHours: project.assignments.reduce((s, a) => s + a.resource.capacityHours, 0),
    totalActualHours: project.assignments.reduce((s, a) => s + a.actualHours, 0),
    openRisks: openRisks.length, highRisks: highRisks.length, maxRiskScore: maxRisk,
  });

  const totalDays   = Math.round((new Date(project.endDate).getTime() - new Date(project.startDate).getTime()) / 86400000);
  const actualDays  = Math.round((new Date().getTime() - new Date(project.startDate).getTime()) / 86400000);
  const statusHistory = project.statusLogs.map(l => `${new Date(l.createdAt).toLocaleDateString("en-GB")} → ${l.status}${l.note ? `: "${l.note}"` : ""}`).join("\n");

  const prompt = `You are an expert PMO consultant writing a formal project closure report.

PROJECT: ${project.name}
DESCRIPTION: ${project.description ?? "Not provided"}

TIMELINE:
- Planned: ${new Date(project.startDate).toLocaleDateString("en-GB")} → ${new Date(project.endDate).toLocaleDateString("en-GB")} (${totalDays} days)
- Actual duration: ${actualDays} days
- Delay: ${actualDays > totalDays ? `+${actualDays - totalDays} days over plan` : "On time or early"}

SCOPE DELIVERY:
- Features: ${done}/${allF.length} completed (${h.progressNominal}%)
- Sprints: ${doneSprints}/${project.sprints.length} completed
- Blocked features: ${blocked}

FINANCIAL:
- Budget: $${Math.round(project.budgetTotal).toLocaleString()}
- Actual cost: $${Math.round(costActual).toLocaleString()}
- Variance: ${costActual > project.budgetTotal ? `+$${Math.round(costActual - project.budgetTotal).toLocaleString()} over budget` : `$${Math.round(project.budgetTotal - costActual).toLocaleString()} under budget`}
- CPI: ${h.cpi.toFixed(2)} | SPI: ${h.spi.toFixed(2)}

STATUS HISTORY:
${statusHistory || "No status changes recorded"}

Write a professional PMO closure report in JSON format:
{
  "executiveSummary": "2-3 sentence summary of project outcome",
  "deliveryStatus": "on_time|delayed|early",
  "overallRating": "excellent|good|fair|poor",
  "scopeDelivery": {
    "pct": ${h.progressNominal},
    "summary": "brief summary of scope delivery"
  },
  "schedulePerformance": {
    "spi": ${h.spi.toFixed(2)},
    "summary": "brief summary of schedule performance"
  },
  "costPerformance": {
    "cpi": ${h.cpi.toFixed(2)},
    "summary": "brief summary of cost performance"
  },
  "lessonsLearned": ["lesson 1", "lesson 2", "lesson 3"],
  "recommendations": ["recommendation for next project 1", "recommendation 2", "recommendation 3"],
  "achievements": ["key achievement 1", "key achievement 2"],
  "risks": ["key risk that materialized or was avoided"]
}`;

  try {
    const msg = await anthropic.messages.create({
      model: process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-5",
      max_tokens: 1500,
      messages: [{ role: "user", content: prompt }],
    });

    const raw  = (msg.content[0] as any).text.replace(/```json|```/gi, "").trim();
    const report = JSON.parse(raw);

    // Save to DB as a status log with special type
    await db.projectStatusLog.create({
      data: {
        projectId: id,
        status:    "CLOSED",
        note:      JSON.stringify(report),
        changedBy: "AI Guardian",
      },
    });

    return NextResponse.json({ ok: true, report });
  } catch (e) {
    return NextResponse.json({ error: "Failed to generate report" }, { status: 500 });
  }
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const ctx = await getAuthContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Get the latest closure report from status logs
  const log = await db.projectStatusLog.findFirst({
    where: { projectId: id, status: "CLOSED", changedBy: "AI Guardian" },
    orderBy: { createdAt: "desc" },
  });

  if (!log?.note) return NextResponse.json({ report: null });

  try {
    return NextResponse.json({ report: JSON.parse(log.note) });
  } catch {
    return NextResponse.json({ report: null });
  }
}