import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";
import Anthropic from "@anthropic-ai/sdk";
import { rateLimit } from "@/lib/rate-limit";

const anthropic = new Anthropic();

export async function POST(req: Request) {
  const ctx = await getAuthContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const allowed = rateLimit(`guardian-tasks:${ctx.org.id}`, 20, 60 * 60 * 1000);
  if (!allowed) return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });

  const { tasks, projectName, projectEnd } = await req.json();

  if (!tasks || tasks.length === 0) return NextResponse.json({ insights: {} });

  const prompt = `You are an AI PMO Guardian. Analyze each task and provide a short 1-2 sentence governance insight.
Focus on: risks, effort gaps, dependencies, deadline proximity, priority vs status alignment.
Be concise and actionable. Never repeat the task title.

Project: ${projectName}
Project deadline: ${projectEnd}
Today: ${new Date().toISOString().slice(0, 10)}

Tasks:
${tasks.map((t: any, i: number) => `${i + 1}. [${t.id}]
   Title: ${t.title}
   Status: ${t.status}
   Priority: ${t.priority}
   Module: ${t.module ?? "—"}
   Assignee: ${t.assignedTo ?? "Unassigned"}
   Est hours: ${t.estimatedHours}h | Act hours: ${t.actualHours}h
   Sprint due: ${t.sprintEnd ?? "—"}
   Sprint: ${t.sprintName}
   Dependencies: ${t.dependsCount > 0 ? `${t.dependsCount} dependency/ies` : "none"}
   Blocked by deps: ${t.blockedByDeps ? "yes" : "no"}`).join("\n\n")}

Respond ONLY with valid JSON — no markdown:
{
  "insights": {
    "<task_id>": "<1-2 sentence insight>"
  }
}

Rules:
- For DONE tasks: acknowledge completion briefly
- For BLOCKED tasks: focus on unblocking urgency
- For tasks with effort > estimated*1.3: flag effort risk
- For CRITICAL priority not started: flag urgency
- For overdue sprint tasks: mention deadline risk
- For unassigned tasks: flag ownership gap
- Keep each insight under 120 characters`;

  try {
    const msg = await anthropic.messages.create({
      model: process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-5",
      max_tokens: 2000,
      messages: [{ role: "user", content: prompt }],
    });

    const raw = (msg.content[0] as any).text.replace(/```json|```/gi, "").trim();
    const data = JSON.parse(raw);
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ insights: {} });
  }
}
