import { NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { getAuthContext } from "@/lib/auth";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { emit } from "@roadmap/events";
import { scoreRisk, classifyRiskScore } from "@roadmap/engines/risk";

const UpdateRiskSchema = z.object({
  status:      z.enum(["OPEN", "MITIGATED", "CLOSED"]).optional(),
  mitigation:  z.string().optional(),
  probability: z.number().min(1).max(5).optional(),
  impact:      z.number().min(1).max(5).optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; riskId: string }> }
) {
  const { id, riskId } = await params;
  const ctx = await getAuthContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const existing = await db.risk.findFirst({
    where: { id: riskId, projectId: id },
    include: { project: true },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (existing.project.organisationId !== ctx.org.id)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = UpdateRiskSchema.parse(await req.json());

  const risk = await db.risk.update({
    where: { id: riskId },
    data: {
      ...(body.status      !== undefined && { status:      body.status }),
      ...(body.mitigation  !== undefined && { mitigation:  body.mitigation }),
      ...(body.probability !== undefined && { probability: body.probability }),
      ...(body.impact      !== undefined && { impact:      body.impact }),
    },
  });

  revalidatePath("/dashboard");
  revalidatePath("/portfolio");

  // Emit domain event — outbox poller dispatches Guardian job
  const statusChanged = body.status && body.status !== existing.status;
  if (statusChanged) {
    const score    = scoreRisk({ probability: risk.probability, impact: risk.impact, status: risk.status });
    const severity = classifyRiskScore(score.score);
    const eventType = body.status === "MITIGATED" ? "risk.mitigated"
                    : body.status === "CLOSED"    ? "risk.closed"
                    : "risk.opened";

    await emit(db as any, {
      type:          eventType,
      aggregateType: "risk",
      aggregateId:   riskId,
      organisationId: ctx.org.id,
      projectId:     id,
      actorId:       ctx.user.id,
      actorName:     ctx.user.name ?? ctx.user.email,
      payload: eventType === "risk.mitigated"
        ? { riskId, riskTitle: existing.title, mitigation: body.mitigation ?? "" }
        : eventType === "risk.closed"
        ? { riskId, riskTitle: existing.title }
        : { riskId, riskTitle: existing.title, probability: risk.probability, impact: risk.impact, score: score.score, severity },
    } as any);
  }

  return NextResponse.json(risk);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; riskId: string }> }
) {
  const { id, riskId } = await params;
  const ctx = await getAuthContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const existing = await db.risk.findFirst({
    where: { id: riskId, projectId: id },
    include: { project: true },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (existing.project.organisationId !== ctx.org.id)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await db.risk.delete({ where: { id: riskId } });

  revalidatePath("/dashboard");
  revalidatePath("/portfolio");

  await emit(db as any, {
    type:          "risk.closed",
    aggregateType: "risk",
    aggregateId:   riskId,
    organisationId: ctx.org.id,
    projectId:     id,
    actorId:       ctx.user.id,
    actorName:     ctx.user.name ?? ctx.user.email,
    payload:       { riskId, riskTitle: existing.title },
  });

  return NextResponse.json({ ok: true });
}
