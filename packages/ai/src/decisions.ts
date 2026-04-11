// ── Decisions AI Call ─────────────────────────────────────────────────────
// Enriches Command Center decisions in one LLM round-trip.

import { z } from "zod";
import {
  anthropic, DEFAULT_MODEL, MAX_TOKENS,
  checkCircuit, recordSuccess, recordFailure, recordUsage,
} from "./client";
import { getCached, setCached } from "./cache";
import { DECISIONS_PROMPT_VERSION, buildDecisionsPrompt } from "./prompts/decisions";

const DecisionInsightSchema = z.object({
  id:      z.string(),
  insight: z.string().max(200),
});

const DecisionsOutputSchema = z.array(DecisionInsightSchema);

export type DecisionInsight = z.infer<typeof DecisionInsightSchema>;

export interface DecisionInput {
  id:     string;
  type:   string;
  title:  string;
  detail: string;
}

export async function runDecisionsAI(
  decisions: DecisionInput[]
): Promise<DecisionInsight[]> {
  if (decisions.length === 0) return [];

  const cached = await getCached<DecisionInsight[]>(DECISIONS_PROMPT_VERSION, decisions);
  if (cached) return cached;

  checkCircuit();

  const prompt = buildDecisionsPrompt(decisions);

  try {
    const msg = await anthropic.messages.create({
      model:      DEFAULT_MODEL,
      max_tokens: MAX_TOKENS,
      messages:   [{ role: "user", content: prompt }],
    });

    recordUsage(msg.usage.input_tokens, msg.usage.output_tokens);
    recordSuccess();

    const text      = msg.content.find(b => b.type === "text")?.text ?? "[]";
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error("No JSON array in response");

    const parsed = DecisionsOutputSchema.parse(JSON.parse(jsonMatch[0]));
    await setCached(DECISIONS_PROMPT_VERSION, decisions, parsed);
    return parsed;
  } catch (err) {
    recordFailure();
    throw err;
  }
}
