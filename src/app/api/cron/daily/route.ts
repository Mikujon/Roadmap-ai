import { NextRequest } from "next/server";
import { triggerAgents } from "@/lib/agent-triggers";
import { db } from "@/lib/prisma";

// Called by Vercel Cron at 08:00 UTC daily (see vercel.json)
// Also callable manually: curl -H "Authorization: Bearer $CRON_SECRET" /api/cron/daily
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const orgs = await db.organisation.findMany({ select: { id: true } });

  for (const org of orgs) {
    triggerAgents("daily_sweep", "", org.id);
  }

  return Response.json({ ok: true, orgsProcessed: orgs.length, triggeredAt: new Date().toISOString() });
}
