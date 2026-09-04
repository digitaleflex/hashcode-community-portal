import { describe, it, expect, beforeEach } from 'vitest';
import { rateLimit } from '../../lib/rate-limit';

describe('Rate Limiting', () => {
  beforeEach(() => {
    // Clear any existing rate limit entries
    // The in-memory fallback is used since Redis is not configured in tests
  });

  it('should allow requests within the limit', async () => {
    const key = `test-${Date.now()}`;
    const result = await rateLimit(key, 3, 60000);
    expect(result).toBe(true);
  });

  it('should block requests exceeding the limit', async () => {
    const key = `test-block-${Date.now()}`;
    
    // Make 3 requests (the limit)
    await rateLimit(key, 3, 60000);
    await rateLimit(key, 3, 60000);
    await rateLimit(key, 3, 60000);
    
    // 4th request should be blocked
    const result = await rateLimit(key, 3, 60000);
    expect(result).toBe(false);
  });

  it('should use different keys independently', async () => {
    const key1 = `test-key1-${Date.now()}`;
    const key2 = `test-key2-${Date.now()}`;
    
    // Exhaust key1
    await rateLimit(key1, 2, 60000);
    await rateLimit(key1, 2, 60000);
    
    // key2 should still work
    const result = await rateLimit(key2, 2, 60000);
    expect(result).toBe(true);
  });
});
