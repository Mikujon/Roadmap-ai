// ── Transactional Outbox Poller ───────────────────────────────────────────
// Polls outbox_events for unprocessed rows every POLL_INTERVAL_MS.
// For each pending event: enqueues the BullMQ job, marks as processed.
// Guarantees at-least-once delivery (idempotent jobs required).

import {
  enqueueGuardianRun,
  enqueueAlertSweep,
} from "@roadmap/queue";
import { outboxEventsTotal } from "@roadmap/metrics";
import { createLogger } from "@roadmap/logger";
import { db } from "../db";

const log = createLogger("outbox-poller");

const POLL_INTERVAL_MS = 5_000;  // 5 seconds
const BATCH_SIZE       = 20;     // process up to 20 events per tick

export function startOutboxPoller(): () => void {
  let running = true;

  async function poll() {
    while (running) {
      try {
        await processBatch();
      } catch (err) {
        log.error("poll error", { error: (err as Error).message });
      }
      await sleep(POLL_INTERVAL_MS);
    }
  }

  poll(); // fire-and-forget — errors are caught inside

  return () => { running = false; };
}

async function processBatch(): Promise<void> {
  // Claim a batch atomically using a raw UPDATE ... RETURNING to prevent
  // concurrent workers from picking the same rows.
  const rows = await db.$queryRaw<Array<{
    id: string;
    queue: string;
    jobName: string;
    payload: Record<string, unknown>;
    domainEventId: string;
  }>>`
    UPDATE outbox_events
    SET    attempts    = attempts + 1,
           "lastError" = NULL
    WHERE  id IN (
      SELECT id FROM outbox_events
      WHERE  "processedAt" IS NULL
        AND  attempts < 5
      ORDER BY "createdAt"
      LIMIT  ${BATCH_SIZE}
      FOR UPDATE SKIP LOCKED
    )
    RETURNING id, queue, "jobName", payload, "domainEventId"
  `;

  if (rows.length === 0) return;

  log.debug("processing batch", { count: rows.length });

  for (const row of rows) {
    try {
      await dispatch(row);

      // Mark as processed
      await db.outboxEvent.update({
        where: { id: row.id },
        data:  { processedAt: new Date() },
      });

      outboxEventsTotal.inc({ queue: row.queue, outcome: "success" });
    } catch (err) {
      const msg = (err as Error).message;
      log.error("dispatch failed", { outboxId: row.id, queue: row.queue, error: msg });

      outboxEventsTotal.inc({ queue: row.queue, outcome: "failure" });

      await db.outboxEvent.update({
        where: { id: row.id },
        data:  { lastError: msg.slice(0, 500) },
      });
    }
  }
}

async function dispatch(row: {
  queue:   string;
  jobName: string;
  payload: Record<string, unknown>;
}): Promise<void> {
  const projectId = row.payload["projectId"]     as string | undefined;

  switch (row.queue) {
    case "guardian": {
      if (!projectId) return;
      const project = await db.project.findUnique({
        where:  { id: projectId },
        select: { name: true, status: true },
      });
      if (!project || project.status === "ARCHIVED" || project.status === "CLOSED") return;
      await enqueueGuardianRun(projectId, project.name);
      break;
    }

    case "alert-sweep": {
      await enqueueAlertSweep(projectId);
      break;
    }

    default:
      log.warn("unknown queue — skipping", { queue: row.queue });
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
