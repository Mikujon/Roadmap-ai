import { processIncomingMessage, applyIntelligence } from "@/lib/ingestion-engine";
import { db } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    const data = Buffer.from(body.message.data, "base64").toString();
    const notification = JSON.parse(data);
    
    const org = await db.organisation.findFirst({
      where: { gmailWatchId: notification.historyId?.toString() }
    });
    if (!org) return Response.json({ ok: true });

    const emailContent = notification.subject + " " + (notification.snippet || "");

    const intelligence = await processIncomingMessage({
      platform: "gmail",
      type: "email",
      content: emailContent,
      sender: notification.from || "unknown",
      senderEmail: notification.from,
      channelOrSubject: notification.subject,
      timestamp: new Date(),
      orgId: org.id,
    });

    await applyIntelligence(intelligence, org.id, {
      platform: "gmail",
      type: "email",
      content: emailContent,
      sender: notification.from || "unknown",
      channelOrSubject: notification.subject,
      timestamp: new Date(),
      orgId: org.id,
    });

    return Response.json({ ok: true });
  } catch (error) {
    console.error("[gmail-webhook] Error:", error);
    return Response.json({ ok: false }, { status: 500 });
  }
}