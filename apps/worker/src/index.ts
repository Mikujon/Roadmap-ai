// ── Worker Entry Point ────────────────────────────────────────────────────
// Standalone Node.js process — not part of Next.js request handling.
// Run with: pnpm --filter @roadmap/worker dev

import "dotenv/config";
import { Worker } from "bullmq";
import {
  getRedisConnection,
  closeRedisConnection,
  ALERT_SWEEP_REPEAT,
  MATVIEW_REFRESH_REPEAT,
  PARTITION_MAINTAIN_REPEAT,
  getAlertQueue,
  getMatViewQueue,
  getPartitionQueue,
} from "@roadmap/queue";
import { setRedis } from "@roadmap/ai/cache";
import { createLogger } from "@roadmap/logger";
import { processGuardianJob }            from "./processors/guardian";
import { processAlertSweepJob }          from "./processors/alert-sweep";
import { processMatViewRefreshJob }      from "./processors/matview-refresh";
import { processPartitionMaintenanceJob } from "./processors/partition-maintenance";
import { startOutboxPoller }             from "./processors/outbox-poller";

const log = createLogger("worker");

async function main() {
  log.info("starting RoadmapAI worker");

  const redis = getRedisConnection();

  // Wire Redis into the AI response cache
  setRedis(redis);

  // ── Guardian Worker ───────────────────────────────────────────────────
  const guardianWorker = new Worker(
    "guardian",
    async (job) => processGuardianJob(job as any),
    {
      connection:  redis,
      concurrency: 3,
      limiter:     { max: 10, duration: 60_000 },
    }
  );
  guardianWorker.on("completed", (job) => log.info("guardian job completed", { jobId: job.id }));
  guardianWorker.on("failed",    (job, err) => log.error("guardian job failed", { jobId: job?.id, error: err.message }));

  // ── Alert Sweep Worker ────────────────────────────────────────────────
  const alertWorker = new Worker(
    "alert-sweep",
    async (job) => processAlertSweepJob(job as any),
    { connection: redis, concurrency: 1 }
  );
  alertWorker.on("completed", (job) => log.info("alert-sweep completed", { jobId: job.id }));
  alertWorker.on("failed",    (job, err) => log.error("alert-sweep failed", { jobId: job?.id, error: err.message }));

  // ── MatView Refresh Worker ────────────────────────────────────────────
  const matviewWorker = new Worker(
    "matview",
    async (job) => processMatViewRefreshJob(job as any),
    { connection: redis, concurrency: 1 } // one refresh at a time (CONCURRENTLY in SQL)
  );
  matviewWorker.on("completed", (job) => log.info("matview refresh completed", { jobId: job.id }));
  matviewWorker.on("failed",    (job, err) => log.error("matview refresh failed", { jobId: job?.id, error: err.message }));

  // ── Partition Maintenance Worker ──────────────────────────────────────
  const partitionWorker = new Worker(
    "partition",
    async (job) => processPartitionMaintenanceJob(job as any),
    { connection: redis, concurrency: 1 }
  );
  partitionWorker.on("completed", (job) => log.info("partition maintenance completed", { jobId: job.id }));
  partitionWorker.on("failed",    (job, err) => log.error("partition maintenance failed", { jobId: job?.id, error: err.message }));

  // ── Outbox Poller ─────────────────────────────────────────────────────
  const stopPoller = startOutboxPoller();
  log.info("outbox poller started", { intervalMs: 5000 });

  // ── Cron jobs ─────────────────────────────────────────────────────────
  const alertQ     = getAlertQueue();
  const matviewQ   = getMatViewQueue();
  const partitionQ = getPartitionQueue();

  await alertQ.upsertJobScheduler(
    "alert-sweep-cron",
    ALERT_SWEEP_REPEAT,
    { name: "alert:sweep", data: { triggeredAt: new Date().toISOString() } }
  );

  await matviewQ.upsertJobScheduler(
    "matview-refresh-cron",
    MATVIEW_REFRESH_REPEAT,
    { name: "matview:refresh", data: { triggeredAt: new Date().toISOString() } }
  );

  await partitionQ.upsertJobScheduler(
    "partition-maintain-cron",
    PARTITION_MAINTAIN_REPEAT,
    { name: "partition:maintain", data: { triggeredAt: new Date().toISOString(), monthsAhead: 2 } }
  );

  log.info("cron jobs scheduled", {
    alertSweep:    ALERT_SWEEP_REPEAT.pattern,
    matviewRefresh: MATVIEW_REFRESH_REPEAT.pattern,
    partitionMaintain: PARTITION_MAINTAIN_REPEAT.pattern,
  });

  // ── Graceful shutdown ─────────────────────────────────────────────────
  const shutdown = async (signal: string) => {
    log.info("shutting down", { signal });
    stopPoller();
    await Promise.all([
      guardianWorker.close(),
      alertWorker.close(),
      matviewWorker.close(),
      partitionWorker.close(),
    ]);
    await closeRedisConnection();
    process.exit(0);
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT",  () => shutdown("SIGINT"));

  log.info("worker ready — listening for jobs");
}

main().catch((err) => {
  console.error("[worker] fatal startup error:", err);
  process.exit(1);
});
