// ── Guardian Job Processor ────────────────────────────────────────────────
// Runs deterministic engines first, then enriches with AI.
// Result is written to the guardian_reports table (upsert).

import type { Job } from "bullmq";
import type { GuardianJobData } from "@roadmap/queue";
import { computeAlerts } from "@roadmap/engines/alert";
import { calculateProjectMetrics } from "@roadmap/engines/metrics";
import { runGuardianAI } from "@roadmap/ai/guardian";
import {
  guardianJobsTotal,
  guardianJobDuration,
} from "@roadmap/metrics";
import { createLogger } from "@roadmap/logger";
import { db } from "../db";

const log = createLogger("guardian-worker");

const PROJECT_SELECT = {
  id: true, name: true, status: true,
  startDate: true, endDate: true, budgetTotal: true,
  sprints: {
    select: {
      id: true, num: true, name: true, status: true,
      startDate: true, endDate: true,
      features: { select: { status: true } },
    },
  },
  assignments: {
    select: {
      estimatedHours: true, actualHours: true,
      resource: {
        select: { name: true, role: true, costPerHour: true, capacityHours: true },
      },
    },
  },
  risks: {
    select: { title: true, probability: true, impact: true, status: true, mitigation: true },
  },
  statusLogs: {
    select: { status: true, createdAt: true, changedBy: true, note: true },
    orderBy: { createdAt: "desc" as const },
    take: 10,
  },
} as const;

export async function processGuardianJob(job: Job<GuardianJobData>): Promise<void> {
  const { projectId, force } = job.data;
  const end = guardianJobDuration.startTimer();

  try {
    const project = await db.project.findUnique({
      where: { id: projectId },
      select: PROJECT_SELECT,
    });

    if (!project) {
      log.warn("project not found — skipping", { projectId });
      guardianJobsTotal.inc({ outcome: "skipped" });
      end();
      return;
    }

    if (project.status === "ARCHIVED" || project.status === "CLOSED") {
      log.info("skipping inactive project", { projectId, status: project.status });
      guardianJobsTotal.inc({ outcome: "skipped" });
      end();
      return;
    }

    log.info("job started", { projectId, projectName: project.name, jobId: job.id });
    await job.updateProgress(20);

    // 1. Deterministic engines
    const metrics = calculateProjectMetrics({
      startDate:   project.startDate,
      endDate:     project.endDate,
      budgetTotal: project.budgetTotal ?? 0,
      sprints:     project.sprints as any,
      assignments: project.assignments as any,
      risks:       project.risks,
    });

    const alerts = computeAlerts({
      projectId:   project.id,
      projectName: project.name,
      startDate:   project.startDate,
      endDate:     project.endDate,
      budgetTotal: project.budgetTotal ?? 0,
      sprints:     project.sprints as any,
      assignments: project.assignments as any,
      risks:       project.risks,
    });

    await job.updateProgress(50);

    // 2. AI enrichment
    const aiResult = await runGuardianAI({
      projectName:    project.name,
      spi:            metrics.healthScore > 0 ? metrics.healthScore / 100 : 1,
      cpi:            1,
      progressPct:    metrics.progressPct,
      plannedPct:     metrics.plannedPct,
      daysLeft:       metrics.daysLeft,
      budgetVariance: metrics.budgetVariance,
      openRisks:      metrics.openRisks,
      highRisks:      metrics.highRisks,
      blockedFeatures: metrics.blockedFeatures,
      healthScore:    metrics.healthScore,
      healthStatus:   metrics.health,
      alerts:         alerts.map(a => ({
        type:   a.type,
        level:  a.level,
        title:  a.title,
        detail: a.detail,
        action: a.action,
      })),
    }, { force });

    await job.updateProgress(80);

    // 3. Persist alert records (dedup: same type, unresolved, within 24h)
    for (const alert of alerts) {
      const existing = await db.alert.findFirst({
        where: {
          projectId,
          type:      alert.type,
          resolved:  false,
          createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        },
      });
      if (!existing) {
        await db.alert.create({
          data: {
            projectId,
            type:    alert.type,
            level:   alert.level,
            title:   alert.title,
            detail:  alert.detail,
            action:  alert.action,
          },
        });
      }
    }

    // 4. Upsert guardian report
    await (db as any).guardianReport.upsert({
      where:  { projectId },
      update: {
        healthScore:    metrics.healthScore,
        healthStatus:   metrics.health,
        insight:        aiResult.insight,
        recommendation: aiResult.recommendation,
        riskFlag:       aiResult.riskFlag,
        confidence:     aiResult.confidence,
        alertCount:     alerts.length,
        updatedAt:      new Date(),
      },
      create: {
        projectId,
        healthScore:    metrics.healthScore,
        healthStatus:   metrics.health,
        insight:        aiResult.insight,
        recommendation: aiResult.recommendation,
        riskFlag:       aiResult.riskFlag,
        confidence:     aiResult.confidence,
        alertCount:     alerts.length,
      },
    }).catch((e: Error) => {
      log.warn("guardianReport upsert failed (table may not exist yet)", { error: e.message });
    });

    await job.updateProgress(100);

    guardianJobsTotal.inc({ outcome: "success" });
    end();
    log.info("job completed", {
      projectId,
      projectName: project.name,
      healthScore: metrics.healthScore,
      alertCount:  alerts.length,
    });
  } catch (err) {
    guardianJobsTotal.inc({ outcome: "failure" });
    end();
    log.error("job failed", { projectId, error: (err as Error).message });
    throw err; // re-throw so BullMQ marks the job as failed and retries
  }
}
