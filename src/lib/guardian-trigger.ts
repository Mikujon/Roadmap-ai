/**
 * Enqueues a Guardian analysis job for a project.
 * Non-blocking: job is picked up by apps/worker asynchronously.
 * Called after feature/sprint/risk mutations.
 *
 * Falls back gracefully if REDIS_URL is not configured (dev without worker).
 */
export async function triggerGuardian(
  projectId: string,
  projectName = "Unknown"
): Promise<void> {
  if (!projectId) return;
  if (!process.env.REDIS_URL) {
    // Worker not configured — silently skip (no Redis in this env)
    return;
  }
  try {
    // Dynamic import so Next.js doesn't bundle ioredis/bullmq into the edge runtime
    const { enqueueGuardianRun } = await import("@roadmap/queue");
    await enqueueGuardianRun(projectId, projectName);
  } catch (err) {
    // Non-fatal — Guardian is best-effort
    console.warn("[guardian-trigger] failed to enqueue job:", (err as Error).message);
  }
}
