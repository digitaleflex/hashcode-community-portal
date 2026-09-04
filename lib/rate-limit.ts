import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// ── UPSTASH REDIS RATE LIMITING ──────────────────────────
// Production-safe, distributed rate limiting using Upstash Redis.
// Each (max, window) combination gets its own limiter so callers keep
// control over their limits — the parameters are never ignored.

let redis: Redis | null = null;
let redisChecked = false;
const ratelimiters = new Map<string, Ratelimit>();

function getRedis(): Redis | null {
  if (redisChecked) return redis;
  redisChecked = true;

  // Support both Upstash standard names and Vercel KV names
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

  if (!url || !token) {
    console.warn('Redis not configured. Set UPSTASH_REDIS_REST_URL/TOKEN or KV_REST_API_URL/TOKEN.');
    return null;
  }

  redis = new Redis({ url, token });
  return redis;
}

function getRatelimit(max: number, windowSeconds: number): Ratelimit | null {
  const r = getRedis();
  if (!r) return null;

  const key = `${max}:${windowSeconds}`;
  let rl = ratelimiters.get(key);
  if (!rl) {
    rl = new Ratelimit({
      redis: r,
      limiter: Ratelimit.slidingWindow(max, `${windowSeconds} s`),
      analytics: true,
      prefix: `hashcode:ratelimit:${key}`,
    });
    ratelimiters.set(key, rl);
  }
  return rl;
}

// ── IN-MEMORY FALLBACK ──────────────────────────────────
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

// Serverless environments must not keep timers alive at module scope:
// expired keys are purged lazily once the map grows past this size.
const MAX_TRACKED_KEYS = 10_000;

function purgeExpiredKeys(now: number) {
  if (rateLimitMap.size <= MAX_TRACKED_KEYS) return;
  for (const [key, entry] of rateLimitMap.entries()) {
    if (now > entry.resetAt) rateLimitMap.delete(key);
  }
}

function inMemoryRateLimit(key: string, max: number = 3, windowMs: number = 60000): boolean {
  const now = Date.now();
  purgeExpiredKeys(now);

  const entry = rateLimitMap.get(key);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (entry.count >= max) {
    return false;
  }

  entry.count++;
  return true;
}

// ── UNIFIED RATE LIMIT INTERFACE ─────────────────────────
export async function rateLimit(
  key: string,
  max: number = 3,
  windowMs: number = 60000
): Promise<boolean> {
  if (process.env.NODE_ENV === 'production' && !process.env.UPSTASH_REDIS_REST_URL && !process.env.KV_REST_API_URL) {
    throw new Error('Redis is required in production. Set UPSTASH_REDIS_REST_URL/TOKEN or KV_REST_API_URL/TOKEN.');
  }

  const rl = getRatelimit(max, Math.max(1, Math.floor(windowMs / 1000)));

  if (!rl) {
    // Fallback to in-memory if Redis not configured (only in development)
    return inMemoryRateLimit(key, max, windowMs);
  }

  const { success } = await rl.limit(key);
  return success;
}
