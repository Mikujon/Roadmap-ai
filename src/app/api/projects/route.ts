import { NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { getAuthContext } from "@/lib/auth";
import { triggerAgents } from "@/lib/agent-triggers";

export async function POST(req: Request) {
  const ctx = await getAuthContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as {
    name: string;
    brief?: string;
    startDate: string;
    endDate: string;
    budgetTotal?: number | string;
    revenueExpected?: number | string;
    phases?: { title: string; duration: string; desc: string }[];
  };

  const { name, brief, startDate, endDate, budgetTotal, revenueExpected, phases } = body;

  if (!name?.trim()) return NextResponse.json({ error: "name is required" }, { status: 400 });
  if (!startDate || !endDate) return NextResponse.json({ error: "startDate and endDate are required" }, { status: 400 });

  const project = await db.project.create({
    data: {
      name:            name.trim(),
      briefText:       brief ?? null,
      description:     brief ?? null,
      startDate:       new Date(startDate),
      endDate:         new Date(endDate),
      budgetTotal:     Number(budgetTotal) || 0,
      revenueExpected: Number(revenueExpected) || 0,
      organisationId:  ctx.org.id,
      requestedById:   ctx.user.id,
      phases: phases?.length
        ? {
            create: phases.map((ph, i) => ({
              num:   i + 1,
              label: ph.title || `Phase ${i + 1}`,
              sub:   ph.desc  || null,
              order: i,
            })),
          }
        : undefined,
    },
  });

  // Fire agents in background — don't block the response
  triggerAgents("project_created", project.id, ctx.org.id);

  return NextResponse.json({ project });
}

export async function GET() {
  const ctx = await getAuthContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const projects = await db.project.findMany({
    where: { organisationId: ctx.org.id },
    include: {
      phases: { orderBy: { order: "asc" } },
      sprints: { include: { features: true } },
      _count: { select: { sprints: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json(projects);
}