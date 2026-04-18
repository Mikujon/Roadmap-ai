import { NextResponse } from "next/server";
import { anthropic } from "@/lib/anthropic";
import { getAuthContext } from "@/lib/auth";
import { CreateProjectSchema } from "@/lib/validations";
import { db } from "@/lib/prisma";
import { PLANS } from "@/lib/stripe";
import { can } from "@/lib/permissions";
import { rateLimit } from "@/lib/rate-limit";
 
export async function POST(req: Request) {
  const ctx = await getAuthContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const allowed = rateLimit(`generate:${ctx.org.id}`, 10, 60 * 60 * 1000); // 10 per hour
  if (!allowed) return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  if (!can.createProject(ctx.role!))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
 
  const plan = PLANS[ctx.org.subscriptionStatus as keyof typeof PLANS] ?? PLANS.FREE;
  if (plan.projects !== -1) {
    const count = await db.project.count({ where: { organisationId: ctx.org.id } });
    if (count >= plan.projects)
      return NextResponse.json(
        { error: `Upgrade to create more than ${plan.projects} project(s)` },
        { status: 403 }
      );
  }
 
  const body = CreateProjectSchema.parse(await req.json());
  const departmentContext = (body as any).departmentContext ?? "No departments configured.";
 
  const prompt = `You are a senior PMO consultant with deep expertise across multiple industries. Analyze the project description and requirements carefully to determine the project type, then generate a highly contextual and realistic project roadmap.
 
PROJECT DETAILS:
- Name: ${body.name}
- Description: ${body.description ?? ""}
- Start: ${body.startDate}
- End: ${body.endDate}
- Requirements & Context:
${body.functionalAnalysis}
 
ORGANIZATION DEPARTMENTS & RESOURCES:
${departmentContext}
 
STEP 1 — DETECT PROJECT TYPE:
Based on the name, description and requirements, classify this project into one of these categories (or a similar one):
- IT/Software Development → phases: Discovery, Architecture & Setup, Core Development, Testing & QA, Launch & Stabilization
- Client Acquisition / Sales → phases: Market Research, Lead Generation, Pipeline Development, Negotiation & Closing, Onboarding
- Marketing Campaign → phases: Strategy & Planning, Content Creation, Channel Setup, Campaign Launch, Performance & Optimization
- Product Launch → phases: Market Validation, Product Development, Go-to-Market, Launch, Post-Launch Growth
- Construction / Infrastructure → phases: Feasibility & Design, Permits & Procurement, Foundation, Construction, Inspection & Handover
- HR / Organizational Change → phases: Assessment, Design, Communication, Implementation, Adoption & Monitoring
- Finance / Compliance → phases: Gap Analysis, Policy Design, Process Implementation, Training, Audit & Certification
- Event Management → phases: Concept & Planning, Vendor & Logistics, Marketing & Registration, Execution, Post-Event
- Consulting / Advisory → phases: Discovery & Assessment, Strategy Design, Roadmap Delivery, Implementation Support, Review & Handover
- R&D / Innovation → phases: Research, Concept Development, Prototyping, Validation, Scale-Up
- Custom → infer the most logical phases from context
 
STEP 2 — GENERATE ROADMAP:
Use the detected project type to create phases with names that reflect the ACTUAL work, not generic labels.
 
Respond with ONLY valid JSON (no markdown, no backticks, no explanation):
{
  "projectType": "detected type",
  "phases": [
    { "id":"p1","num":1,"label":"Phase full name","sub":"Short subtitle (5-8 words)","accent":"#006D6B" }
  ],
  "sprints": [
    {
      "id":"s1",
      "phase":1,
      "num":"S1",
      "name":"Sprint name (specific to project context)",
      "goal":"Concrete sprint goal (1-2 sentences)",
      "startDate":"YYYY-MM-DD",
      "endDate":"YYYY-MM-DD",
      "status":"upcoming",
      "features":[
        {
          "id":"f1",
          "title":"Specific deliverable or task",
          "status":"todo",
          "priority":"critical|high|medium|low",
          "module":"Use the EXACT department name from ORGANIZATION DEPARTMENTS above when the task matches that department's competency. If no department matches, use a logical workstream name."
        }
      ]
    }
  ]
}
 
RULES:
- 2–4 phases based on project type
- 2–5 sprints per phase
- 4–10 features per sprint
- Phase accents: Phase 1 "#006D6B", Phase 2 "#3B82F6", Phase 3 "#8B5CF6", Phase 4 "#F97316"
- Distribute sprint dates evenly between ${body.startDate} and ${body.endDate}
- First sprint status: "active", all others: "upcoming"
- Feature status: always "todo"
- Module field = use the EXACT department names provided in ORGANIZATION DEPARTMENTS when the task matches that department's competency. If no department matches, use a logical workstream name.
- Make feature titles SPECIFIC and ACTIONABLE — avoid generic names like "Setup" or "Implementation"
- Base everything strictly on the project requirements provided
- For NON-software projects: do NOT use technical terms like "API", "backend", "frontend", "database"`;
 
  const msg = await anthropic.messages.create({
    model: process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-5",
    max_tokens: 8000,
    messages: [{ role: "user", content: prompt }],
  });
 
  const raw = (msg.content[0] as any).text.replace(/```json|```/gi, "").trim();
  const roadmap = JSON.parse(raw);
 
  const project = await db.project.create({
    data: {
      name: body.name,
      description: body.description,
      functionalAnalysis: body.functionalAnalysis,
      startDate: new Date(body.startDate),
      endDate: new Date(body.endDate),
      organisationId: ctx.org.id,
      category: roadmap.projectType,
      phases: {
        create: roadmap.phases.map((p: any) => ({
          num: p.num,
          label: p.label,
          sub: p.sub,
          accent: p.accent,
          order: p.num,
        })),
      },
    },
    include: { phases: true },
  });
 
  const phaseMap: Record<string, string> = {};
  roadmap.phases.forEach((p: any, i: number) => {
    phaseMap[String(p.num)] = project.phases[i].id;
  });
 
  for (const [si, s] of roadmap.sprints.entries()) {
    const sprint = await db.sprint.create({
      data: {
        projectId: project.id,
        phaseId: phaseMap[String(s.phase)],
        num: s.num,
        name: s.name,
        goal: s.goal,
        startDate: s.startDate ? new Date(s.startDate) : undefined,
        endDate: s.endDate ? new Date(s.endDate) : undefined,
        status: s.status === "active" ? "ACTIVE" : "UPCOMING",
        order: si,
      },
    });
    await db.feature.createMany({
      data: s.features.map((f: any, fi: number) => ({
        sprintId: sprint.id,
        title: f.title,
        module: f.module,
        status: "TODO",
        priority: (f.priority as string).toUpperCase() as any,
        order: fi,
      })),
    });
  }
 
  return NextResponse.json({ projectId: project.id });
}