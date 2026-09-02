import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { members } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import {
  findMemberByEmail,
  createOTPToken,
  sendOTPEmail,
  sendMagicLinkEmail,
  createMagicLinkToken,
  rateLimit,
} from "@/lib/auth";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email) && email.length <= 254;
}

export async function POST(request: Request) {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
               request.headers.get("x-real-ip") ||
               "unknown";

    // IP-based rate limit: 10 requests per minute
    if (!await rateLimit(`verify-email-ip:${ip}`, 10, 60000)) {
      return NextResponse.json(
        { error: "Trop de tentatives depuis cette adresse IP" },
        { status: 429 }
      );
    }

    const { email, method } = await request.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email requis" }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();

    if (!isValidEmail(normalizedEmail)) {
      return NextResponse.json({ error: "Email invalide" }, { status: 400 });
    }

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

    const member = await findMemberByEmail(normalizedEmail);

    if (member) {
      const authMethod = method;

      if (authMethod === "magic_link") {
        const token = await createMagicLinkToken(member.id);
        await sendMagicLinkEmail(normalizedEmail, token);
      } else {
        const code = await createOTPToken(member.id);
        await sendOTPEmail(normalizedEmail, code);
      }

      return NextResponse.json({
        exists: true,
        method: authMethod,
        message: authMethod === "magic_link"
          ? "Un lien magique a été envoyé à ton email"
          : "Un code à 6 chiffres a été envoyé à ton email",
      });
    } else {
      const newMember = await db
        .insert(members)
        .values({
          email: normalizedEmail,
          status: "imported",
        })
        .returning();

      const memberId = newMember[0].id;

      const authMethod = method;

      if (authMethod === "magic_link") {
        const token = await createMagicLinkToken(memberId);
        await sendMagicLinkEmail(normalizedEmail, token);
      } else {
        const code = await createOTPToken(memberId);
        await sendOTPEmail(normalizedEmail, code);
      }

      return NextResponse.json({
        exists: false,
        method: authMethod,
        message: authMethod === "magic_link"
          ? "Un lien magique a été envoyé pour créer ton profil"
          : "Un code à 6 chiffres a été envoyé pour créer ton profil",
      });
    }
  } catch (error) {
    console.error("verify-email error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}