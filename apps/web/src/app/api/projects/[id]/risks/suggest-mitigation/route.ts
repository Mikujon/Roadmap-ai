import { NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { getAuthContext } from "@/lib/auth";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic();

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const ctx = await getAuthContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { riskTitle, probability, impact } = await req.json();
  if (!riskTitle) return NextResponse.json({ error: "Risk title required" }, { status: 400 });

  // Get project context
  const project = await db.project.findFirst({
    where: { id, organisationId: ctx.org.id },
    include: {
      sprints:     { include: { features: { select: { title: true, status: true, priority: true } } } },
      risks:       { where: { status: "OPEN" } },
      assignments: { include: { resource: { select: { name: true, role: true } } } },
      phases:      { orderBy: { order: "asc" } },
    },
  });
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const allF      = project.sprints.flatMap(s => s.features);
  const blocked   = allF.filter(f => f.status === "BLOCKED");
  const daysLeft  = Math.ceil((new Date(project.endDate).getTime() - Date.now()) / 86400000);
  const teamRoles = [...new Set(project.assignments.map(a => a.resource.role))].join(", ");

  const prompt = `You are an expert PMO risk manager. Generate a specific, actionable mitigation strategy for the following risk.

PROJECT CONTEXT:
- Name: ${project.name}
- Days left: ${daysLeft}
- Team: ${teamRoles || "Not assigned"}
- Open risks: ${project.risks.length}
- Blocked features: ${blocked.length}
- Total features: ${allF.length}
- Done features: ${allF.filter(f => f.status === "DONE").length}

RISK TO MITIGATE:
- Title: "${riskTitle}"
- Probability: ${probability}/5
- Impact: ${impact}/5
- Risk Score: ${probability * impact}/25

Generate 3 specific mitigation strategies. Return ONLY a JSON array:
[
  "Specific mitigation action 1 with concrete steps",
  "Specific mitigation action 2 with concrete steps", 
  "Specific mitigation action 3 with concrete steps"
]

Rules:
- Be specific to THIS project context
- Include concrete actions, owners, and timelines where relevant
- Consider the team size and skills available
- Each suggestion max 100 characters`;

  try {
    const msg = await anthropic.messages.create({
      model:      "claude-haiku-4-5-20251001",
      max_tokens: 400,
      messages:   [{ role: "user", content: prompt }],
    });

    const text = (msg.content[0] as any).text.replace(/```json|```/gi, "").trim();
    const suggestions = JSON.parse(text);
    return NextResponse.json({ suggestions });
  } catch (e) {
    return NextResponse.json({ suggestions: [
      "Assign a dedicated owner to monitor and resolve this risk daily",
      "Create a contingency plan with specific trigger conditions",
      "Schedule weekly risk review meetings with stakeholders",
    ]});
  }
}