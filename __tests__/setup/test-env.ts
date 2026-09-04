// ── Test environment variables ──────────────────────────────
// Loaded by vitest via setupFiles in vitest.config.ts
// NEVER commit real secrets here — use placeholders only.

process.env.JWT_SECRET = 'test-jwt-secret-must-be-at-least-32-chars-long-xxxxx';
// NOTE: NODE_ENV is already 'test' under vitest — do not redefine it
// (Object.defineProperty on process.env throws on recent Node versions).
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
// NOTE: leave Redis unconfigured so lib/rate-limit.ts uses its in-memory
// fallback. A bogus URL would make tests hit the network and time out.
process.env.UPSTASH_REDIS_REST_URL = '';
process.env.UPSTASH_REDIS_REST_TOKEN = '';
process.env.KV_REST_API_URL = '';
process.env.KV_REST_API_TOKEN = '';
process.env.RESEND_API_KEY = 're_test_1234567890abcdef';
process.env.EMAIL_FROM = 'test@hashcode.dev';
process.env.RESEND_FROM_NAME = 'HashCode';
process.env.RESEND_FROM_EMAIL = 'test@hashcode.dev';
process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000';
process.env.ADMIN_EMAIL = 'admin@hashcode.dev';
