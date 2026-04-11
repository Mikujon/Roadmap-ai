// ── Decisions Prompt — v1 ─────────────────────────────────────────────────
// One call enriches all Command Center decisions in a single LLM round-trip.

export const DECISIONS_PROMPT_VERSION = "decisions-v1" as const;

export function buildDecisionsPrompt(
  decisions: Array<{
    id:     string;
    type:   string;
    title:  string;
    detail: string;
  }>
): string {
  const items = decisions
    .map(d => `ID: ${d.id}\nType: ${d.type}\nTitle: ${d.title}\nDetail: ${d.detail}`)
    .join("\n\n");

  return `You are a PMO AI assistant. For each decision item below, write one sharp, actionable sentence (≤20 words) of PMO guidance.

Decisions:
${items}

Respond with only a JSON array, one object per decision, in this exact format:
[
  { "id": "<id>", "insight": "<one sentence ≤20 words>" },
  ...
]

Rules:
- Match every id exactly
- Each insight must be actionable, specific, and reference a concrete metric or owner
- No generic advice ("review the project", "talk to stakeholders")
- No preamble, no trailing text`;
}
