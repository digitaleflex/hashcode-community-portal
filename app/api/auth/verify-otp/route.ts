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

export async function POST(request: Request) {
  try {
    const { email, code } = await request.json();

    if (!email || !code || typeof email !== "string" || typeof code !== "string") {
      return NextResponse.json({ error: "Email et code requis" }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();

    if (!rateLimit(`verify-otp:${normalizedEmail}`, 5, 300000)) {
      return NextResponse.json(
        { error: "Trop de tentatives. Réessaie dans 5 minutes." },
        { status: 429 }
      );
    }

    const member = await db
      .select()
      .from(members)
      .where(eq(members.email, normalizedEmail))
      .limit(1);

    if (member.length === 0) {
      return NextResponse.json({ error: "Email non trouvé" }, { status: 404 });
    }

    const memberId = member[0].id;

    const isValid = await verifyOTPToken(memberId, code);

    if (!isValid) {
      return NextResponse.json({ error: "Code invalide ou expiré" }, { status: 400 });
    }

    const sessionToken = await createSessionToken(memberId, member[0].email);
    await setSessionCookie(sessionToken);

    return NextResponse.json({
      success: true,
      redirect: "/onboarding",
    });
  } catch (error) {
    console.error("verify-otp error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}