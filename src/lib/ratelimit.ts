import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export interface LimitResult {
  success: boolean;
  retryAfterSeconds: number;
}

export interface Limiter {
  limit(key: string): Promise<LimitResult>;
}

function hasUpstashEnv(): boolean {
  return Boolean(
    process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN,
  );
}

let warned = false;

const WINDOW_MS = 60_000;

/**
 * In-memory sliding window used when Upstash is not configured. Real
 * protection in dev / single-process only — serverless instances do not
 * share this Map, so production MUST configure Upstash.
 */
function memoryLimiter(requests: number): Limiter {
  if (!warned) {
    warned = true;
    console.warn(
      "[ratelimit] UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN not set — using in-memory rate limiting (per-process, dev only). Configure Upstash before production.",
    );
  }
  const hits = new Map<string, number[]>();
  return {
    async limit(key: string) {
      const now = Date.now();
      const windowStart = now - WINDOW_MS;
      const recent = (hits.get(key) ?? []).filter((t) => t > windowStart);
      if (recent.length >= requests) {
        hits.set(key, recent);
        const oldest = recent[0];
        const retryAfterSeconds = Math.max(
          1,
          Math.ceil((oldest + WINDOW_MS - now) / 1000),
        );
        return { success: false, retryAfterSeconds };
      }
      recent.push(now);
      hits.set(key, recent);
      return { success: true, retryAfterSeconds: 0 };
    },
  };
}

function upstashLimiter(requests: number, prefix: string): Limiter {
  const ratelimit = new Ratelimit({
    redis: Redis.fromEnv(),
    limiter: Ratelimit.slidingWindow(requests, "60 s"),
    prefix: `bloomsense:${prefix}`,
  });
  return {
    async limit(key: string) {
      const { success, reset } = await ratelimit.limit(key);
      const retryAfterSeconds = Math.max(
        1,
        Math.ceil((reset - Date.now()) / 1000),
      );
      return { success, retryAfterSeconds: success ? 0 : retryAfterSeconds };
    },
  };
}

function buildLimiter(requests: number, prefix: string): Limiter {
  return hasUpstashEnv()
    ? upstashLimiter(requests, prefix)
    : memoryLimiter(requests);
}

/** AI endpoints (quiz, mood board, image generation): 5 requests / minute. */
export const aiLimiter = buildLimiter(5, "ai");

/** Auth endpoints (register, credentials login): 10 requests / minute. */
export const authLimiter = buildLimiter(10, "auth");

/** Best-effort client identifier: session cookie first, then IP. */
export function clientKey(req: NextRequest): string {
  const session = req.cookies.get("bloom_session")?.value;
  if (session) return `session:${session}`;
  const forwarded = req.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() ?? req.ip ?? "unknown";
  return `ip:${ip}`;
}

/**
 * Applies a limiter and returns a 429 response when exceeded, or null when
 * the request may proceed.
 */
export async function enforceRateLimit(
  limiter: Limiter,
  key: string,
): Promise<NextResponse | null> {
  const result = await limiter.limit(key);
  if (result.success) return null;
  return NextResponse.json(
    { error: "Too many requests. Please slow down." },
    {
      status: 429,
      headers: { "Retry-After": String(result.retryAfterSeconds) },
    },
  );
}
