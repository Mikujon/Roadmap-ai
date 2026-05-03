import { NextRequest } from "next/server";
import { orchestrate } from "@/lib/orchestrator";
import { db } from "@/lib/prisma";

// Called by Vercel Cron at 08:00 UTC daily (see vercel.json)
// Also callable manually: curl -H "Authorization: Bearer $CRON_SECRET" /api/cron/daily
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const projects = await db.project.findMany({
    where:  { status: { notIn: ["CLOSED", "ARCHIVED"] } },
    select: { id: true, organisationId: true },
  });

  for (const project of projects) {
    orchestrate("daily_sweep", project.id, project.organisationId);
  }

  return Response.json({ ok: true, projectsProcessed: projects.length, triggeredAt: new Date().toISOString() });
}
