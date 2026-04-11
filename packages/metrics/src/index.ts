import client, { Registry } from "prom-client";

// ── Singleton registry ───────────────────────────────────────────────────────
// One registry per process. In Next.js use globalThis to survive hot reloads.

const g = globalThis as typeof globalThis & { __metricsRegistry?: Registry };

if (!g.__metricsRegistry) {
  const registry = new Registry();
  client.collectDefaultMetrics({ register: registry, prefix: "roadmap_" });
  g.__metricsRegistry = registry;
}

export const registry = g.__metricsRegistry!;

// ── Helper to get-or-create metrics (idempotent across hot reloads) ──────────

function counter(name: string, help: string, labelNames: string[] = []) {
  return (
    (registry.getSingleMetric(name) as client.Counter<string>) ??
    new client.Counter({ name, help, labelNames, registers: [registry] })
  );
}

function histogram(name: string, help: string, labelNames: string[] = [], buckets?: number[]) {
  return (
    (registry.getSingleMetric(name) as client.Histogram<string>) ??
    new client.Histogram({
      name,
      help,
      labelNames,
      buckets: buckets ?? client.exponentialBuckets(0.1, 2, 8),
      registers: [registry],
    })
  );
}

function gauge(name: string, help: string, labelNames: string[] = []) {
  return (
    (registry.getSingleMetric(name) as client.Gauge<string>) ??
    new client.Gauge({ name, help, labelNames, registers: [registry] })
  );
}

// ── Guardian / Worker metrics ─────────────────────────────────────────────────

/** Total Guardian jobs processed, labelled by outcome (success | failure | skipped). */
export const guardianJobsTotal = counter(
  "roadmap_guardian_jobs_total",
  "Guardian AI analysis jobs processed",
  ["outcome"]
);

/** Guardian job end-to-end duration in seconds. */
export const guardianJobDuration = histogram(
  "roadmap_guardian_job_duration_seconds",
  "Guardian job duration in seconds",
  [],
  [0.5, 1, 2, 5, 10, 30, 60]
);

/** Total outbox events dispatched, labelled by queue and outcome. */
export const outboxEventsTotal = counter(
  "roadmap_outbox_events_total",
  "Outbox events dispatched to BullMQ",
  ["queue", "outcome"]
);

// ── AI client metrics ─────────────────────────────────────────────────────────

/** Total Claude API calls, labelled by prompt_version and outcome. */
export const aiCallsTotal = counter(
  "roadmap_ai_calls_total",
  "Total calls to the Claude API",
  ["prompt_version", "outcome"]
);

/** Claude API call latency in seconds. */
export const aiCallDuration = histogram(
  "roadmap_ai_call_duration_seconds",
  "Latency of Claude API calls",
  ["prompt_version"],
  [0.2, 0.5, 1, 2, 5, 10, 20]
);

/** AI cache hits total. */
export const aiCacheHitsTotal = counter(
  "roadmap_ai_cache_hits_total",
  "AI response cache hits (requests that bypassed Claude)",
  ["prompt_version"]
);

/** Tokens consumed per Claude call (input and output). */
export const aiTokensTotal = counter(
  "roadmap_ai_tokens_total",
  "Claude API tokens consumed",
  ["type"] // input | output
);

/** Estimated cost in USD (tracked as a counter for cumulative spend). */
export const aiCostUsdTotal = counter(
  "roadmap_ai_cost_usd_total",
  "Estimated Claude API spend in USD"
);

// ── Circuit breaker ───────────────────────────────────────────────────────────

/** 1 = open (degraded), 0 = closed (healthy). */
export const circuitBreakerOpen = gauge(
  "roadmap_circuit_breaker_open",
  "AI circuit breaker state: 1=open (failing), 0=closed (healthy)"
);

// ── HTTP / API metrics ────────────────────────────────────────────────────────

/** HTTP request duration labelled by method, route, and status. */
export const httpRequestDuration = histogram(
  "roadmap_http_request_duration_seconds",
  "HTTP request latency",
  ["method", "route", "status"],
  [0.005, 0.01, 0.05, 0.1, 0.5, 1, 5]
);

/** Total HTTP requests. */
export const httpRequestsTotal = counter(
  "roadmap_http_requests_total",
  "Total HTTP requests",
  ["method", "route", "status"]
);

// ── Content-type for Prometheus scrape ───────────────────────────────────────
export const METRICS_CONTENT_TYPE = client.Registry.OPENMETRICS_CONTENT_TYPE;
