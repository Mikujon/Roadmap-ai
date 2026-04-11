import { NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { runHealthCheck, sendAlertEmails } from "@/lib/alert-engine";

// Called by Vercel Cron or external cron service
// Add to vercel.json: { "crons": [{ "path": "/api/cron/health-check", "schedule": "0 * * * *" }] }
export async function GET(req: Request) {
  // Verify cron secret
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get all organisations
  const orgs = await db.organisation.findMany({
    include: {
      members: {
        where: { role: "ADMIN" },
        include: { user: true },
        take: 1,
      },
    },
  });

  const results = [];

  for (const org of orgs) {
    const result = await runHealthCheck(org.id, true);
    
    // Send email to admin if critical alerts
    const adminEmail = org.members[0]?.user?.email;
    if (adminEmail && result.alerts.filter((a: any) => a.level === "critical").length > 0) {
      await sendAlertEmails(org.id, adminEmail);
    }

    results.push({ org: org.name, ...result });
  }

  return NextResponse.json({ ok: true, results });
}