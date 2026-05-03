import { db } from "@/lib/prisma";
import { calculateHealth } from "@/lib/health";
import { runDependencyAgent  } from "@/lib/skills/dependency-skill";
import { runForecastAgent    } from "@/lib/skills/forecast-skill";
import { runReportAgent      } from "@/lib/skills/report-skill";
import { runMethodologyAgent } from "@/lib/skills/methodology-skill";

// ── Event types ──────────────────────────────────────────────────────────────

export type TriggerEvent =
  | "feature_updated"
  | "feature_blocked"
  | "sprint_closed"
  | "budget_updated"
  | "risk_added"
  | "project_created"
  | "project_completed"
  | "scope_changed"
  | "daily_sweep";

// ── Main dispatcher ──────────────────────────────────────────────────────────

export function triggerAgents(
  event: TriggerEvent,
  projectId: string,
  orgId: string,
  _meta?: Record<string, unknown>
): void {
  const agents: Promise<unknown>[] = [];

  // Health score runs on every mutation — immediate feedback
  if (projectId) {
    agents.push(runHealthScore(projectId));
  }

  if (event === "feature_updated" || event === "feature_blocked" || event === "sprint_closed") {
    agents.push(runEvmCalculator(projectId));
    agents.push(runRiskScanner(projectId));
  }

  if (event === "budget_updated" || event === "scope_changed") {
    agents.push(runEvmCalculator(projectId));
  }

  if (event === "feature_blocked") {
    agents.push(runDependencyMonitor(projectId));
    agents.push(runAlertGenerator(projectId));
    agents.push(runDependencyAgent({ projectId, orgId }));
  }

  if (event === "risk_added") {
    agents.push(runRiskScanner(projectId));
    agents.push(runAlertGenerator(projectId));
  }

  if (event === "sprint_closed") {
    agents.push(runForecastAgent({ projectId, orgId, meta: { event } }));
    agents.push(runReportAgent({ projectId, orgId, meta: { event } }));
    agents.push(runMethodologyAgent({ projectId, orgId, meta: { event } }));
  }

  if (event === "project_created") {
    agents.push(runFullProjectSetup(projectId));
  }

  if (event === "project_completed") {
    agents.push(runReportAgent({ projectId, orgId, meta: { event } }));
  }

  if (event === "daily_sweep") {
    agents.push(runDailySweep(orgId));
  }

  // Fire and forget — never block the HTTP response
  Promise.allSettled(agents).then(results => {
    const failed = results.filter(r => r.status === "rejected");
    if (failed.length > 0) {
      console.error(`[agent-triggers] ${failed.length} agent(s) failed`, { event, projectId });
      for (const f of failed) {
        if (f.status === "rejected") console.error("[agent-triggers]", f.reason);
      }
    }
  });
}

// ── Agent: Health Score ───────────────────────────────────────────────────────

async function runHealthScore(projectId: string): Promise<void> {
  const project = await db.project.findUnique({
    where: { id: projectId },
    include: {
      sprints:     { include: { features: true } },
      assignments: { include: { resource: true } },
      risks: true,
    },
  });
  if (!project) return;

  const allF          = project.sprints.flatMap(s => s.features);
  const done          = allF.filter(f => f.status === "DONE").length;
  const blocked       = allF.filter(f => f.status === "BLOCKED").length;
  const inProgress    = allF.filter(f => f.status === "IN_PROGRESS").length;
  const costActual    = project.assignments.reduce((s, a) => s + a.actualHours    * a.resource.costPerHour, 0);
  const costEstimated = project.assignments.reduce((s, a) => s + a.estimatedHours * a.resource.costPerHour, 0);
  const openRisks     = project.risks.filter(r => r.status === "OPEN").length;
  const highRisks     = project.risks.filter(r => r.status === "OPEN" && r.probability * r.impact >= 9).length;
  const maxRiskScore  = project.risks.filter(r => r.status === "OPEN")
    .reduce((m, r) => Math.max(m, r.probability * r.impact), 0);

  const h = calculateHealth({
    startDate: project.startDate,
    endDate:   project.endDate,
    totalFeatures:      allF.length,
    doneFeatures:       done,
    blockedFeatures:    blocked,
    inProgressFeatures: inProgress,
    totalSprints:  project.sprints.length,
    doneSprints:   project.sprints.filter(s => s.status === "DONE").length,
    activeSprints: project.sprints.filter(s => s.status === "ACTIVE").length,
    budgetTotal:   project.budgetTotal,
    costActual,
    costEstimated,
    totalCapacityHours: project.assignments.reduce((s, a) => s + a.resource.capacityHours, 0),
    totalActualHours:   project.assignments.reduce((s, a) => s + a.actualHours, 0),
    openRisks,
    highRisks,
    maxRiskScore,
  });

  await db.project.update({
    where: { id: projectId },
    data:  { healthScore: h.healthScore },
  });
}

// ── Agent: EVM Calculator ─────────────────────────────────────────────────────

async function runEvmCalculator(projectId: string): Promise<void> {
  const project = await db.project.findUnique({
    where: { id: projectId },
    include: {
      sprints:     { include: { features: true } },
      assignments: { include: { resource: true } },
    },
  });
  if (!project) return;

  const orgId  = project.organisationId;
  const allF   = project.sprints.flatMap(s => s.features);
  const done   = allF.filter(f => f.status === "DONE").length;
  const pct    = allF.length ? done / allF.length : 0;
  const bac    = project.budgetTotal;
  const ac     = project.assignments.reduce((s, a) => s + a.actualHours * a.resource.costPerHour, 0);
  const span   = Math.max(1, new Date(project.endDate).getTime() - new Date(project.startDate).getTime());
  const pv     = bac * Math.min(1, Math.max(0, (Date.now() - new Date(project.startDate).getTime()) / span));
  const ev     = bac * pct;
  const cpi    = ac > 0 ? ev / ac : 1;
  const spi    = pv > 0 ? ev / pv : 1;
  const eac    = bac > 0 && cpi > 0 ? bac / cpi : bac;

  if (bac > 0 && (cpi < 0.85 || spi < 0.85)) {
    const dedup = await db.alert.findFirst({
      where: {
        projectId,
        type:      "spi_critical",
        resolved:  false,
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
    });
    if (!dedup) {
      await db.alert.create({
        data: {
          organisationId: orgId,
          projectId,
          type:               "spi_critical",
          level:              cpi < 0.7 || spi < 0.7 ? "critical" : "warning",
          title:              `EVM alert: ${project.name}`,
          detail:             `CPI ${cpi.toFixed(2)} · SPI ${spi.toFixed(2)} · EAC $${Math.round(eac).toLocaleString()}`,
          requiresValidation: cpi < 0.7,
        },
      });
    }
  }
}

// ── Agent: Risk Scanner ───────────────────────────────────────────────────────

async function runRiskScanner(projectId: string): Promise<void> {
  const project = await db.project.findUnique({
    where: { id: projectId },
    include: {
      sprints: { include: { features: true } },
      risks:   { where: { status: "OPEN" } },
    },
  });
  if (!project) return;

  const orgId    = project.organisationId;
  const daysLeft = Math.ceil((new Date(project.endDate).getTime() - Date.now()) / 86400000);
  const allF     = project.sprints.flatMap(s => s.features);
  const blocked  = allF.filter(f => f.status === "BLOCKED").length;

  for (const risk of project.risks.filter(r => r.probability * r.impact >= 9)) {
    const dedup = await db.alert.findFirst({
      where: {
        projectId,
        type:      "at_risk",
        resolved:  false,
        detail:    { contains: risk.id },
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
    });
    if (!dedup) {
      await db.alert.create({
        data: {
          organisationId: orgId,
          projectId,
          type:               "at_risk",
          level:              "critical",
          title:              `High risk: ${risk.title}`,
          detail:             `Score ${risk.probability * risk.impact}/25 · ${risk.description ?? ""} [${risk.id}]`,
          requiresValidation: true,
        },
      });
    }
  }

  if (blocked >= 3) {
    const dedup = await db.alert.findFirst({
      where: {
        projectId,
        type:      "blocked",
        resolved:  false,
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
    });
    if (!dedup) {
      await db.alert.create({
        data: {
          organisationId: orgId,
          projectId,
          type:   "blocked",
          level:  "warning",
          title:  `${blocked} features blocked in ${project.name}`,
          detail: `Sprint velocity at risk · ${daysLeft}d remaining`,
        },
      });
    }
  }
}

// ── Agent: Alert Generator ────────────────────────────────────────────────────

async function runAlertGenerator(projectId: string): Promise<void> {
  const project = await db.project.findUnique({
    where: { id: projectId },
    include: { sprints: { include: { features: true } } },
  });
  if (!project) return;

  const orgId    = project.organisationId;
  const allF     = project.sprints.flatMap(s => s.features);
  const done     = allF.filter(f => f.status === "DONE").length;
  const pct      = allF.length ? Math.round((done / allF.length) * 100) : 0;
  const daysLeft = Math.ceil((new Date(project.endDate).getTime() - Date.now()) / 86400000);

  if (daysLeft < 0 && pct < 100) {
    const dedup = await db.alert.findFirst({
      where: { projectId, type: "overdue", resolved: false },
    });
    if (!dedup) {
      await db.alert.create({
        data: {
          organisationId:     orgId,
          projectId,
          type:               "overdue",
          level:              "critical",
          title:              `${project.name} is overdue`,
          detail:             `${Math.abs(daysLeft)}d past deadline at ${pct}% completion`,
          requiresValidation: true,
        },
      });
    }
  }

  if (daysLeft >= 0 && daysLeft <= 7 && pct < 80) {
    const dedup = await db.alert.findFirst({
      where: {
        projectId,
        type:      "milestone",
        resolved:  false,
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
    });
    if (!dedup) {
      await db.alert.create({
        data: {
          organisationId: orgId,
          projectId,
          type:   "milestone",
          level:  "warning",
          title:  `${project.name} deadline in ${daysLeft}d`,
          detail: `${pct}% complete — at risk of delay`,
        },
      });
    }
  }
}

// ── Agent: Dependency Monitor ─────────────────────────────────────────────────

async function runDependencyMonitor(projectId: string): Promise<void> {
  const project = await db.project.findUnique({
    where: { id: projectId },
    include: {
      dependsOn: { include: { dependsOn: true } },
      sprints:   { include: { features: { include: { blockedBy: { include: { blocker: true } } } } } },
    },
  });
  if (!project) return;

  const orgId             = project.organisationId;
  const blockedByProjects = project.dependsOn.filter(d => d.dependsOn.status !== "COMPLETED");

  if (blockedByProjects.length > 0) {
    const dedup = await db.alert.findFirst({
      where: {
        projectId,
        type:      "blocked",
        resolved:  false,
        title:     { contains: "dependency" },
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
    });
    if (!dedup) {
      await db.alert.create({
        data: {
          organisationId: orgId,
          projectId,
          type:   "blocked",
          level:  "warning",
          title:  `${project.name} blocked by ${blockedByProjects.length} project dependency`,
          detail: blockedByProjects.map(d => d.dependsOn.name).join(", ") + " not yet completed",
        },
      });
    }
  }

  const featuresBlockedByDeps = project.sprints
    .flatMap(s => s.features)
    .filter(f => f.blockedBy.some(dep => dep.blocker.status !== "DONE"));

  if (featuresBlockedByDeps.length >= 3) {
    const dedup = await db.alert.findFirst({
      where: {
        projectId,
        type:      "blocked",
        resolved:  false,
        title:     { contains: "blocked by dependencies" },
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
    });
    if (!dedup) {
      await db.alert.create({
        data: {
          organisationId: orgId,
          projectId,
          type:   "blocked",
          level:  "warning",
          title:  `${featuresBlockedByDeps.length} features blocked by dependencies in ${project.name}`,
          detail: "Unresolved feature dependencies blocking sprint progress",
        },
      });
    }
  }
}

// ── Agent: Full project setup (new project) ───────────────────────────────────

async function runFullProjectSetup(projectId: string): Promise<void> {
  await Promise.allSettled([
    runHealthScore(projectId),
    runAlertGenerator(projectId),
  ]);
}

// ── Agent: Daily sweep (all active projects in org) ───────────────────────────

async function runDailySweep(orgId: string): Promise<void> {
  const { runFullGuardianAnalysis } = await import("@/lib/guardian-pm");

  const projects = await db.project.findMany({
    where:  { organisationId: orgId, status: { notIn: ["CLOSED", "ARCHIVED"] } },
    select: { id: true },
  });

  for (const project of projects) {
    await Promise.allSettled([
      runHealthScore(project.id),
      runEvmCalculator(project.id),
      runRiskScanner(project.id),
      runAlertGenerator(project.id),
      runDependencyMonitor(project.id),
      runFullGuardianAnalysis(project.id, orgId),
      runForecastAgent({ projectId: project.id, orgId }),
      runDependencyAgent({ projectId: project.id, orgId }),
    ]);
  }
}
