import { db }          from "@/lib/prisma";
import { withApiAuth } from "@/lib/api/route-handler";
import { ok, Errors }  from "@/lib/api/response";
import { orchestrate } from "@/lib/orchestrator";
import { NextResponse } from "next/server";

export const GET = withApiAuth(async (_req, ctx, params) => {
  const project = await db.project.findFirst({
    where:  { id: params.projectId, organisationId: ctx.orgId },
    select: {
      id: true,
      name: true,
      healthScore: true,
      guardianReport: true,
    },
  });

  if (!project) return Errors.NOT_FOUND("Project");

  return ok({
    projectId:   project.id,
    projectName: project.name,
    healthScore: project.healthScore,
    report: project.guardianReport ? {
      insight:        project.guardianReport.insight,
      recommendation: project.guardianReport.recommendation,
      riskFlag:       project.guardianReport.riskFlag,
      confidence:     project.guardianReport.confidence,
      alertCount:     project.guardianReport.alertCount,
      healthStatus:   project.guardianReport.healthStatus,
      generatedAt:    project.guardianReport.generatedAt.toISOString(),
    } : null,
  });
});

export const POST = withApiAuth(async (_req, ctx, params) => {
  const project = await db.project.findFirst({
    where:  { id: params.projectId, organisationId: ctx.orgId },
    select: { id: true },
  });

  if (!project) return Errors.NOT_FOUND("Project");

  orchestrate("feature_updated", params.projectId, ctx.orgId, { userId: ctx.userId ?? undefined });

  return NextResponse.json(
    { data: { status: "queued", projectId: params.projectId, message: "Guardian analysis triggered" } },
    { status: 202 }
  );
});
