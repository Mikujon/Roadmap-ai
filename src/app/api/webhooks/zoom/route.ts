import { processIncomingMessage, applyIntelligence } from "@/lib/ingestion-engine";
import { db } from "@/lib/prisma";
import crypto from "crypto";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    if (body.event === "endpoint.url_validation") {
      const hashForValidation = crypto
        .createHmac("sha256", process.env.ZOOM_WEBHOOK_SECRET_TOKEN ?? "")
        .update(body.payload.plainToken)
        .digest("hex");
      return Response.json({
        plainToken: body.payload.plainToken,
        encryptedToken: hashForValidation
      });
    }

    if (body.event === "recording.transcript_completed") {
      const meeting = body.payload.object;
      
      const transcriptFile = meeting.recording_files?.find((f: { file_type: string }) => f.file_type === "TRANSCRIPT");
      const transcriptUrl = transcriptFile?.download_url;
      
      if (!transcriptUrl) return Response.json({ ok: true });

      let transcript = "";
      try {
        const transcriptRes = await fetch(
          `${transcriptUrl}?access_token=${process.env.ZOOM_ACCESS_TOKEN}`
        );
        transcript = await transcriptRes.text();
      } catch (error) {
        console.error("[zoom-webhook] Failed to fetch transcript:", error);
        transcript = meeting.topic + " " + (meeting.summary || "");
      }

      const org = await db.organisation.findFirst({
        where: { zoomAccountId: { not: null } },
        select: { id: true }
      });
      if (!org) return Response.json({ ok: true });

      const intelligence = await processIncomingMessage({
        platform: "zoom",
        type: "transcript",
        content: transcript,
        sender: meeting.host_email,
        channelOrSubject: meeting.topic,
        timestamp: new Date(meeting.start_time),
        orgId: org.id,
      });

      await applyIntelligence(intelligence, org.id, {
        platform: "zoom",
        type: "transcript",
        content: transcript,
        sender: meeting.host_email,
        channelOrSubject: meeting.topic,
        timestamp: new Date(),
        orgId: org.id,
      });
    }

    return Response.json({ ok: true });
  } catch (error) {
    console.error("[zoom-webhook] Error:", error);
    return Response.json({ ok: false }, { status: 500 });
  }
}