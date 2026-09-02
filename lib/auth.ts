import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { db } from "./db";
import { authTokens, members } from "./db/schema";
import { eq, and, gt } from "drizzle-orm";
import { Resend } from "resend";
import { generateOTP, generateMagicToken, hashToken } from "./crypto";

// Re-export crypto utilities for backward compatibility
export { generateOTP, generateMagicToken, hashToken };

// ── SECURITY: Validate JWT_SECRET at startup ──────────────
if (!process.env.JWT_SECRET) {
  throw new Error(
    "JWT_SECRET is required. Set it in .env.local or Vercel environment variables."
  );
}
if (process.env.JWT_SECRET.length < 32) {
  throw new Error("JWT_SECRET must be at least 32 characters long for security.");
}

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET);
const SESSION_COOKIE = "hashcode_session";
const SESSION_DURATION = 60 * 60 * 24 * 7; // 7 days

// ── RATE LIMITING ────────────────────────────────────────
// Uses Upstash Redis in production, in-memory fallback for development
import { rateLimit as distributedRateLimit } from './rate-limit';

export { distributedRateLimit as rateLimit };

// ── JWT SESSION ──────────────────────────────────────────

export async function createSessionToken(memberId: string, email: string): Promise<string> {
  return new SignJWT({ memberId, email })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION}s`)
    .sign(JWT_SECRET);
}

export async function verifySessionToken(token: string): Promise<{ memberId: string; email: string } | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return { memberId: payload.memberId as string, email: payload.email as string };
  } catch {
    return null;
  }
}

export async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

export async function setSessionCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_DURATION,
    path: "/",
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

// ── OTP FLOW (with hashed storage) ───────────────────────

export async function createOTPToken(memberId: string): Promise<string> {
  const token = generateOTP();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  await db.delete(authTokens).where(and(eq(authTokens.memberId, memberId), eq(authTokens.type, "otp")));

  await db.insert(authTokens).values({
    token: tokenHash, // Store hashed OTP for security
    memberId,
    type: "otp",
    expiresAt,
  });

  return token; // Return plain token to send via email
}

export async function verifyOTPToken(memberId: string, code: string): Promise<boolean> {
  const tokenHash = hashToken(code);

  const tokens = await db
    .select()
    .from(authTokens)
    .where(
      and(
        eq(authTokens.memberId, memberId),
        eq(authTokens.type, "otp"),
        eq(authTokens.token, tokenHash),
        eq(authTokens.used, false),
        gt(authTokens.expiresAt, new Date())
      )
    );

  if (tokens.length === 0) return false;

  await db
    .update(authTokens)
    .set({ used: true })
    .where(eq(authTokens.id, tokens[0].id));

  return true;
}

// ── MAGIC LINK FLOW (with hashed storage) ────────────────

export async function createMagicLinkToken(memberId: string): Promise<string> {
  const token = generateMagicToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

  await db.delete(authTokens).where(and(eq(authTokens.memberId, memberId), eq(authTokens.type, "magic_link")));

  await db.insert(authTokens).values({
    token: tokenHash,
    memberId,
    type: "magic_link",
    expiresAt,
  });

  return token;
}

export async function verifyMagicLinkToken(token: string): Promise<string | null> {
  const tokenHash = hashToken(token);

  const tokens = await db
    .select()
    .from(authTokens)
    .where(
      and(
        eq(authTokens.token, tokenHash),
        eq(authTokens.type, "magic_link"),
        eq(authTokens.used, false),
        gt(authTokens.expiresAt, new Date())
      )
    );

  if (tokens.length === 0) return null;

  await db
    .update(authTokens)
    .set({ used: true })
    .where(eq(authTokens.id, tokens[0].id));

  return tokens[0].memberId;
}

// ── EMAIL SENDING ────────────────────────────────────────

if (!process.env.RESEND_API_KEY) {
  console.warn("RESEND_API_KEY is not set. Email sending will fail.");
}
const resend = new Resend(process.env.RESEND_API_KEY);

async function sendEmail(to: string, subject: string, html: string) {
  if (!process.env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY not configured");
  }
  await resend.emails.send({
    from: `${process.env.RESEND_FROM_NAME} <${process.env.RESEND_FROM_EMAIL}>`,
    to,
    subject,
    html,
  });
}

export async function sendOTPEmail(email: string, code: string) {
  const html = `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px; text-align: center;">
      <div style="background: #1a1a2e; color: #fff; padding: 20px; border-radius: 12px 12px 0 0;">
        <h1 style="margin: 0; font-size: 20px;">Code de vérification HASHCODE</h1>
      </div>
      <div style="border: 1px solid #e5e7eb; border-top: none; padding: 40px 20px; border-radius: 0 0 12px 12px;">
        <p style="color: #6b7280; margin: 0 0 24px;">Entre ce code pour accéder à ton profil :</p>
        <div style="font-size: 40px; font-weight: bold; letter-spacing: 12px; color: #1a1a2e; margin: 32px 0; font-family: monospace;">
          ${code}
        </div>
        <p style="color: #9ca3af; font-size: 12px;">
          Ce code expire dans <strong>10 minutes</strong>.<br/>
          Si tu n'as pas demandé ce code, ignore ce message.
        </p>
      </div>
    </div>
  `;
  await sendEmail(email, "Ton code de vérification HASHCODE", html);
}

export async function sendMagicLinkEmail(email: string, token: string) {
  const url = `${process.env.NEXT_PUBLIC_APP_URL}/auth/magic-link?token=${token}`;

  const html = `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px; text-align: center;">
      <div style="background: #1a1a2e; color: #fff; padding: 20px; border-radius: 12px 12px 0 0;">
        <h1 style="margin: 0; font-size: 20px;">Connexion à HASHCODE</h1>
      </div>
      <div style="border: 1px solid #e5e7eb; border-top: none; padding: 40px 20px; border-radius: 0 0 12px 12px;">
        <p style="color: #6b7280; margin: 0 0 24px;">Clique sur le bouton ci-dessous pour accéder à ton profil :</p>
        <a href="${url}" style="display: inline-block; background: #1a1a2e; color: #fff; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">
          Accéder à mon profil
        </a>
        <p style="color: #9ca3af; font-size: 12px; margin-top: 24px;">
          Ce lien expire dans <strong>15 minutes</strong>.<br/>
          Si tu n'as pas demandé ce lien, ignore ce message.
        </p>
      </div>
    </div>
  `;
  await sendEmail(email, "Ton lien de connexion HASHCODE", html);
}

// ── MEMBER LOOKUP ────────────────────────────────────────

export async function findMemberByEmail(email: string) {
  const normalized = email.trim().toLowerCase();
  const results = await db.select().from(members).where(eq(members.email, normalized));
  return results.length > 0 ? results[0] : null;
}

// ── ADMIN CHECK ───────────────────────────────────────────

export async function requireAdmin() {
  const session = await getSession();
  if (!session) return { session: null, error: NextResponse.json({ error: 'Non authentifié' }, { status: 401 }) };

  const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase();
  const isAdmin = adminEmail && session.email.toLowerCase() === adminEmail;

  if (!isAdmin) {
    return { session, error: NextResponse.json({ error: 'Accès admin requis' }, { status: 403 }) };
  }

  return { session, error: null };
}

// ── MEMBER CRUD ───────────────────────────────────────────

export async function createMember(data: any) {
  const {
    email,
    firstName,
    lastName,
    age,
    phone,
    city,
    country,
    status = 'imported',
  } = data;

  if (!email || typeof email !== 'string') {
    throw new Error('Email requis');
  }

  const normalizedEmail = email.trim().toLowerCase();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    throw new Error('Email invalide');
  }

  const existing = await findMemberByEmail(normalizedEmail);
  if (existing) {
    throw new Error('Email déjà utilisé');
  }

  const [member] = await db
    .insert(members)
    .values({
      email: normalizedEmail,
      firstName,
      lastName,
      age,
      phone,
      city,
      country,
      status,
    })
    .returning();

  return member;
}

export async function updateMember(memberId: string, data: any) {
  const allowedFields = ['firstName', 'lastName', 'age', 'country', 'city', 'phone', 'status'] as const;

  const updates: any = {};
  for (const field of allowedFields) {
    if (data[field] !== undefined) updates[field] = data[field];
  }

  if (Object.keys(updates).length === 0) {
    throw new Error('Aucun champ à mettre à jour');
  }

  updates.updatedAt = new Date();

  const [member] = await db
    .update(members)
    .set(updates)
    .where(eq(members.id, memberId))
    .returning();

  return member;
}

export async function deleteMember(memberId: string) {
  const [member] = await db
    .delete(members)
    .where(eq(members.id, memberId))
    .returning({ id: members.id });

  return member;
}