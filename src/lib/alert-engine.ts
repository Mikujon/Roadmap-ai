// ── Alert Engine ──────────────────────────────────────────────────────────
// Checks all active projects and creates alerts based on health metrics
// Called by cron job or manually triggered

import { db } from "./prisma";
import { calculateHealth } from "./health";
import { Resend } from "resend";

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

const resend = new Resend(process.env.RESEND_API_KEY);

// Check if same alert type was sent in last 24h
async function wasRecentlySent(projectId: string, type: string, hours = 24): Promise<boolean> {
  const since = new Date(Date.now() - hours * 60 * 60 * 1000);
  const existing = await db.alert.findFirst({
    where: { projectId, type, createdAt: { gte: since } },
  });
  return !!existing;
}

export async function runHealthCheck(organisationId: string, sendEmails = false) {
  const projects = await db.project.findMany({
    where: {
      organisationId,
      status: { notIn: ["CLOSED", "ARCHIVED", "COMPLETED"] },
    },
    include: {
      sprints:     { include: { features: true } },
      assignments: { include: { resource: true } },
      risks:       true,
    },
  });

  const createdAlerts: any[] = [];

  for (const project of projects) {
    const allF       = project.sprints.flatMap(s => s.features);
    const done       = allF.filter(f => f.status === "DONE").length;
    const blocked    = allF.filter(f => f.status === "BLOCKED").length;
    const inProgress = allF.filter(f => f.status === "IN_PROGRESS").length;
    const costActual = project.assignments.reduce((s, a) => s + a.actualHours * a.resource.costPerHour, 0);
    const costEst    = project.assignments.reduce((s, a) => s + a.estimatedHours * a.resource.costPerHour, 0);
    const openRisks  = project.risks.filter(r => r.status === "OPEN");
    const highRisks  = project.risks.filter(r => r.status === "OPEN" && r.probability * r.impact >= 9);
    const maxRisk    = openRisks.length > 0 ? Math.max(...openRisks.map(r => r.probability * r.impact)) : 0;

    const h = calculateHealth({
      startDate: project.startDate, endDate: project.endDate,
      totalFeatures: allF.length, doneFeatures: done,
      blockedFeatures: blocked, inProgressFeatures: inProgress,
      totalSprints: project.sprints.length,
      doneSprints: project.sprints.filter(s => s.status === "DONE").length,
      activeSprints: project.sprints.filter(s => s.status === "ACTIVE").length,
      budgetTotal: project.budgetTotal, costActual, costEstimated: costEst,
      totalCapacityHours: project.assignments.reduce((s, a) => s + a.resource.capacityHours, 0),
      totalActualHours: project.assignments.reduce((s, a) => s + a.actualHours, 0),
      openRisks: openRisks.length, highRisks: highRisks.length, maxRiskScore: maxRisk,
    });

    const alertsToCreate: { type: string; level: string; title: string; detail: string; action: string }[] = [];

    // 1. Project overdue
    if (h.daysLeft < 0 && h.progressNominal < 100) {
      if (!await wasRecentlySent(project.id, "overdue")) {
        alertsToCreate.push({
          type: "overdue", level: "critical",
          title: `${project.name} is overdue`,
          detail: `Deadline was ${Math.abs(h.daysLeft)} days ago with ${100 - h.progressNominal}% work remaining.`,
          action: "Renegotiate deadline or reduce scope immediately.",
        });
      }
    }

    // 2. Critical SPI
    if (h.spi < 0.5) {
      if (!await wasRecentlySent(project.id, "spi_critical")) {
        alertsToCreate.push({
          type: "spi_critical", level: "critical",
          title: `${project.name} — Critical schedule deviation (SPI: ${h.spi.toFixed(2)})`,
          detail: `Only ${h.progressNominal}% complete vs ${h.plannedPct}% planned. Project severely behind.`,
          action: "Emergency scope review required. Consider project reset.",
        });
      }
    }

    // 3. At Risk SPI
    else if (h.spi < 0.8 && h.spi >= 0.5) {
      if (!await wasRecentlySent(project.id, "spi_warning", 48)) {
        alertsToCreate.push({
          type: "spi_warning", level: "warning",
          title: `${project.name} — Behind schedule (SPI: ${h.spi.toFixed(2)})`,
          detail: `${h.progressNominal}% done vs ${h.plannedPct}% planned. Schedule gap: ${Math.abs(h.scheduleGap)}pp.`,
          action: "Review sprint velocity and remove blockers.",
        });
      }
    }

    // 4. Budget critical
    if (h.cpi < 0.7 && project.budgetTotal > 0) {
      if (!await wasRecentlySent(project.id, "budget_critical")) {
        alertsToCreate.push({
          type: "budget_critical", level: "critical",
          title: `${project.name} — Critical budget overrun (CPI: ${h.cpi.toFixed(2)})`,
          detail: `EAC: $${Math.round(h.eac).toLocaleString()} vs BAC: $${Math.round(h.bac).toLocaleString()}.`,
          action: "Freeze spending. Escalate to finance immediately.",
        });
      }
    }

    // 5. Team blocked
    if (blocked >= 3) {
      if (!await wasRecentlySent(project.id, "team_blocked", 12)) {
        alertsToCreate.push({
          type: "team_blocked", level: "critical",
          title: `${project.name} — ${blocked} features blocked`,
          detail: `Multiple blocked features are reducing sprint velocity and SPI.`,
          action: "Hold emergency dependency review. Assign owners to each blocker.",
        });
      }
    }

    // 6. Milestone approaching — sprint ending in 2 days with < 80% done
    for (const sprint of project.sprints) {
      if (sprint.status !== "ACTIVE" || !sprint.endDate) continue;
      const daysToEnd = Math.ceil((new Date(sprint.endDate).getTime() - Date.now()) / 86400000);
      const sprintDone = sprint.features.filter(f => f.status === "DONE").length;
      const sprintPct  = sprint.features.length > 0 ? (sprintDone / sprint.features.length) * 100 : 100;
      if (daysToEnd <= 2 && daysToEnd >= 0 && sprintPct < 80) {
        const alertType = `milestone_${sprint.id}`;
        if (!await wasRecentlySent(project.id, alertType, 24)) {
          alertsToCreate.push({
            type: alertType, level: "warning",
            title: `${project.name} — Sprint ending in ${daysToEnd}d with ${Math.round(sprintPct)}% done`,
            detail: `Sprint "${sprint.name}" ends in ${daysToEnd} day${daysToEnd !== 1 ? "s" : ""} but only ${Math.round(sprintPct)}% complete.`,
            action: "Focus team on completing sprint tasks or negotiate scope.",
          });
        }
      }
    }

    // Create alerts in DB
    for (const alert of alertsToCreate) {
      const created = await db.alert.create({
        data: {
          organisationId,
          projectId: project.id,
          type:      alert.type,
          level:     alert.level,
          title:     alert.title,
          detail:    alert.detail,
          action:    alert.action,
          emailSent: false,
        },
      });
      createdAlerts.push({ ...created, projectName: project.name });
    }
  }

  return { checked: projects.length, alerts: createdAlerts };
}

export async function sendAlertEmails(organisationId: string, userEmail: string) {
  const unsentAlerts = await db.alert.findMany({
    where:   { organisationId, emailSent: false, level: "critical" },
    include: { project: { select: { name: true, id: true } } },
    orderBy: { createdAt: "desc" },
    take:    10,
  });

  if (unsentAlerts.length === 0) return { sent: 0 };

  try {
    await resend.emails.send({
      from:    "RoadmapAI Guardian <noreply@roadmapai.com>",
      to:      userEmail,
      subject: `${unsentAlerts.length} critical alert${unsentAlerts.length > 1 ? "s" : ""} across your portfolio`,
      html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#F0F2F5;font-family:'Segoe UI',Arial,sans-serif;">
  <div style="max-width:600px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
    <div style="background:linear-gradient(135deg,#DC2626,#991B1B);padding:28px 36px;">
      <div style="color:rgba(255,255,255,0.8);font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:4px;">AI Guardian — Portfolio Alert</div>
      <h1 style="color:#fff;font-size:20px;font-weight:800;margin:0;">${unsentAlerts.length} Critical Issue${unsentAlerts.length > 1 ? "s" : ""} Detected</h1>
    </div>
    <div style="padding:28px 36px;">
      ${unsentAlerts.map(a => `
      <div style="background:#FEF2F2;border:1px solid #FECACA;border-radius:10px;padding:14px 16px;margin-bottom:12px;">
        <div style="font-size:11px;color:#94A3B8;font-weight:600;margin-bottom:4px;">${escapeHtml(a.project?.name ?? "Portfolio")}</div>
        <div style="font-size:13px;font-weight:700;color:#0F172A;margin-bottom:4px;">&#9888; ${escapeHtml(a.title)}</div>
        <div style="font-size:12px;color:#64748B;margin-bottom:6px;">${escapeHtml(a.detail)}</div>
        <div style="font-size:12px;color:#DC2626;font-weight:600;">&rarr; ${escapeHtml(a.action ?? "")}</div>
        ${a.project ? `<a href="${process.env.NEXT_PUBLIC_APP_URL}/projects/${escapeHtml(a.project.id)}" style="display:inline-block;margin-top:8px;font-size:11px;color:#006D6B;font-weight:600;text-decoration:none;">View project &rarr;</a>` : ""}
      </div>`).join("")}
      <div style="text-align:center;margin-top:24px;">
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/portfolio" style="display:inline-block;background:#006D6B;color:#fff;text-decoration:none;padding:12px 28px;border-radius:10px;font-weight:700;font-size:14px;">
          View Portfolio &rarr;
        </a>
      </div>
    </div>
    <div style="padding:14px 36px;background:#F8FAFC;border-top:1px solid #E2E8F0;text-align:center;">
      <p style="font-size:11px;color:#94A3B8;margin:0;">RoadmapAI Guardian · Automated PMO Alert System</p>
    </div>
  </div>
</body>
</html>`,
    });
  } catch (err) {
    console.error("[alert-engine] Failed to send email to", userEmail, err);
    return { sent: 0 };
  }

  // Mark as sent only after confirmed delivery
  await db.alert.updateMany({
    where: { id: { in: unsentAlerts.map(a => a.id) } },
    data:  { emailSent: true },
  });

  return { sent: unsentAlerts.length };
}