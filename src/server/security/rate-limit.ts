import { getConfig } from "@/lib/env";

/**
 * Fixed-window rate limiter (in-memory).
 *
 * HONEST LIMITATION: state is per server instance. On serverless deployments
 * this bounds bursts per instance, not globally. For hard multi-instance
 * limits, swap in a shared store (e.g. Upstash Redis) behind the same
 * `checkRateLimit` signature.
 */

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

export function checkRateLimit(key: string, overrides?: { max?: number; windowSeconds?: number }): RateLimitResult {
  const cfg = getConfig().rateLimit;
  const max = overrides?.max ?? cfg.max;
  const windowSeconds = overrides?.windowSeconds ?? cfg.windowSeconds;
  const now = Date.now();

  let bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    bucket = { count: 0, resetAt: now + windowSeconds * 1000 };
    buckets.set(key, bucket);
  }
  bucket.count += 1;

  // Opportunistic cleanup so the map can't grow unbounded.
  if (buckets.size > 10_000) {
    for (const [k, b] of buckets) {
      if (b.resetAt <= now) buckets.delete(k);
    }
  }

  const ok = bucket.count <= max;
  return {
    ok,
    remaining: Math.max(0, max - bucket.count),
    retryAfterSeconds: ok ? 0 : Math.ceil((bucket.resetAt - now) / 1000),
  };
}

/** Test helper. */
export function resetRateLimiter(): void {
  buckets.clear();
}
