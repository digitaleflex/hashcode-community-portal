import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// ── UPSTASH REDIS RATE LIMITING ──────────────────────────
// Production-safe, distributed rate limiting using Upstash Redis

let redis: Redis | null = null;
let ratelimit: Ratelimit | null = null;

function getRedis(): Redis | null {
  if (redis) return redis;

  // Support both Upstash standard names and Vercel KV names
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

  if (!url || !token) {
    console.warn('Redis not configured. Set UPSTASH_REDIS_REST_URL/TOKEN or KV_REST_API_URL/TOKEN. Using in-memory fallback.');
    return null;
  }

  redis = new Redis({ url, token });
  return redis;
}

function getRatelimit(): Ratelimit | null {
  if (ratelimit) return ratelimit;

  const r = getRedis();
  if (!r) return null;

  ratelimit = new Ratelimit({
    redis: r,
    limiter: Ratelimit.slidingWindow(3, '60 s'), // 3 requests per 60 seconds
    analytics: true,
    prefix: 'hashcode:ratelimit',
  });

  return ratelimit;
}

// ── IN-MEMORY FALLBACK ──────────────────────────────────
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function inMemoryRateLimit(key: string, max: number = 3, windowMs: number = 60000): boolean {
  const now = Date.now();
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
  const rl = getRatelimit();

  if (!rl) {
    // Fallback to in-memory if Redis not configured
    return inMemoryRateLimit(key, max, windowMs);
  }

  const { success } = await rl.limit(key);
  return success;
}

// ── CLEANUP (for in-memory fallback) ─────────────────────
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitMap.entries()) {
    if (now > entry.resetAt) {
      rateLimitMap.delete(key);
    }
  }
}, 60000);
