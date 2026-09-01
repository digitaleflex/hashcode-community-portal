import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { members } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import {
  verifyMagicLinkToken,
  setSessionCookie,
  createSessionToken,
} from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json({ error: "Token manquant" }, { status: 400 });
    }

    const memberId = await verifyMagicLinkToken(token);

    if (!memberId) {
      return NextResponse.json(
        { error: "Lien invalide ou expiré. Demande un nouveau lien." },
        { status: 400 }
      );
    }

    const member = await db
      .select()
      .from(members)
      .where(eq(members.id, memberId))
      .limit(1);

    if (member.length === 0) {
      return NextResponse.json({ error: "Membre non trouvé" }, { status: 404 });
    }

    const sessionToken = await createSessionToken(memberId, member[0].email);
    await setSessionCookie(sessionToken);

    return NextResponse.json({
      success: true,
      redirect: "/onboarding",
    });
  } catch (error) {
    console.error("verify-magic-link error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}