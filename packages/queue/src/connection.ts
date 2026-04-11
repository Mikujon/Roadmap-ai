// ── Redis Connection Factory ──────────────────────────────────────────────
// Single IORedis connection shared across all queues and workers.
// Reads REDIS_URL from env; fails fast at startup if missing.

import IORedis from "ioredis";

let _connection: IORedis | null = null;

export function getRedisConnection(): IORedis {
  if (_connection) return _connection;

  const url = process.env.REDIS_URL;
  if (!url) {
    throw new Error(
      "[queue] REDIS_URL env var is required. " +
      "Set it to redis://localhost:6379 for local dev or your Upstash/Redis Cloud URL."
    );
  }

  _connection = new IORedis(url, {
    maxRetriesPerRequest: null, // required by BullMQ
    enableReadyCheck:     false,
    lazyConnect:          false,
  });

  _connection.on("error", (err) => {
    console.error("[redis] connection error:", err.message);
  });

  return _connection;
}

/** Call this on worker process shutdown to cleanly close the connection. */
export async function closeRedisConnection(): Promise<void> {
  if (_connection) {
    await _connection.quit();
    _connection = null;
  }
}
