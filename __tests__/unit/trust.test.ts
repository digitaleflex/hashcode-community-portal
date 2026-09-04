import { describe, it, expect } from 'vitest';
import { computeTrustScore, TRUST_FLAG_KEYS } from '../../lib/trust';

describe('computeTrustScore', () => {
  it('returns 0 when no flag is set', () => {
    expect(
      computeTrustScore({
        emailVerified: false,
        linkedinVerified: false,
        identityVerified: false,
        contributor: false,
      })
    ).toBe(0);
  });

  it('counts each verified flag once', () => {
    expect(
      computeTrustScore({
        emailVerified: true,
        linkedinVerified: false,
        identityVerified: false,
        contributor: false,
      })
    ).toBe(1);
    expect(
      computeTrustScore({
        emailVerified: true,
        linkedinVerified: true,
        identityVerified: false,
        contributor: false,
      })
    ).toBe(2);
  });

  it('caps at the number of flag keys', () => {
    expect(
      computeTrustScore({
        emailVerified: true,
        linkedinVerified: true,
        identityVerified: true,
        contributor: true,
      })
    ).toBe(TRUST_FLAG_KEYS.length);
  });
});
