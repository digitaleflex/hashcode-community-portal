import { randomBytes, createHash } from 'crypto';

// ── PURE CRYPTO UTILITIES (no database dependency) ──────

export function generateOTP(): string {
  const buffer = randomBytes(4);
  // Use unsigned right shift to avoid negative numbers
  const value = (((buffer[0] << 24) | (buffer[1] << 16) | (buffer[2] << 8) | buffer[3]) >>> 0) % 100000000;
  return value.toString().padStart(8, '0');
}

export function generateMagicToken(): string {
  return randomBytes(48).toString('base64url');
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
