import { z }            from "zod";
import { db }            from "@/lib/prisma";
import { withApiAuth }   from "@/lib/api/route-handler";
import { ok, Errors }    from "@/lib/api/response";
import { validateBody }  from "@/lib/api/validate";
import { processIncomingMessage, applyIntelligence, type IncomingMessage } from "@/lib/ingestion-engine";

const SOURCES = ["jira", "gmail", "slack", "zoom", "teams", "linear", "github", "custom"] as const;
const PLATFORM_MAP: Record<typeof SOURCES[number], IncomingMessage["platform"]> = {
  jira: "jira", gmail: "gmail", slack: "slack", zoom: "zoom",
  teams: "slack", linear: "jira", github: "github", custom: "custom",
};

const IngestSchema = z.object({
  source: z.enum(SOURCES),
  events: z.array(z.object({
    type:         z.enum(["message", "email", "ticket_update", "transcript", "custom"]),
    content:      z.string().min(1),
    sender:       z.string(),
    senderEmail:  z.string().email().optional(),
    subject:      z.string().optional(),
    timestamp:    z.string(),
    projectHint:  z.string().optional(),
    metadata:     z.record(z.unknown()).optional(),
  })).min(1).max(50),
});

export const POST = withApiAuth(async (req, ctx) => {
  const b = await validateBody(req, IngestSchema);
  if (b.error) return b.error;

  const { source, events } = b.data;
  const platform = PLATFORM_MAP[source];

  let processed = 0;
  let alertsCreated = 0;
  const projectsUpdated = new Set<string>();

  for (const event of events) {
    const msg: IncomingMessage = {
      platform,
      type:             event.type,
      content:          event.content,
      sender:           event.sender,
      senderEmail:      event.senderEmail,
      channelOrSubject: event.subject,
      timestamp:        new Date(event.timestamp),
      orgId:            ctx.orgId,
      projectId:        event.projectHint,
    };

    const intelligence = await processIncomingMessage(msg);

    await db.ambientMessage.create({
      data: {
        orgId:       ctx.orgId,
        projectId:   intelligence.projectId ?? null,
        platform,
        type:        event.type,
        content:     event.content,
        sender:      event.sender,
        summary:     intelligence.summary,
        confidence:  intelligence.confidence,
        extractions: intelligence.extractions as object,
        applied:     intelligence.isProjectRelevant && intelligence.confidence >= 0.6,
      },
    });

    if (intelligence.isProjectRelevant && intelligence.confidence >= 0.6) {
      await applyIntelligence(intelligence, ctx.orgId, msg);
      if (intelligence.projectId) {
        projectsUpdated.add(intelligence.projectId);
        alertsCreated++;
      }
    }

    processed++;
  }

  return ok({ processed, projectsUpdated: projectsUpdated.size, alertsCreated });
});
