// ── Redis-backed AI Response Cache ────────────────────────────────────────
// Key = sha256(prompt_version + serialized_input).
// TTL defaults to 2 hours (GUARDIAN_CACHE_TTL_HOURS from core/constants).

import { createHash } from "crypto";
import type IORedis from "ioredis";

const DEFAULT_TTL_SEC = 2 * 60 * 60; // 2 hours

let _redis: IORedis | null = null;

/** Inject the IORedis connection (set once at worker startup). */
export function setRedis(redis: IORedis): void {
  _redis = redis;
}

function cacheKey(promptVersion: string, input: unknown): string {
  const hash = createHash("sha256")
    .update(promptVersion)
    .update(JSON.stringify(input))
    .digest("hex")
    .slice(0, 16);
  return `ai:cache:${promptVersion}:${hash}`;
}

export async function getCached<T>(
  promptVersion: string,
  input: unknown
): Promise<T | null> {
  if (!_redis) return null;
  try {
    const raw = await _redis.get(cacheKey(promptVersion, input));
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export async function setCached(
  promptVersion: string,
  input: unknown,
  value: unknown,
  ttlSec = DEFAULT_TTL_SEC
): Promise<void> {
  if (!_redis) return;
  try {
    await _redis.set(cacheKey(promptVersion, input), JSON.stringify(value), "EX", ttlSec);
  } catch {
    // Cache set failures are non-fatal
  }
}

export async function invalidateCache(projectId: string): Promise<void> {
  if (!_redis) return;
  try {
    const keys = await _redis.keys(`ai:cache:*`);
    // Filter keys containing the project ID substring (best-effort)
    const projectKeys = keys.filter(k => k.includes(projectId));
    if (projectKeys.length > 0) await _redis.del(...projectKeys);
  } catch {
    // Non-fatal
  }
}
