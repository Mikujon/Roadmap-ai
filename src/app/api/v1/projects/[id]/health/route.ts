import { NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { getApiAuth } from "@/middleware/api-auth";
import { computeEvm, DB_PROJECT_INCLUDE, type ProjectRow } from "../../../_lib";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getApiAuth(req);
  if (!auth.valid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const p = await db.project.findFirst({
    where:   { id, organisationId: auth.orgId },
    include: DB_PROJECT_INCLUDE,
  }) as unknown as ProjectRow | null;

  if (!p) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const h = computeEvm(p);

  return NextResponse.json({
    healthScore:     h.healthScore,
    status:          h.status,
    spi:             h.spi,
    cpi:             h.cpi,
    eac:             h.eac,
    etc:             h.etc,
    vac:             h.vac,
    progress:        h.progressNominal,
    plannedProgress: h.plannedPct,
    daysLeft:        h.daysLeft,
    delayDays:       h.delayDays,
    alerts:          h.alerts,
  });
}
