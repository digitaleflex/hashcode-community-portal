// ── SERVER-SIDE VALIDATION ───────────────────────────────
// Pure functions with no DB imports so they stay unit-testable.
// Mirrors lib/validation.ts (client-side) with stricter type checks.

export const MEMBER_STATUSES = ['imported', 'claimed', 'verified', 'updated', 'active', 'inactive'] as const;
export const LEVELS = ['beginner', 'intermediate', 'advanced', 'expert'] as const;
export const OCCUPATIONS = ['student', 'professional', 'entrepreneur', 'freelancer', 'seeking_opportunities', 'other'] as const;
export const GENDERS = ['male', 'female', 'other', 'prefer_not_to_say'] as const;
export const COMM_PREF_KEYS = ['community', 'security', 'ai', 'cloud', 'training', 'workshops', 'opportunities', 'projects'] as const;

export type Validation<T> = { ok: true; value: T } | { ok: false; error: string };

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function validateEmail(email: unknown): Validation<string> {
  if (typeof email !== 'string' || !email.trim()) return { ok: false, error: 'Email requis' };
  const normalized = email.trim().toLowerCase();
  if (normalized.length > 254 || !EMAIL_REGEX.test(normalized)) {
    return { ok: false, error: 'Email invalide' };
  }
  return { ok: true, value: normalized };
}

export function validateUUID(value: unknown): boolean {
  return typeof value === 'string' && UUID_REGEX.test(value);
}

export function validateOptionalString(
  value: unknown,
  field: string,
  maxLength: number
): Validation<string | null> {
  if (value === null || value === undefined || value === '') return { ok: true, value: null };
  if (typeof value !== 'string') return { ok: false, error: `${field} doit être une chaîne de caractères` };
  const trimmed = value.trim();
  if (trimmed.length > maxLength) {
    return { ok: false, error: `${field} est trop long (max ${maxLength} caractères)` };
  }
  return { ok: true, value: trimmed || null };
}

export function validateOptionalAge(value: unknown): Validation<number | null> {
  if (value === null || value === undefined || value === '') return { ok: true, value: null };
  const num = typeof value === 'string' ? Number.parseInt(value, 10) : value;
  if (typeof num !== 'number' || !Number.isInteger(num) || num < 16 || num > 99) {
    return { ok: false, error: 'Âge invalide (entre 16 et 99 ans)' };
  }
  return { ok: true, value: num };
}

export function validateEnum<E extends readonly string[]>(
  value: unknown,
  allowed: E,
  field: string
): Validation<E[number]> {
  if (typeof value !== 'string' || !allowed.includes(value as E[number])) {
    return { ok: false, error: `${field} invalide` };
  }
  return { ok: true, value: value as E[number] };
}

export function validateOptionalEnum<E extends readonly string[]>(
  value: unknown,
  allowed: E,
  field: string
): Validation<E[number] | null> {
  if (value === null || value === undefined || value === '') return { ok: true, value: null };
  return validateEnum(value, allowed, field);
}

export function validateGender(value: unknown): Validation<(typeof GENDERS)[number] | null> {
  if (value === null || value === undefined || value === '') return { ok: true, value: null };
  return validateEnum(value, GENDERS, 'Genre');
}

export function validateOptionalLinkedinUrl(value: unknown): Validation<string | null> {
  if (value === null || value === undefined || value === '') return { ok: true, value: null };
  if (typeof value !== 'string') return { ok: false, error: 'URL LinkedIn invalide' };
  const trimmed = value.trim();
  if (trimmed.length > 500) return { ok: false, error: 'URL LinkedIn trop longue' };
  try {
    const url = new URL(trimmed);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') {
      return { ok: false, error: 'URL LinkedIn invalide' };
    }
    if (!/(^|\.)linkedin\.com$/.test(url.hostname)) {
      return { ok: false, error: 'URL LinkedIn invalide (domaine linkedin.com attendu)' };
    }
    return { ok: true, value: trimmed };
  } catch {
    return { ok: false, error: 'URL LinkedIn invalide' };
  }
}

// Whitelist the communication preference keys: anything else in the payload
// (id, memberId, …) is dropped instead of being written to the database.
export function validateCommPrefs(value: unknown): Validation<Record<string, boolean>> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return { ok: false, error: 'Préférences de communication invalides' };
  }
  const result: Record<string, boolean> = {};
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    if ((COMM_PREF_KEYS as readonly string[]).includes(key)) {
      result[key] = raw === true;
    }
  }
  return { ok: true, value: result };
}

export function validatePoles(
  value: unknown
): Validation<{ slug: string; level: (typeof LEVELS)[number]; isPrimary: boolean }[]> {
  if (!Array.isArray(value)) return { ok: false, error: 'Pôles invalides' };
  if (value.length > 10) return { ok: false, error: 'Trop de pôles sélectionnés' };

  const seen = new Set<string>();
  const poles: { slug: string; level: (typeof LEVELS)[number]; isPrimary: boolean }[] = [];

  for (const item of value) {
    if (typeof item !== 'object' || item === null) return { ok: false, error: 'Pôle invalide' };
    const { slug, level, isPrimary } = item as Record<string, unknown>;
    if (typeof slug !== 'string' || !/^[a-z0-9-]{1,50}$/.test(slug)) {
      return { ok: false, error: 'Pôle invalide' };
    }
    if (seen.has(slug)) continue;
    seen.add(slug);

    const levelCheck = validateOptionalEnum(level, LEVELS, 'Niveau');
    if (!levelCheck.ok) return levelCheck;

    poles.push({ slug, level: levelCheck.value ?? 'beginner', isPrimary: isPrimary === true });
  }

  return { ok: true, value: poles };
}

export function validateInterestNames(value: unknown): Validation<string[]> {
  if (!Array.isArray(value)) return { ok: false, error: 'Intérêts invalides' };
  if (value.length > 50) return { ok: false, error: "Trop d'intérêts sélectionnés" };

  const names: string[] = [];
  for (const item of value) {
    if (typeof item !== 'string') return { ok: false, error: 'Intérêt invalide' };
    const trimmed = item.trim();
    // Ignore empty entries instead of failing the whole payload.
    if (!trimmed) continue;
    if (trimmed.length < 2 || trimmed.length > 100) return { ok: false, error: 'Intérêt invalide' };
    if (!names.includes(trimmed)) names.push(trimmed);
  }
  return { ok: true, value: names };
}

// Deterministic slug for interests created on the fly from their display name.
export function slugifyName(name: string): string {
  const slug = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50);
  return slug || 'interet';
}
