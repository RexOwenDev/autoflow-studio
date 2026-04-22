/**
 * Rate limiter token-bucket tests.
 */

import { afterEach, describe, expect, it } from "vitest";
import { checkRateLimit, resetRateLimitBuckets } from "@/lib/rate-limit";

describe("checkRateLimit (token bucket)", () => {
  afterEach(() => resetRateLimitBuckets());

  it("allows requests up to capacity on a fresh bucket", () => {
    for (let i = 0; i < 5; i++) {
      const r = checkRateLimit("test-1", { capacity: 5, refillRate: 1 });
      expect(r.ok).toBe(true);
      expect(r.remaining).toBe(5 - 1 - i);
    }
  });

  it("rejects requests beyond capacity", () => {
    for (let i = 0; i < 3; i++) {
      checkRateLimit("test-2", { capacity: 3, refillRate: 0.01 });
    }
    const r = checkRateLimit("test-2", { capacity: 3, refillRate: 0.01 });
    expect(r.ok).toBe(false);
    expect(r.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("isolates buckets by key", () => {
    for (let i = 0; i < 3; i++) {
      checkRateLimit("key-a", { capacity: 3, refillRate: 0.01 });
    }
    const a = checkRateLimit("key-a", { capacity: 3, refillRate: 0.01 });
    expect(a.ok).toBe(false);
    const b = checkRateLimit("key-b", { capacity: 3, refillRate: 0.01 });
    expect(b.ok).toBe(true);
  });

  it("refills tokens based on elapsed time", async () => {
    // Drain the bucket.
    for (let i = 0; i < 3; i++) {
      checkRateLimit("test-refill", { capacity: 3, refillRate: 10 });
    }
    // Should be empty now.
    const afterDrain = checkRateLimit("test-refill", { capacity: 3, refillRate: 10 });
    expect(afterDrain.ok).toBe(false);

    // Wait 150ms — refillRate 10/s → 1.5 tokens refilled → at least 1 token available.
    await new Promise((resolve) => setTimeout(resolve, 150));
    const afterWait = checkRateLimit("test-refill", { capacity: 3, refillRate: 10 });
    expect(afterWait.ok).toBe(true);
  });

  it("caps refilled tokens at capacity", async () => {
    checkRateLimit("test-cap", { capacity: 3, refillRate: 100 });
    // Wait long enough that refill would exceed capacity.
    await new Promise((resolve) => setTimeout(resolve, 100));
    const r = checkRateLimit("test-cap", { capacity: 3, refillRate: 100 });
    // After consuming one more, remaining should still be capped.
    expect(r.remaining).toBeLessThanOrEqual(3);
  });
});
