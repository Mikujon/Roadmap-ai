// ── Anthropic Client Wrapper ──────────────────────────────────────────────
// Adds: token counting, cost tracking, circuit breaker, timeout guard,
//       Prometheus metrics (optional — skipped if @roadmap/metrics not wired in).

import Anthropic from "@anthropic-ai/sdk";

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// ── Cost tracking (per-process, reset on restart) ─────────────────────────
const _costs = { inputTokens: 0, outputTokens: 0, calls: 0 };

/** Approximate cost in USD — Sonnet 4.6 pricing */
const INPUT_COST_PER_1K  = 0.003;
const OUTPUT_COST_PER_1K = 0.015;

export function recordUsage(inputTokens: number, outputTokens: number): void {
  _costs.inputTokens  += inputTokens;
  _costs.outputTokens += outputTokens;
  _costs.calls        += 1;

  // Push to Prometheus if the metrics package is available
  try {
    const m = require("@roadmap/metrics") as typeof import("@roadmap/metrics");
    m.aiTokensTotal.inc({ type: "input" },  inputTokens);
    m.aiTokensTotal.inc({ type: "output" }, outputTokens);
    const cost = (inputTokens / 1000) * INPUT_COST_PER_1K + (outputTokens / 1000) * OUTPUT_COST_PER_1K;
    m.aiCostUsdTotal.inc(cost);
  } catch {
    // @roadmap/metrics not in scope (e.g. during testing) — silent
  }
}

export function getSessionCost(): { usd: number; calls: number; inputTokens: number; outputTokens: number } {
  const usd =
    (_costs.inputTokens  / 1000) * INPUT_COST_PER_1K +
    (_costs.outputTokens / 1000) * OUTPUT_COST_PER_1K;
  return { usd, calls: _costs.calls, ..._costs };
}

// ── Circuit breaker ───────────────────────────────────────────────────────
// Opens after MAX_FAILURES consecutive errors, resets after RESET_MS.
const MAX_FAILURES = 5;
const RESET_MS     = 60_000; // 1 minute

let _failures  = 0;
let _openSince = 0;

export function checkCircuit(): void {
  if (_failures < MAX_FAILURES) return;
  const elapsed = Date.now() - _openSince;
  if (elapsed < RESET_MS) {
    throw new Error(
      `[ai] Circuit breaker OPEN — too many consecutive Claude errors. ` +
      `Retry after ${Math.ceil((RESET_MS - elapsed) / 1000)}s.`
    );
  }
  // Half-open: allow one attempt through
  _failures = 0;
}

export function recordSuccess(): void {
  _failures = 0;
  try {
    const m = require("@roadmap/metrics") as typeof import("@roadmap/metrics");
    m.circuitBreakerOpen.set(0);
  } catch { /* optional */ }
}

export function recordFailure(): void {
  _failures += 1;
  if (_failures === MAX_FAILURES) _openSince = Date.now();
  try {
    const m = require("@roadmap/metrics") as typeof import("@roadmap/metrics");
    m.circuitBreakerOpen.set(_failures >= MAX_FAILURES ? 1 : 0);
  } catch { /* optional */ }
}

// ── Default model ─────────────────────────────────────────────────────────
export const DEFAULT_MODEL = "claude-sonnet-4-6" as const;
export const MAX_TOKENS    = 1024 as const;
