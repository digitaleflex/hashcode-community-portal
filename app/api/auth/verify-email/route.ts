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

export async function POST(request: Request) {
  try {
    const { email, method } = await request.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email requis" }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Rate limiting
    if (!rateLimit(`verify-email:${normalizedEmail}`, 3, 60000)) {
      return NextResponse.json(
        { error: "Trop de tentatives. Réessaie dans 1 minute." },
        { status: 429 }
      );
    }

    // Check if member exists
    const member = await findMemberByEmail(normalizedEmail);

    if (member) {
      // Existing member - send OTP or magic link
      const authMethod = method === "magic_link" ? "magic_link" : "otp";

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
      // New member - create placeholder and send OTP
      const newMember = await db
        .insert(members)
        .values({
          email: normalizedEmail,
          status: "imported",
        })
        .returning();

      const memberId = newMember[0].id;

      const authMethod = method === "magic_link" ? "magic_link" : "otp";

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