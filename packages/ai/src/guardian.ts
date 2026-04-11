// ── Guardian AI Call ──────────────────────────────────────────────────────
// Structured output + Redis cache + circuit breaker.
// Called by the worker — never from Next.js request handlers directly.

import { z } from "zod";
import {
  anthropic, DEFAULT_MODEL, MAX_TOKENS,
  checkCircuit, recordSuccess, recordFailure, recordUsage,
} from "./client";
import { getCached, setCached } from "./cache";
import { GUARDIAN_PROMPT_VERSION, buildGuardianPrompt } from "./prompts/guardian";

// ── Output schema ─────────────────────────────────────────────────────────
const GuardianOutputSchema = z.object({
  insight:        z.string().max(200),
  recommendation: z.string().max(200),
  riskFlag:       z.boolean(),
  confidence:     z.number().min(0).max(1),
});

export type GuardianAIOutput = z.infer<typeof GuardianOutputSchema>;

export interface GuardianAIInput {
  projectName:    string;
  spi:            number;
  cpi:            number;
  progressPct:    number;
  plannedPct:     number;
  daysLeft:       number;
  budgetVariance: number;
  openRisks:      number;
  highRisks:      number;
  blockedFeatures: number;
  healthScore:    number;
  healthStatus:   string;
  alerts: Array<{
    type:   string;
    level:  string;
    title:  string;
    detail: string;
    action: string;
  }>;
}

export async function runGuardianAI(
  input: GuardianAIInput,
  opts: { force?: boolean } = {}
): Promise<GuardianAIOutput> {
  // Cache check (skip on force)
  if (!opts.force) {
    const cached = await getCached<GuardianAIOutput>(GUARDIAN_PROMPT_VERSION, input);
    if (cached) return cached;
  }

  checkCircuit();

  const prompt = buildGuardianPrompt(input);

  try {
    const msg = await anthropic.messages.create({
      model:      DEFAULT_MODEL,
      max_tokens: MAX_TOKENS,
      messages:   [{ role: "user", content: prompt }],
    });

    recordUsage(msg.usage.input_tokens, msg.usage.output_tokens);
    recordSuccess();

    const text = msg.content.find(b => b.type === "text")?.text ?? "{}";

    // Extract JSON — Claude may wrap in ```json ... ```
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON object in response");

    const parsed = GuardianOutputSchema.parse(JSON.parse(jsonMatch[0]));
    await setCached(GUARDIAN_PROMPT_VERSION, input, parsed);
    return parsed;
  } catch (err) {
    recordFailure();
    throw err;
  }
}
