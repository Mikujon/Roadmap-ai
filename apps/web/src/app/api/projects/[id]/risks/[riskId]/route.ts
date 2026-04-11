import { NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { getAuthContext } from "@/lib/auth";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { triggerGuardian } from "@/lib/guardian-trigger";

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

  // Invalidate Guardian cache and pages
  await db.guardianReport.deleteMany({ where: { projectId: id } });
  revalidatePath("/dashboard");
  revalidatePath("/portfolio");
  

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

  await db.guardianReport.deleteMany({ where: { projectId: id } });
  revalidatePath("/dashboard");
  revalidatePath("/portfolio");
  triggerGuardian(id);

  return NextResponse.json({ ok: true });
}