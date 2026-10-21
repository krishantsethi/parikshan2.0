import { beforeEach, describe, expect, it } from "vitest";
import { checkRateLimit, resetRateLimiter } from "@/server/security/rate-limit";

describe("fixed-window rate limiter", () => {
  beforeEach(() => resetRateLimiter());

  it("allows requests up to the limit then blocks", () => {
    for (let i = 0; i < 5; i++) {
      expect(checkRateLimit("test-key", { max: 5, windowSeconds: 60 }).ok).toBe(true);
    }
    const blocked = checkRateLimit("test-key", { max: 5, windowSeconds: 60 });
    expect(blocked.ok).toBe(false);
    expect(blocked.remaining).toBe(0);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("isolates buckets by key", () => {
    checkRateLimit("ip-a:login", { max: 1, windowSeconds: 60 });
    expect(checkRateLimit("ip-a:login", { max: 1, windowSeconds: 60 }).ok).toBe(false);
    expect(checkRateLimit("ip-b:login", { max: 1, windowSeconds: 60 }).ok).toBe(true);
  });

  it("reports remaining capacity", () => {
    expect(checkRateLimit("remaining", { max: 3, windowSeconds: 60 }).remaining).toBe(2);
  });
});
