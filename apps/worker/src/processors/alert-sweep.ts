// ── Alert Sweep Job Processor ─────────────────────────────────────────────
// Sweeps all active projects, runs deterministic alert engine, persists results.
// Runs every 2 hours via cron scheduler in index.ts.

import type { Job } from "bullmq";
import type { AlertSweepJobData } from "@roadmap/queue";
import { computeAlerts } from "@roadmap/engines/alert";
import { db } from "../db";

export async function processAlertSweepJob(job: Job<AlertSweepJobData>): Promise<void> {
  const { projectId } = job.data;

  const where = {
    status: { notIn: ["ARCHIVED", "CLOSED"] as const },
    ...(projectId ? { id: projectId } : {}),
  };

  const projects = await db.project.findMany({
    where,
    select: {
      id: true, name: true, startDate: true, endDate: true, budgetTotal: true,
      sprints: {
        select: {
          id: true, num: true, name: true, status: true, endDate: true,
          features: { select: { status: true } },
        },
      },
      assignments: {
        select: {
          estimatedHours: true, actualHours: true,
          resource: { select: { costPerHour: true, capacityHours: true } },
        },
      },
      risks: {
        select: { probability: true, impact: true, status: true },
      },
    },
  });

  const dedup24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
  let total = 0;

  for (const project of projects) {
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

    for (const alert of alerts) {
      const exists = await db.alert.findFirst({
        where: {
          projectId: project.id,
          type:      alert.type,
          resolved:  false,
          createdAt: { gte: dedup24h },
        },
      });
      if (!exists) {
        await db.alert.create({
          data: {
            projectId: project.id,
            type:      alert.type,
            level:     alert.level,
            title:     alert.title,
            detail:    alert.detail,
            action:    alert.action,
          },
        });
        total++;
      }
    }

    await job.updateProgress(Math.round(((projects.indexOf(project) + 1) / projects.length) * 100));
  }

  console.log(`[alert-sweep] ✓ ${projects.length} projects, ${total} new alerts`);
}
