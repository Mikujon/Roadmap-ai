// ── Queue Instances ───────────────────────────────────────────────────────
// Producers (Next.js API routes) import these to enqueue jobs.
// Workers import these for the connection reference only — they create
// their own Worker instances but connect to the same queue names.

import { Queue } from "bullmq";
import { getRedisConnection } from "./connection";
import type {
  GuardianJobData,
  AlertSweepJobData,
  DecisionsJobData,
  MatViewRefreshJobData,
  PartitionMaintenanceJobData,
} from "./jobs";
import { LLM_JOB_DEFAULTS } from "./jobs";

// ── Lazy singletons ───────────────────────────────────────────────────────

let _guardianQueue:   Queue<GuardianJobData>             | null = null;
let _alertQueue:      Queue<AlertSweepJobData>           | null = null;
let _decisionsQueue:  Queue<DecisionsJobData>            | null = null;
let _matviewQueue:    Queue<MatViewRefreshJobData>       | null = null;
let _partitionQueue:  Queue<PartitionMaintenanceJobData> | null = null;

export function getGuardianQueue(): Queue<GuardianJobData> {
  if (!_guardianQueue) {
    _guardianQueue = new Queue<GuardianJobData>("guardian", {
      connection:        getRedisConnection(),
      defaultJobOptions: LLM_JOB_DEFAULTS,
    });
  }
  return _guardianQueue;
}

export function getAlertQueue(): Queue<AlertSweepJobData> {
  if (!_alertQueue) {
    _alertQueue = new Queue<AlertSweepJobData>("alert-sweep", {
      connection:        getRedisConnection(),
      defaultJobOptions: LLM_JOB_DEFAULTS,
    });
  }
  return _alertQueue;
}

export function getDecisionsQueue(): Queue<DecisionsJobData> {
  if (!_decisionsQueue) {
    _decisionsQueue = new Queue<DecisionsJobData>("decisions", {
      connection:        getRedisConnection(),
      defaultJobOptions: LLM_JOB_DEFAULTS,
    });
  }
  return _decisionsQueue;
}

export function getMatViewQueue(): Queue<MatViewRefreshJobData> {
  if (!_matviewQueue) {
    _matviewQueue = new Queue<MatViewRefreshJobData>("matview", {
      connection:        getRedisConnection(),
      defaultJobOptions: { attempts: 2, removeOnComplete: { count: 20 }, removeOnFail: { count: 10 } },
    });
  }
  return _matviewQueue;
}

export function getPartitionQueue(): Queue<PartitionMaintenanceJobData> {
  if (!_partitionQueue) {
    _partitionQueue = new Queue<PartitionMaintenanceJobData>("partition", {
      connection:        getRedisConnection(),
      defaultJobOptions: { attempts: 2, removeOnComplete: { count: 10 }, removeOnFail: { count: 10 } },
    });
  }
  return _partitionQueue;
}

// ── Enqueue helpers ───────────────────────────────────────────────────────

export async function enqueueGuardianRun(
  projectId: string,
  projectName: string,
  opts: { force?: boolean } = {}
): Promise<string> {
  const q     = getGuardianQueue();
  const jobId = `guardian:${projectId}`;
  const job   = await q.add(
    "guardian:run",
    { projectId, projectName, triggeredAt: new Date().toISOString(), force: opts.force },
    { jobId, priority: 1 } // dedup: only one pending run per project
  );
  return job.id ?? jobId;
}

export async function enqueueAlertSweep(projectId?: string): Promise<string> {
  const q   = getAlertQueue();
  const job = await q.add(
    "alert:sweep",
    { projectId, triggeredAt: new Date().toISOString() },
    { priority: 2 }
  );
  return job.id ?? "alert-sweep";
}

export async function enqueueDecisionsRun(projectIds: string[]): Promise<string> {
  const q   = getDecisionsQueue();
  const job = await q.add(
    "decisions:run",
    { projectIds, triggeredAt: new Date().toISOString() },
    { priority: 3 }
  );
  return job.id ?? "decisions";
}

export async function enqueueMatViewRefresh(
  views?: MatViewRefreshJobData["views"]
): Promise<string> {
  const q     = getMatViewQueue();
  const jobId = "matview:refresh"; // only one refresh pending at a time (dedup)
  const job   = await q.add(
    "matview:refresh",
    { triggeredAt: new Date().toISOString(), views },
    { jobId, priority: 5 }
  );
  return job.id ?? jobId;
}

export async function enqueuePartitionMaintenance(): Promise<string> {
  const q     = getPartitionQueue();
  const jobId = "partition:maintain";
  const job   = await q.add(
    "partition:maintain",
    { triggeredAt: new Date().toISOString(), monthsAhead: 2 },
    { jobId }
  );
  return job.id ?? jobId;
}
