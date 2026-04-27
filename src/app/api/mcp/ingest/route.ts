import { NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { processIncomingMessage, applyIntelligence, IncomingMessage } from "@/lib/ingestion-engine";

const SUPPORTED_SOURCES = ["jira", "gmail", "slack", "zoom", "teams", "linear", "github", "custom"] as const;
type Source = typeof SUPPORTED_SOURCES[number];

interface IngestEvent {
  type: "message" | "email" | "ticket_update" | "transcript" | "custom";
  content: string;
  sender: string;
  senderEmail?: string;
  subject?: string;
  timestamp: string;
  projectHint?: string;
  metadata?: Record<string, unknown>;
}

interface IngestBody {
  source: Source;
  orgId: string;
  events: IngestEvent[];
}

export async function POST(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Missing API key" }, { status: 401 });
  }
  const apiKey = authHeader.slice(7);

  const org = await db.organisation.findUnique({ where: { apiKey } });
  if (!org) {
    return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
  }

  let body: IngestBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { source, orgId, events } = body;

  if (org.id !== orgId) {
    return NextResponse.json({ error: "orgId does not match API key" }, { status: 403 });
  }

  if (!SUPPORTED_SOURCES.includes(source)) {
    return NextResponse.json({ error: `Unsupported source: ${source}` }, { status: 400 });
  }

  if (!Array.isArray(events) || events.length === 0) {
    return NextResponse.json({ error: "events must be a non-empty array" }, { status: 400 });
  }

  const platformMap: Record<Source, IncomingMessage["platform"]> = {
    jira: "jira",
    gmail: "gmail",
    slack: "slack",
    zoom: "zoom",
    teams: "teams",
    linear: "linear",
    github: "github",
    custom: "slack",
  };

  const typeMap: Record<string, IncomingMessage["type"]> = {
    message: "message",
    email: "email",
    ticket_update: "webhook",
    transcript: "transcript",
    custom: "message",
  };

  let processed = 0;
  const projectsUpdated = new Set<string>();
  let alertsCreated = 0;

  for (const event of events) {
    const msg: IncomingMessage = {
      platform: platformMap[source],
      type: typeMap[event.type] ?? "message",
      content: event.content,
      sender: event.sender,
      senderEmail: event.senderEmail,
      channelOrSubject: event.subject,
      timestamp: new Date(event.timestamp),
      orgId: org.id,
      projectId: event.projectHint,
    };

    const intelligence = await processIncomingMessage(msg);

    await db.ambientMessage.create({
      data: {
        orgId: org.id,
        projectId: intelligence.projectId ?? null,
        platform: source,
        type: event.type,
        content: event.content,
        sender: event.sender,
        summary: intelligence.summary,
        confidence: intelligence.confidence,
        extractions: intelligence.extractions as object,
        applied: intelligence.isProjectRelevant && intelligence.confidence >= 0.6,
      },
    });

    if (intelligence.isProjectRelevant && intelligence.confidence >= 0.6) {
      await applyIntelligence(intelligence, org.id, msg);
      if (intelligence.projectId) {
        projectsUpdated.add(intelligence.projectId);
        alertsCreated++;
      }
    }

    processed++;
  }

  return NextResponse.json({
    processed,
    projectsUpdated: projectsUpdated.size,
    alertsCreated,
  });
}
