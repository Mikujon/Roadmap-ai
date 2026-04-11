import { NextResponse } from "next/server";
import { anthropic } from "@/lib/anthropic";
import { getAuthContext } from "@/lib/auth";

export interface Decision {
  id: string;
  severity: "critical" | "warning";
  type: string;
  title: string;
  detail: string;
  projectId: string;
  projectName: string;
  fixTab: string;
}

export async function POST(req: Request) {
  const ctx = await getAuthContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { decisions }: { decisions: Decision[] } = await req.json();
  if (!decisions?.length) return NextResponse.json({ results: [] });

  const prompt = `You are a senior PMO advisor reviewing flagged project decisions for a portfolio dashboard.

For each decision below, write exactly ONE sentence (max 20 words) of sharp, actionable PMO guidance — be specific, direct, no fluff.

Decisions:
${decisions.map((d, i) => `${i + 1}. [${d.type}] ${d.projectName}: ${d.detail}`).join("\n")}

Respond ONLY with valid JSON array, no markdown:
[{"id":"<id>","insight":"<one sentence>"}]

IDs to use: ${decisions.map(d => `"${d.id}"`).join(", ")}`;

  try {
    const msg = await anthropic.messages.create({
      model: process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6",
      max_tokens: 800,
      messages: [{ role: "user", content: prompt }],
    });

    const raw = (msg.content[0] as any).text.replace(/```json|```/gi, "").trim();
    const results = JSON.parse(raw);
    return NextResponse.json({ results });
  } catch {
    return NextResponse.json({ results: [] });
  }
}
