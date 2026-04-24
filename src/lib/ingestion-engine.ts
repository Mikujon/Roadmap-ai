import Anthropic from "@anthropic-ai/sdk";
import { db } from "./prisma";
import { triggerAgents } from "./agent-triggers";

const anthropic = new Anthropic();

export interface IncomingMessage {
  platform: "slack" | "gmail" | "outlook" | "teams" | "zoom" | 
            "meet" | "whatsapp" | "telegram" | "jira" | "github" | "linear";
  type: "message" | "email" | "transcript" | "webhook" | "comment";
  content: string;
  sender: string;
  senderEmail?: string;
  channelOrSubject?: string;
  timestamp: Date;
  rawPayload?: unknown;
  projectId?: string;
  orgId: string;
}

export interface ExtractedIntelligence {
  isProjectRelevant: boolean;
  projectId?: string;
  projectName?: string;
  confidence: number;
  extractions: {
    decisions?: string[];
    risks?: { title: string; probability: number; impact: number }[];
    scopeChanges?: { description: string; impact: string }[];
    scheduleUpdates?: { description: string; daysDelta: number }[];
    budgetUpdates?: { description: string; amount: number }[];
    actionItems?: { title: string; assignee: string; dueDate?: string }[];
    blockers?: string[];
    statusUpdates?: string[];
  };
  summary: string;
  suggestedActions: string[];
}

export async function processIncomingMessage(
  msg: IncomingMessage
): Promise<ExtractedIntelligence> {
  
  let projectId = msg.projectId;
  if (!projectId) {
    projectId = await detectProject(msg, msg.orgId);
  }

  const projects = await db.project.findMany({
    where: { organisationId: msg.orgId, status: { notIn: ["COMPLETED", "CLOSED", "ARCHIVED"] } },
    select: { id: true, name: true }
  });

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1500,
      messages: [{
        role: "user",
        content: `You are Guardian AI. Analyze this ${msg.platform} message and extract project management intelligence.

Active projects: ${JSON.stringify(projects.map(p => ({ id: p.id, name: p.name })))}

Message from: ${msg.sender}
Platform: ${msg.platform}
Channel/Subject: ${msg.channelOrSubject || "N/A"}
Content: ${msg.content}

Extract ALL project-relevant information. Respond in JSON only:
{
  "isProjectRelevant": boolean,
  "projectId": "id from active projects list or null",
  "confidence": 0.0-1.0,
  "extractions": {
    "decisions": ["decisions made"],
    "risks": [{"title": "", "probability": 1-5, "impact": 1-5}],
    "scopeChanges": [{"description": "", "impact": "schedule/budget/both"}],
    "scheduleUpdates": [{"description": "", "daysDelta": number}],
    "budgetUpdates": [{"description": "", "amount": number}],
    "actionItems": [{"title": "", "assignee": "", "dueDate": "ISO date or null"}],
    "blockers": ["blocking issues"],
    "statusUpdates": ["status updates"]
  },
  "summary": "one sentence summary",
  "suggestedActions": ["specific PM actions to take"]
}`
      }]
    });

    const content = response.content[0];
    if (content.type !== "text") {
      return { isProjectRelevant: false, confidence: 0, extractions: {}, summary: "", suggestedActions: [] };
    }

    return JSON.parse(content.text) as ExtractedIntelligence;
  } catch (error) {
    console.error("[ingestion-engine] AI extraction failed:", error);
    return { isProjectRelevant: false, confidence: 0, extractions: {}, summary: "", suggestedActions: [] };
  }
}

export async function applyIntelligence(
  intelligence: ExtractedIntelligence,
  orgId: string,
  sourceMsg: IncomingMessage
): Promise<void> {
  if (!intelligence.isProjectRelevant || !intelligence.projectId) return;
  if (intelligence.confidence < 0.6) return;

  const projectId = intelligence.projectId;
  const ext = intelligence.extractions;

  await Promise.allSettled([
    ...(ext.risks ?? []).map(risk =>
      db.risk.create({
        data: {
          projectId,
          title: risk.title,
          probability: risk.probability,
          impact: risk.impact,
          status: "OPEN",
          description: `Auto-detected from ${sourceMsg.platform} message by Guardian AI`,
          category: "TECHNICAL",
        }
      })
    ),

    db.alert.create({
      data: {
        organisationId: orgId,
        projectId,
        type: "AMBIENT_INTELLIGENCE",
        level: ext.blockers?.length ? "WARNING" : "INFO",
        title: `${sourceMsg.platform} update: ${intelligence.summary}`,
        detail: intelligence.suggestedActions.join(" | "),
        action: "Review",
        read: false,
        emailSent: false,
        resolved: false,
      }
    }),

    db.activity.create({
      data: {
        projectId,
        organisationId: orgId,
        userId: "guardian-ai",
        userName: "Guardian AI",
        action: "AMBIENT_INTELLIGENCE",
        entity: "message",
        entityId: sourceMsg.platform,
        entityName: `${sourceMsg.platform} message from ${sourceMsg.sender}`,
        meta: {
          platform: sourceMsg.platform,
          summary: intelligence.summary,
          extractions: intelligence.extractions,
        }
      }
    }),
  ]);

  triggerAgents("scope_changed", projectId, orgId);
}

async function detectProject(msg: IncomingMessage, orgId: string): Promise<string | undefined> {
  const projects = await db.project.findMany({
    where: { organisationId: orgId },
    select: { id: true, name: true }
  });

  for (const project of projects) {
    if (msg.content.toLowerCase().includes(project.name.toLowerCase())) {
      return project.id;
    }
    if (msg.channelOrSubject?.toLowerCase().includes(project.name.toLowerCase())) {
      return project.id;
    }
  }

  return undefined;
}