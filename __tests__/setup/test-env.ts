// ── Test environment variables ──────────────────────────────
// Loaded by vitest via setupFiles in vitest.config.ts
// NEVER commit real secrets here — use placeholders only.

process.env.JWT_SECRET = 'test-jwt-secret-must-be-at-least-32-chars-long-xxxxx';
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.UPSTASH_REDIS_REST_URL = 'https://test.upstash.io';
process.env.UPSTASH_REDIS_REST_TOKEN = 'test-upstash-token';
process.env.KV_REST_API_URL = '';
process.env.KV_REST_API_TOKEN = '';
process.env.RESEND_API_KEY = 're_test_1234567890abcdef';
process.env.EMAIL_FROM = 'test@hashcode.dev';
process.env.RESEND_FROM_NAME = 'HashCode';
process.env.RESEND_FROM_EMAIL = 'test@hashcode.dev';
process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000';
process.env.ADMIN_EMAIL = 'admin@hashcode.dev';
