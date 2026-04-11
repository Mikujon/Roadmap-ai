import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";
import { db } from "@/lib/prisma";
import { Resend } from "resend";
import { calculateHealth } from "@/lib/health";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  const ctx = await getAuthContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { projectId } = await req.json();

  const project = await db.project.findFirst({
    where: { id: projectId, organisationId: ctx.org.id },
    include: {
      sprints: { include: { features: true } },
      assignments: { include: { resource: true } },
      risks: true,
    },
  });
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

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

  // Only send if critical issues
  const criticalAlerts = h.alerts.filter(a => a.level === "critical");
  if (criticalAlerts.length === 0) {
    return NextResponse.json({ ok: true, message: "No critical alerts — email not sent" });
  }

  const userEmail = ctx.user?.email;
  if (!userEmail) return NextResponse.json({ error: "No user email" }, { status: 400 });

  const scoreColor = h.healthScore >= 60 ? "#D97706" : "#DC2626";

  await resend.emails.send({
    from: "RoadmapAI Guardian <noreply@roadmapai.com>",
    to:   userEmail,
    subject: `🚨 ${project.name} needs attention — ${criticalAlerts.length} critical issue${criticalAlerts.length > 1 ? "s" : ""}`,
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#F0F2F5;font-family:'Segoe UI',Arial,sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
    <div style="background:linear-gradient(135deg,#DC2626,#991B1B);padding:28px 36px;display:flex;align-items:center;gap:16px;">
      <div style="width:44px;height:44px;background:rgba(255,255,255,0.2);border-radius:10px;display:inline-flex;align-items:center;justify-content:center;font-weight:800;font-size:16px;color:#fff;">RM</div>
      <div>
        <div style="color:rgba(255,255,255,0.8);font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:2px;">AI Guardian Alert</div>
        <h1 style="color:#fff;font-size:18px;font-weight:800;margin:0;">${project.name}</h1>
      </div>
      <div style="margin-left:auto;text-align:center;">
        <div style="font-size:32px;font-weight:900;color:#fff;line-height:1;">${h.healthScore}</div>
        <div style="font-size:10px;color:rgba(255,255,255,0.7);font-weight:600;">HEALTH SCORE</div>
      </div>
    </div>
    <div style="padding:28px 36px;">
      <p style="font-size:14px;color:#64748B;margin:0 0 20px;line-height:1.6;">
        The AI Guardian has detected <strong style="color:#DC2626;">${criticalAlerts.length} critical issue${criticalAlerts.length > 1 ? "s" : ""}</strong> requiring immediate attention.
      </p>
      ${criticalAlerts.map(a => `
      <div style="background:#FEF2F2;border:1px solid #FECACA;border-radius:10px;padding:14px 16px;margin-bottom:10px;">
        <div style="font-size:13px;font-weight:700;color:#0F172A;margin-bottom:4px;">⚠ ${a.title}</div>
        <div style="font-size:12px;color:#64748B;margin-bottom:6px;">${a.detail}</div>
        <div style="font-size:12px;color:#DC2626;font-weight:600;">→ ${a.action}</div>
      </div>`).join("")}
      <div style="margin-top:24px;padding:14px 16px;background:#F8FAFC;border-radius:10px;display:flex;gap:24px;">
        <div><div style="font-size:10px;color:#94A3B8;font-weight:700;text-transform:uppercase;margin-bottom:3px;">Progress</div><div style="font-size:16px;font-weight:800;color:#0F172A;">${h.progressNominal}%</div></div>
        <div><div style="font-size:10px;color:#94A3B8;font-weight:700;text-transform:uppercase;margin-bottom:3px;">SPI</div><div style="font-size:16px;font-weight:800;color:${h.spi >= 0.9 ? '#059669' : '#DC2626'};">${h.spi.toFixed(2)}</div></div>
        <div><div style="font-size:10px;color:#94A3B8;font-weight:700;text-transform:uppercase;margin-bottom:3px;">Days Left</div><div style="font-size:16px;font-weight:800;color:${h.daysLeft < 0 ? '#DC2626' : '#0F172A'};">${h.daysLeft < 0 ? Math.abs(h.daysLeft) + 'd late' : h.daysLeft + 'd'}</div></div>
        <div><div style="font-size:10px;color:#94A3B8;font-weight:700;text-transform:uppercase;margin-bottom:3px;">On-Time Prob.</div><div style="font-size:16px;font-weight:800;color:#DC2626;">${h.onTrackProbability}%</div></div>
      </div>
      <div style="text-align:center;margin-top:24px;">
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/projects/${project.id}" style="display:inline-block;background:#006D6B;color:#fff;text-decoration:none;padding:12px 28px;border-radius:10px;font-weight:700;font-size:14px;">
          View Project →
        </a>
      </div>
    </div>
    <div style="padding:14px 36px;background:#F8FAFC;border-top:1px solid #E2E8F0;text-align:center;">
      <p style="font-size:11px;color:#94A3B8;margin:0;">RoadmapAI Guardian · Automated PMO Alert</p>
    </div>
  </div>
</body>
</html>`,
  });

  return NextResponse.json({ ok: true, alertsSent: criticalAlerts.length });
}