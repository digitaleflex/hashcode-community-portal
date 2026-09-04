// Edge-safe JWT secret helper — NO Node.js imports, NO db, NO resend.
// Source of truth for JWT_SECRET decoding, shared by middleware.ts (Edge Runtime)
// and lib/auth.ts (Node runtime). Uses only Web APIs (TextEncoder) available in Edge.

let _jwtSecret: Uint8Array | null = null;

const getJwtSecretBytes = (): Uint8Array => {
  if (!_jwtSecret) {
    if (!process.env.JWT_SECRET) {
      throw new Error(
        "JWT_SECRET is required. Set it in .env.local or Vercel environment variables."
      );
    }
    if (process.env.JWT_SECRET.length < 32) {
      throw new Error("JWT_SECRET must be at least 32 characters long for security.");
    }
    _jwtSecret = new TextEncoder().encode(process.env.JWT_SECRET);
  }
  return _jwtSecret;
};

// Proxy so existing `JWT_SECRET.xxx` usages work transparently at call-site
export const JWT_SECRET: Uint8Array = new Proxy(new Uint8Array(0), {
  get(_t, prop) {
    return Reflect.get(getJwtSecretBytes(), prop);
  },
});

// Getter for middleware (Edge runtime)
export function getJwtSecret() {
  return getJwtSecretBytes();
}
