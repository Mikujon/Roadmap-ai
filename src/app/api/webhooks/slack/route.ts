import { processIncomingMessage, applyIntelligence } from "@/lib/ingestion-engine";
import { db } from "@/lib/prisma";
import crypto from "crypto";

export async function POST(req: Request) {
  const body = await req.text();
  
  const slackSignature = req.headers.get("x-slack-signature") ?? "";
  const slackTimestamp = req.headers.get("x-slack-request-timestamp") ?? "";
  const sigBaseString = `v0:${slackTimestamp}:${body}`;
  const mySignature = "v0=" + crypto
    .createHmac("sha256", process.env.SLACK_SIGNING_SECRET ?? "")
    .update(sigBaseString)
    .digest("hex");
  
  if (mySignature !== slackSignature) {
    return Response.json({ error: "Invalid signature" }, { status: 401 });
  }

  const payload = JSON.parse(body);
  
  if (payload.type === "url_verification") {
    return Response.json({ challenge: payload.challenge });
  }

  if (payload.event?.type === "message" && !payload.event.bot_id) {
    const event = payload.event;
    
    const org = await db.organisation.findFirst({
      where: { slackTeamId: payload.team_id }
    });
    if (!org) return Response.json({ ok: true });

    const intelligence = await processIncomingMessage({
      platform: "slack",
      type: "message",
      content: event.text,
      sender: event.user,
      channelOrSubject: event.channel,
      timestamp: new Date(parseFloat(event.ts) * 1000),
      orgId: org.id,
    });

    await applyIntelligence(intelligence, org.id, {
      platform: "slack",
      type: "message",
      content: event.text,
      sender: event.user,
      channelOrSubject: event.channel,
      timestamp: new Date(),
      orgId: org.id,
    });
  }

  return Response.json({ ok: true });
}