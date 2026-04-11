// ── Partition Maintenance Processor ──────────────────────────────────────
// Ensures future monthly partitions exist for domain_events.
// Runs on the 1st of each month via cron scheduler.
// Also archives (drops) partitions older than ARCHIVE_MONTHS.

import type { Job } from "bullmq";
import type { PartitionMaintenanceJobData } from "@roadmap/queue";
import { createLogger } from "@roadmap/logger";
import { db } from "../db";

const log = createLogger("partition-maintenance");

/** Drop partitions older than this many months (set to 0 to disable archival) */
const ARCHIVE_AFTER_MONTHS = 13;

interface PartitionRow {
  partition_name: string;
  created:        boolean;
}

export async function processPartitionMaintenanceJob(
  job: Job<PartitionMaintenanceJobData>
): Promise<void> {
  const { monthsAhead = 2 } = job.data;

  log.info("starting partition maintenance", { monthsAhead });

  // 1. Ensure future partitions exist
  const rows = await db.$queryRaw<PartitionRow[]>`
    SELECT * FROM ensure_domain_event_partitions(${monthsAhead}::int)
  `;

  for (const row of rows) {
    if (row.created) {
      log.info("partition created", { partition: row.partition_name });
    } else {
      log.debug("partition already exists", { partition: row.partition_name });
    }
  }

  // 2. Archive old partitions (detach + drop)
  if (ARCHIVE_AFTER_MONTHS > 0) {
    await archiveOldPartitions();
  }

  log.info("partition maintenance complete", {
    ensured: rows.filter(r => r.created).length,
    alreadyExisted: rows.filter(r => !r.created).length,
  });
}

async function archiveOldPartitions(): Promise<void> {
  // Find partitions older than ARCHIVE_AFTER_MONTHS
  const cutoffDate = new Date();
  cutoffDate.setMonth(cutoffDate.getMonth() - ARCHIVE_AFTER_MONTHS);
  const cutoffSuffix = cutoffDate.toISOString().slice(0, 7).replace("-", "_"); // e.g. "2025_03"

  // Query pg_inherits to list child partitions of domain_events
  const partitions = await db.$queryRaw<Array<{ partition_name: string }>>`
    SELECT c.relname AS partition_name
    FROM   pg_inherits i
    JOIN   pg_class    p ON p.oid = i.inhparent
    JOIN   pg_class    c ON c.oid = i.inhrelid
    WHERE  p.relname = 'domain_events'
      AND  c.relname LIKE 'domain_events_20%'
      AND  c.relname < ${'domain_events_' + cutoffSuffix}
      AND  c.relname != 'domain_events_default'
    ORDER BY c.relname
  `;

  for (const { partition_name } of partitions) {
    try {
      // Detach first (non-blocking), then drop
      await db.$executeRawUnsafe(
        `ALTER TABLE domain_events DETACH PARTITION "${partition_name}" CONCURRENTLY`
      );
      await db.$executeRawUnsafe(`DROP TABLE IF EXISTS "${partition_name}"`);
      log.info("partition archived", { partition: partition_name });
    } catch (err) {
      // Non-fatal — log and continue (partition may be in use or already gone)
      log.warn("could not archive partition", {
        partition: partition_name,
        error: (err as Error).message,
      });
    }
  }
}
