import { NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { getApiAuth } from "@/middleware/api-auth";
import { computeEvm, DB_PROJECT_INCLUDE, type ProjectRow } from "../../_lib";

type DashRole = "PMO" | "CEO" | "STK" | "DEV";
const VALID_ROLES: DashRole[] = ["PMO", "CEO", "STK", "DEV"];

export async function GET(
  req: Request,
  { params }: { params: Promise<{ role: string }> }
) {
  const auth = await getApiAuth(req);
  if (!auth.valid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { role } = await params;
  const dashRole = role.toUpperCase() as DashRole;
  if (!VALID_ROLES.includes(dashRole))
    return NextResponse.json({ error: `Invalid role. Must be one of: ${VALID_ROLES.join(", ")}` }, { status: 400 });

  const projects = await db.project.findMany({
    where:   { organisationId: auth.orgId, status: { notIn: ["ARCHIVED", "CLOSED"] } },
    include: DB_PROJECT_INCLUDE,
    orderBy: { updatedAt: "desc" },
  }) as unknown as ProjectRow[];

  const now = new Date();

  const projectsWithMetrics = projects.map(p => ({ p, h: computeEvm(p) }));

  if (dashRole === "PMO") {
    const alerts = await db.alert.findMany({
      where:   { organisationId: auth.orgId, resolved: false },
      orderBy: { createdAt: "desc" },
      take:    20,
    });

    const projectHealth = projectsWithMetrics.map(({ p, h }) => ({
      id:          p.id,
      name:        p.name,
      healthScore: h.healthScore,
      status:      h.status,
      spi:         h.spi,
      cpi:         h.cpi,
      daysLeft:    h.daysLeft,
      openRisks:   h.openRisksCount,
    }));

    const upcomingDeadlines = projects
      .filter(p => p.endDate >= now)
      .sort((a, b) => a.endDate.getTime() - b.endDate.getTime())
      .slice(0, 5)
      .map(p => ({
        projectId:   p.id,
        projectName: p.name,
        endDate:     p.endDate.toISOString(),
        daysLeft:    Math.ceil((p.endDate.getTime() - now.getTime()) / 86400000),
      }));

    return NextResponse.json({
      decisions:         alerts.filter(a => a.requiresValidation).slice(0, 5).map(a => ({ id: a.id, title: a.title, detail: a.detail, level: a.level, createdAt: a.createdAt.toISOString() })),
      approvals:         alerts.filter(a => a.level === "critical" && !a.read).slice(0, 5).map(a => ({ id: a.id, title: a.title, projectId: a.projectId })),
      projectHealth,
      upcomingDeadlines,
      meta: { role: "PMO", generatedAt: now.toISOString() },
    });
  }

  if (dashRole === "CEO") {
    const totalBudget       = projects.reduce((s, p) => s + p.budgetTotal, 0);
    const totalSpent        = projectsWithMetrics.reduce((s, { h }) => s + h.costActual, 0);
    const totalForecast     = projectsWithMetrics.reduce((s, { h }) => s + h.costForecast, 0);
    const totalRevenue      = projects.reduce((s, p) => s + p.revenueExpected, 0);
    const portfolioScore    = projectsWithMetrics.length > 0
      ? Math.round(projectsWithMetrics.reduce((s, { h }) => s + h.healthScore, 0) / projectsWithMetrics.length)
      : 100;
    const onTimeProbability = projectsWithMetrics.length > 0
      ? Math.round(projectsWithMetrics.reduce((s, { h }) => s + h.onTrackProbability, 0) / projectsWithMetrics.length)
      : 100;
    const budgetExposure    = totalForecast - totalBudget;

    const criticalAlerts = await db.alert.findMany({
      where:   { organisationId: auth.orgId, level: "critical", resolved: false },
      orderBy: { createdAt: "desc" },
      take:    5,
    });

    return NextResponse.json({
      portfolioScore,
      budgetExposure,
      onTimeProbability,
      revenueVsCost: { revenue: totalRevenue, cost: totalSpent, forecast: totalForecast, budget: totalBudget },
      criticalDecisions: criticalAlerts.map(a => ({ id: a.id, title: a.title, detail: a.detail, projectId: a.projectId, createdAt: a.createdAt.toISOString() })),
      meta: { role: "CEO", generatedAt: now.toISOString() },
    });
  }

  if (dashRole === "STK") {
    const myProjects = projectsWithMetrics.map(({ p, h }) => ({
      id:          p.id,
      name:        p.name,
      status:      p.status,
      healthScore: h.healthScore,
      progress:    h.progressNominal,
      daysLeft:    h.daysLeft,
      budget:      { total: p.budgetTotal, spent: h.costActual },
    }));

    const nextMilestones = projects
      .filter(p => p.endDate >= now)
      .sort((a, b) => a.endDate.getTime() - b.endDate.getTime())
      .slice(0, 5)
      .map(p => ({
        projectId:   p.id,
        projectName: p.name,
        date:        p.endDate.toISOString(),
        daysLeft:    Math.ceil((p.endDate.getTime() - now.getTime()) / 86400000),
        type:        "deadline",
      }));

    const pendingInvitations = await db.invitation.findMany({
      where:   { organisationId: auth.orgId, status: "PENDING" },
      orderBy: { createdAt: "desc" },
      take:    10,
    });

    return NextResponse.json({
      myProjects,
      nextMilestones,
      pendingRequests: pendingInvitations.map(i => ({ id: i.id, email: i.email, role: i.role, expiresAt: i.expiresAt.toISOString() })),
      meta: { role: "STK", generatedAt: now.toISOString() },
    });
  }

  // DEV
  const activeSprintFeatures = projects.flatMap(p => {
    const activeSprint = p.sprints.find(s => s.status === "ACTIVE");
    if (!activeSprint) return [];
    return activeSprint.features.map(f => ({
      id:          (f as any).id as string,
      title:       f.title,
      status:      f.status,
      priority:    f.priority,
      projectId:   p.id,
      projectName: p.name,
      sprintName:  activeSprint.name,
    }));
  });

  const myTasks      = activeSprintFeatures.filter(f => f.status !== "DONE");
  const blockedTasks = activeSprintFeatures.filter(f => f.status === "BLOCKED");

  const totalSprintFeats  = activeSprintFeatures.length;
  const doneSprintFeats   = activeSprintFeatures.filter(f => f.status === "DONE").length;
  const sprintProgress    = totalSprintFeats > 0 ? Math.round((doneSprintFeats / totalSprintFeats) * 100) : 0;

  return NextResponse.json({
    myTasks:       myTasks.slice(0, 20),
    sprintProgress: { progress: sprintProgress, total: totalSprintFeats, done: doneSprintFeats, blocked: blockedTasks.length },
    blockedTasks,
    meta: { role: "DEV", generatedAt: now.toISOString() },
  });
}
