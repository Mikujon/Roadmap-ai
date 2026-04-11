// ── Materialized View Refresh Processor ──────────────────────────────────
// Calls the PostgreSQL refresh_materialized_views() function.
// Runs every 15 min via cron; also triggered after heavy mutations.

import type { Job } from "bullmq";
import type { MatViewRefreshJobData } from "@roadmap/queue";
import { createLogger } from "@roadmap/logger";
import { db } from "../db";

const log = createLogger("matview-refresh");

interface RefreshRow {
  view_name:   string;
  duration_ms: number;
}

export async function processMatViewRefreshJob(
  job: Job<MatViewRefreshJobData>
): Promise<void> {
  const { views } = job.data;

  log.info("refreshing materialized views", { views: views ?? "all" });
  const start = Date.now();

  try {
    // Pass the views array as a Postgres TEXT[] — NULL means "all"
    const rows = await db.$queryRaw<RefreshRow[]>`
      SELECT * FROM refresh_materialized_views(
        ${views ? views : null}::text[]
      )
    `;

    const elapsed = Date.now() - start;

    for (const row of rows) {
      log.info("view refreshed", { view: row.view_name, durationMs: row.duration_ms });
    }

    log.info("all views refreshed", { totalMs: elapsed, count: rows.length });
  } catch (err) {
    log.error("refresh failed", { error: (err as Error).message });
    throw err;
  }
}
