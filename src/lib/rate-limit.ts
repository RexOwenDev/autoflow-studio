import "server-only";

/**
 * Simple in-memory token-bucket rate limiter.
 *
 * Phase 7 ships this for audit export + SSO token minting. Phase 8 swaps in
 * Upstash Redis behind the same interface so the limiter survives process
 * restarts and scales horizontally.
 */

interface Bucket {
  tokens: number;
  lastRefill: number;
}

interface LimiterConfig {
  /** Max tokens in the bucket. */
  capacity: number;
  /** Tokens refilled per second. */
  refillRate: number;
}

const BUCKETS = new Map<string, Bucket>();

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

export function checkRateLimit(key: string, config: LimiterConfig): RateLimitResult {
  const now = Date.now();
  const existing = BUCKETS.get(key);
  const bucket: Bucket = existing ?? { tokens: config.capacity, lastRefill: now };

  // Refill proportional to elapsed time.
  const elapsed = (now - bucket.lastRefill) / 1000;
  bucket.tokens = Math.min(config.capacity, bucket.tokens + elapsed * config.refillRate);
  bucket.lastRefill = now;

  if (bucket.tokens < 1) {
    BUCKETS.set(key, bucket);
    const retryAfterSeconds = Math.ceil((1 - bucket.tokens) / config.refillRate);
    return { ok: false, remaining: 0, retryAfterSeconds };
  }

  bucket.tokens -= 1;
  BUCKETS.set(key, bucket);
  return {
    ok: true,
    remaining: Math.floor(bucket.tokens),
    retryAfterSeconds: 0,
  };
}

// Test helper — resets all buckets so tests don't interfere with each other.
export function resetRateLimitBuckets(): void {
  BUCKETS.clear();
}
