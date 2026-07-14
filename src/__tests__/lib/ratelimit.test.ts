/**
 * These tests exercise the in-memory fallback limiter (no UPSTASH_* env in
 * test). aiLimiter allows 5/min, authLimiter 10/min.
 */
import { aiLimiter, authLimiter, enforceRateLimit } from "@/lib/ratelimit";

describe("ratelimit (in-memory fallback)", () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it("aiLimiter allows 5 requests then blocks the 6th", async () => {
    const key = "test:ai:sequence";
    for (let i = 0; i < 5; i++) {
      const result = await aiLimiter.limit(key);
      expect(result.success).toBe(true);
    }

    const sixth = await aiLimiter.limit(key);
    expect(sixth.success).toBe(false);
    expect(sixth.retryAfterSeconds).toBeGreaterThan(0);
    expect(sixth.retryAfterSeconds).toBeLessThanOrEqual(60);
  });

  it("tracks keys independently", async () => {
    const keyA = "test:ai:independent-a";
    const keyB = "test:ai:independent-b";
    for (let i = 0; i < 5; i++) {
      await aiLimiter.limit(keyA);
    }
    expect((await aiLimiter.limit(keyA)).success).toBe(false);
    expect((await aiLimiter.limit(keyB)).success).toBe(true);
  });

  it("authLimiter allows 10 requests then blocks the 11th", async () => {
    const key = "test:auth:sequence";
    for (let i = 0; i < 10; i++) {
      expect((await authLimiter.limit(key)).success).toBe(true);
    }
    expect((await authLimiter.limit(key)).success).toBe(false);
  });

  it("frees budget after the 60s window slides past", async () => {
    jest.useFakeTimers({ now: new Date("2026-07-13T12:00:00Z") });
    const key = "test:ai:window";

    for (let i = 0; i < 5; i++) {
      await aiLimiter.limit(key);
    }
    expect((await aiLimiter.limit(key)).success).toBe(false);

    jest.setSystemTime(new Date("2026-07-13T12:01:01Z"));
    expect((await aiLimiter.limit(key)).success).toBe(true);
  });

  it("enforceRateLimit returns null when allowed and 429 when blocked", async () => {
    const key = "test:ai:enforce";
    const allowed = await enforceRateLimit(aiLimiter, key);
    expect(allowed).toBeNull();

    for (let i = 0; i < 4; i++) {
      await aiLimiter.limit(key);
    }

    const blocked = await enforceRateLimit(aiLimiter, key);
    expect(blocked).not.toBeNull();
    expect(blocked?.status).toBe(429);
    expect(Number(blocked?.headers.get("Retry-After"))).toBeGreaterThan(0);
  });
});
