import { describe, it, expect } from 'vitest';
import { generateOTP, generateMagicToken, hashToken } from '../../lib/crypto';

describe('Auth Utilities', () => {
  describe('generateOTP', () => {
    it('should generate a 8-digit OTP', () => {
      const otp = generateOTP();
      expect(otp).toHaveLength(8);
      expect(/^\d{8}$/.test(otp)).toBe(true);
    });

    it('should generate different OTPs across many calls', () => {
      // A single pair collides with probability 1e-8; over 200 draws a run of
      // identical codes would be astronomically unlikely, making the test stable.
      const otps = new Set(Array.from({ length: 200 }, () => generateOTP()));
      expect(otps.size).toBeGreaterThan(1);
    });
  });

  describe('generateMagicToken', () => {
    it('should generate a base64url token', () => {
      const token = generateMagicToken();
      expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
    });

    it('should generate a token of sufficient length', () => {
      const token = generateMagicToken();
      // 48 bytes = 64 chars in base64url
      expect(token.length).toBeGreaterThanOrEqual(60);
    });

    it('should generate different tokens on successive calls', () => {
      const token1 = generateMagicToken();
      const token2 = generateMagicToken();
      expect(token1).not.toBe(token2);
    });
  });

  describe('hashToken', () => {
    it('should return a SHA-256 hash', () => {
      const hash = hashToken('test-token');
      expect(hash).toHaveLength(64); // SHA-256 produces 64 hex chars
      expect(/^[a-f0-9]+$/.test(hash)).toBe(true);
    });

    it('should be deterministic', () => {
      const hash1 = hashToken('test-token');
      const hash2 = hashToken('test-token');
      expect(hash1).toBe(hash2);
    });

    it('should produce different hashes for different inputs', () => {
      const hash1 = hashToken('token-1');
      const hash2 = hashToken('token-2');
      expect(hash1).not.toBe(hash2);
    });
  });
});
