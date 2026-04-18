import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";
import { db } from "@/lib/prisma";
import { anthropic } from "@/lib/anthropic";

const DEFAULT_FA = (name: string, brief: string) => ({
  scope: `${name} — ${brief.slice(0, 300)}`,
  objectives: [
    "Deliver working software on schedule and within budget",
    "Meet all defined functional requirements",
    "Ensure scalability and maintainability",
  ],
  stakeholders: [
    { role: "Project Sponsor",  responsibilities: "Budget approval, strategic direction" },
    { role: "Project Manager",  responsibilities: "Day-to-day management, reporting" },
    { role: "Development Team", responsibilities: "Implementation, testing" },
    { role: "End Users",        responsibilities: "Acceptance testing, feedback" },
  ],
  functionalRequirements: [
    { id: "FR-001", title: "User Authentication", description: "Users must be able to register and log in securely", priority: "HIGH",   status: "PENDING" },
    { id: "FR-002", title: "Core Workflow",        description: "Primary business workflow as described in brief",  priority: "HIGH",   status: "PENDING" },
    { id: "FR-003", title: "Reporting",            description: "Generate and export standard reports",            priority: "MEDIUM", status: "PENDING" },
  ],
  nonFunctionalRequirements: [
    { id: "NFR-001", category: "Performance",  description: "Page load < 2s under normal load"     },
    { id: "NFR-002", category: "Security",     description: "OWASP Top 10 compliance"              },
    { id: "NFR-003", category: "Availability", description: "99.5% uptime SLA"                    },
  ],
  outOfScope: [
    "Legacy system migration (unless explicitly stated)",
    "Third-party integrations not listed in requirements",
    "Hardware procurement",
  ],
  assumptions: [
    "Stable requirements throughout development",
    "Client provides timely feedback within 48h",
    "All third-party APIs are available",
  ],
  constraints: [
    "Fixed deadline as agreed in project charter",
    "Budget cannot exceed approved amount without sign-off",
    "Must use existing technology stack",
  ],
  processFlow: [
    { step: 1, actor: "User",    action: "Initiates request",        outcome: "System validates input"    },
    { step: 2, actor: "System",  action: "Processes business logic",  outcome: "Data persisted"            },
    { step: 3, actor: "System",  action: "Generates response",        outcome: "User receives confirmation"},
  ],
  glossary: [
    { term: "SLA",  definition: "Service Level Agreement — agreed uptime/performance targets" },
    { term: "MVP",  definition: "Minimum Viable Product — smallest shippable version"         },
    { term: "RACI", definition: "Responsible, Accountable, Consulted, Informed matrix"        },
  ],
});

export async function POST(req: Request) {
  const ctx = await getAuthContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as {
    projectId: string;
    videoUrl?: string;
    brief?: string;
    projectName: string;
  };

  const { projectId, videoUrl, brief, projectName } = body;

  const project = await db.project.findFirst({
    where: { id: projectId, organisationId: ctx.org.id },
    select: { id: true, name: true, description: true, briefText: true },
  });
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const briefText = brief || project.description || project.briefText || "";

  let analysisContent: Record<string, unknown>;

  try {
    const prompt = `You are a senior business analyst. Generate a comprehensive Functional Analysis document for the following project.

Project Name: ${projectName}
Brief: ${briefText.slice(0, 2000)}
${videoUrl ? `Video brief: ${videoUrl} (analyze based on the project name and brief above)` : ""}

Return a JSON object with EXACTLY these fields:
{
  "scope": "string — 2-3 sentences describing project scope",
  "objectives": ["objective1", "objective2", "objective3", "objective4"],
  "stakeholders": [{"role": "string", "responsibilities": "string"}],
  "functionalRequirements": [{"id": "FR-001", "title": "string", "description": "string", "priority": "HIGH|MEDIUM|LOW", "status": "PENDING"}],
  "nonFunctionalRequirements": [{"id": "NFR-001", "category": "string", "description": "string"}],
  "outOfScope": ["item1", "item2"],
  "assumptions": ["assumption1", "assumption2"],
  "constraints": ["constraint1", "constraint2"],
  "processFlow": [{"step": 1, "actor": "string", "action": "string", "outcome": "string"}],
  "glossary": [{"term": "string", "definition": "string"}]
}

Generate realistic, specific content based on the project description. Return ONLY valid JSON, no markdown.`;

    const msg = await anthropic.messages.create({
      model:      "claude-haiku-4-5-20251001",
      max_tokens: 2048,
      messages:   [{ role: "user", content: prompt }],
    });

    const text = msg.content[0].type === "text" ? msg.content[0].text : "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    analysisContent = jsonMatch ? JSON.parse(jsonMatch[0]) : DEFAULT_FA(projectName, briefText);
  } catch {
    analysisContent = DEFAULT_FA(projectName, briefText);
  }

  // Upsert FunctionalAnalysis
  const existing = await db.functionalAnalysis.findUnique({ where: { projectId } });

  if (existing) {
    // Save old version
    await db.fAVersion.create({
      data: {
        analysisId: existing.id,
        version:    existing.version,
        content:    existing.content as object,
        changedBy:  ctx.user.name ?? ctx.user.email,
        changeNote: "Regenerated from video/brief",
      },
    });
    await db.functionalAnalysis.update({
      where: { projectId },
      data:  {
        content:  analysisContent as object,
        version:  existing.version + 1,
        status:   "DRAFT",
        videoUrl: videoUrl ?? existing.videoUrl,
      },
    });
  } else {
    await db.functionalAnalysis.create({
      data: {
        projectId,
        content:  analysisContent as object,
        videoUrl: videoUrl ?? null,
        status:   "DRAFT",
        version:  1,
      },
    });
  }

  return NextResponse.json({ content: analysisContent });
}
