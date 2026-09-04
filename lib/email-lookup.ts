const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function sanitizeEmail(
  email: unknown
): { ok: true; email: string } | { ok: false; error: string } {
  if (!email || typeof email !== "string") {
    return { ok: false, error: "Email requis" };
  }

  const normalized = email.trim().toLowerCase();

  if (!EMAIL_REGEX.test(normalized) || normalized.length > 254) {
    return { ok: false, error: "Email invalide" };
  }

  return { ok: true, email: normalized };
}
