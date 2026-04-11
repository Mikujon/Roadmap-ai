import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { registry, METRICS_CONTENT_TYPE } from "@roadmap/metrics";

/**
 * Prometheus scrape endpoint — GET /api/metrics
 *
 * Protected by METRICS_SECRET env var.
 * Add this URL to your Prometheus scrape config:
 *
 *   - job_name: roadmap-web
 *     static_configs:
 *       - targets: ['your-host:3000']
 *     metrics_path: /api/metrics
 *     bearer_token: <METRICS_SECRET value>
 *     scheme: https
 */
export async function GET() {
  // Guard: reject if no secret is configured, or header doesn't match
  const secret = process.env.METRICS_SECRET;
  if (secret) {
    const h    = await headers();
    const auth = h.get("authorization") ?? "";
    const provided = auth.startsWith("Bearer ") ? auth.slice(7) : h.get("x-metrics-secret") ?? "";
    if (provided !== secret) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
  }

  const output = await registry.metrics();
  return new NextResponse(output, {
    status: 200,
    headers: { "Content-Type": METRICS_CONTENT_TYPE },
  });
}

// No caching — always scrape live
export const dynamic = "force-dynamic";
