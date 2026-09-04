import { NextResponse, after } from "next/server";
import { findMemberByEmail, createOTPToken, sendOTPEmail, sendMagicLinkEmail, createMagicLinkToken } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request";
import { sanitizeEmail } from "@/lib/email-lookup";

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);

    // IP-based rate limit: 3 requests per 5 minutes per IP
    if (!await rateLimit(`verify-email:${ip}`, 3, 300000)) {
      return NextResponse.json(
        { error: "Trop de tentatives. Réessaie dans 5 minutes." },
        { status: 429 }
      );
    }

    const { email, method } = await request.json();

    const result = sanitizeEmail(email);

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    const normalizedEmail = result.email;

    // Email-based rate limit: 3 requests per 5 minutes per email
    if (!await rateLimit(`verify-email:${normalizedEmail}`, 3, 300000)) {
      return NextResponse.json(
        { error: "Trop de demandes pour cet email. Réessaie dans 5 minutes." },
        { status: 429 }
      );
    }

    if (method !== "magic_link" && method !== "otp") {
      return NextResponse.json({ error: "Méthode invalide" }, { status: 400 });
    }

    // Only send code if member exists - do NOT auto-create
    const member = await findMemberByEmail(normalizedEmail);

    if (!member) {
      // Return the same response whether the email exists or not (timing attack mitigation)
      return NextResponse.json({
        method,
        message: "Un code a été envoyé si cet email est enregistré",
      });
    }

    // Member exists: create token and send email
    // Hand the send to after() so the platform guarantees its execution
    // even though the response has already gone out — a bare floating promise
    // can be frozen mid-flight on serverless runtimes.
    if (method === "magic_link") {
      const token = await createMagicLinkToken(member.id);
      after(async () => {
        try {
          await sendMagicLinkEmail(normalizedEmail, token);
        } catch (err) {
          console.error("Failed to send magic link email:", err);
        }
      });
    } else {
      const code = await createOTPToken(member.id);
      after(async () => {
        try {
          await sendOTPEmail(normalizedEmail, code);
        } catch (err) {
          console.error("Failed to send OTP email:", err);
        }
      });
    }

    return NextResponse.json({
      method,
      message: "Un code a été envoyé si cet email est enregistré",
    });
  } catch (error) {
    console.error("verify-email error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}
