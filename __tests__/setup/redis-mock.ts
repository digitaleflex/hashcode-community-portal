import { vi } from 'vitest';

/**
 * Mock factory for @upstash/redis.
 *
 * Usage:
 *   vi.mock('@upstash/redis', () => redisMock());
 */
export function redisMock() {
  return {
    Redis: vi.fn().mockImplementation(() => ({
      get: vi.fn().mockResolvedValue(null),
      set: vi.fn().mockResolvedValue('OK'),
      incr: vi.fn().mockResolvedValue(1),
      expire: vi.fn().mockResolvedValue(1),
    })),
    Ratelimit: vi.fn().mockImplementation((config: { limiter?: string }) => ({
      limit: vi.fn().mockImplementation(async () => ({
        success: true,
        limit: config.limiter ? 10 : 5,
        remaining: 9,
        reset: Date.now() + 60_000,
        pending: Promise.resolve(),
      })),
    })),
  };
}

/**
 * Preset: simulates a rate-limit exceeded response.
 */
export function redisMockRateLimited() {
  const m = redisMock();
  (m.Ratelimit as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => ({
    limit: vi.fn().mockResolvedValue({
      success: false,
      limit: 3,
      remaining: 0,
      reset: Date.now() + 60_000,
      pending: Promise.resolve(),
    }),
  }));
  return m;
}
