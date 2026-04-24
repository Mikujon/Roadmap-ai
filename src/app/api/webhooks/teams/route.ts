import { processIncomingMessage, applyIntelligence } from "@/lib/ingestion-engine";
import { db } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    if (body.type === "message") {
      const org = await db.organisation.findFirst({
        where: { teamsWebhookUrl: { not: null } },
        select: { id: true }
      });
      if (!org) return Response.json({ ok: true });

      const intelligence = await processIncomingMessage({
        platform: "teams",
        type: "message",
        content: body.text || body.summary || "",
        sender: body.from?.name || "unknown",
        senderEmail: body.from?.email,
        channelOrSubject: body.channelData?.channel?.name,
        timestamp: new Date(),
        orgId: org.id,
      });

      await applyIntelligence(intelligence, org.id, {
        platform: "teams",
        type: "message",
        content: body.text || "",
        sender: body.from?.name || "unknown",
        channelOrSubject: body.channelData?.channel?.name,
        timestamp: new Date(),
        orgId: org.id,
      });
    }

    return Response.json({ type: "message", text: "OK" });
  } catch (error) {
    console.error("[teams-webhook] Error:", error);
    return Response.json({ ok: false }, { status: 500 });
  }
}