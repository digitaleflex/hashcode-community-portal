import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { members } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import {
  verifyOTPToken,
  setSessionCookie,
  createSessionToken,
  rateLimit,
} from "@/lib/auth";

// ── SIMPLE VALIDATION ─────────────────────────────────
function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function isValidOTP(code: string): boolean {
  return /^\d{6}$/.test(code)
}

function sanitizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

export async function POST(request: Request) {
  try {
    // ── PARSE BODY ─────────────────────────────────────
    const { email, code } = await request.json()

    if (!email || typeof email !== "string" || !code || typeof code !== "string") {
      return NextResponse.json({ error: "Email et code requis" }, { status: 400 })
    }

    const sanitizedEmail = sanitizeEmail(email)

    // ── VALIDATION ─────────────────────────────────────
    if (!isValidEmail(sanitizedEmail)) {
      return NextResponse.json({ error: "Email invalide" }, { status: 400 })
    }

    if (!isValidOTP(code)) {
      return NextResponse.json({ error: "Le code doit être 6 chiffres" }, { status: 400 })
    }

    // ── RATE LIMITING (per email) ─────────────────────
    if (!await rateLimit(`verify-otp:${sanitizedEmail}`, 5, 300000)) {
      return NextResponse.json(
        { error: "Trop de tentatives. Réessaie dans 5 minutes." },
        { status: 429 }
      )
    }

    // ── LOOKUP MEMBER ─────────────────────────────────
    const member = await db
      .select()
      .from(members)
      .where(eq(members.email, sanitizedEmail))
      .limit(1)

    if (member.length === 0) {
      // Don't reveal if email exists - security best practice
      return NextResponse.json({ error: "Code invalide ou expiré" }, { status: 400 })
    }

    const memberId = member[0].id

    // ── VERIFY OTP (hashed) ───────────────────────────
    const isValid = await verifyOTPToken(memberId, code);

    if (!isValid) {
      return NextResponse.json({ error: "Code invalide ou expiré" }, { status: 400 })
    }

    // ── STATUS: email proven to be owned → verified ──
    if (member[0].status === "imported" || member[0].status === "claimed") {
      await db
        .update(members)
        .set({ status: "verified" })
        .where(eq(members.id, memberId));
    }

    // ── CREATE SESSION ───────────────────────────────
    const sessionToken = await createSessionToken(memberId, member[0].email);
    await setSessionCookie(sessionToken);

    // Members who already completed their onboarding land on their profile;
    // everyone else still has profile steps to fill in.
    const redirect = ["active", "updated", "verified"].includes(member[0].status)
      && member[0].firstName
      ? "/profile"
      : "/onboarding";

    return NextResponse.json({
      success: true,
      redirect,
    });
  } catch (error) {
    console.error("verify-otp error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}
