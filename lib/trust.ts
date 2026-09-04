export const TRUST_FLAG_KEYS = [
  'emailVerified',
  'linkedinVerified',
  'identityVerified',
  'contributor',
] as const;

export type TrustFlags = Record<(typeof TRUST_FLAG_KEYS)[number], boolean>;

export function computeTrustScore(row: TrustFlags): number {
  return TRUST_FLAG_KEYS.reduce((acc, k) => acc + (row[k] ? 1 : 0), 0);
}
