import { NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { getAuthContext } from "@/lib/auth";

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

export async function POST(req: Request) {
  try {
    const ctx = await getAuthContext();
    if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    console.log("[POST /api/projects] Creating project:", body.name);

    const parseAmount = (v: unknown) => {
      const n = parseFloat(String(v ?? "").replace(/[^0-9.]/g, ""));
      return isNaN(n) ? 0 : n;
    };

    const project = await db.project.create({
      data: {
        name:            body.name || "New Project",
        description:     body.brief || body.description || "",
        briefText:       body.brief || null,
        startDate:       new Date(body.startDate),
        endDate:         new Date(body.endDate),
        budgetTotal:     parseAmount(body.budgetTotal),
        revenueExpected: parseAmount(body.revenueExpected),
        status:          "NOT_STARTED",
        organisationId:  ctx.org.id,
      },
    });

    // Create phases if provided
    if (Array.isArray(body.phases) && body.phases.length > 0) {
      await db.phase.createMany({
        data: body.phases.map((ph: { title: string; duration: string; desc: string }, i: number) => ({
          num:       i + 1,
          label:     ph.title || `Phase ${i + 1}`,
          sub:       ph.duration || null,
          order:     i,
          projectId: project.id,
        })),
      });
    }

    console.log("[POST /api/projects] Created project:", project.id);
    return NextResponse.json({ project });
  } catch (error) {
    console.error("[POST /api/projects] Error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}