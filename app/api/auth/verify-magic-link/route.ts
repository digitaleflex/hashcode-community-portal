export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authTokens, members } from "@/lib/db/schema";
import { and, eq, lte, or } from "drizzle-orm";
import {
  verifyMagicLinkToken,
  setSessionCookie,
  createSessionToken,
  rateLimit,
} from "@/lib/auth";
import { hashToken } from "@/lib/crypto";
import { getClientIp } from "@/lib/request";

export async function GET(request: Request) {
  try {
    const ip = getClientIp(request);
    if (!await rateLimit(`verify-magic-link:${ip}`, 10, 60000)) {
      return NextResponse.json(
        { error: "Trop de tentatives. Réessaie dans une minute." },
        { status: 429 }
      );
    }

    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json({ error: "Token manquant" }, { status: 400 });
    }

    const result = await verifyMagicLinkToken(token);

    if (!result.ok) {
      if (result.reason === "expired") {
        return NextResponse.json(
          { error: "Lien expiré. Demande un nouveau lien." },
          { status: 410 }
        );
      }
      if (result.reason === "used") {
        return NextResponse.json(
          { error: "Lien déjà utilisé. Demande un nouveau lien." },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { error: "Lien invalide ou expiré. Demande un nouveau lien." },
        { status: 400 }
      );
    }

    // ── AUDIT 3.2: single-use magic-link → hard-delete consumed + purge stale member tokens ──
    const consumedTokenHash = hashToken(token);
    await db.transaction(async (tx) => {
      await tx
        .delete(authTokens)
        .where(
          and(
            eq(authTokens.token, consumedTokenHash),
            eq(authTokens.type, "magic_link")
          )
        );
      await tx
        .delete(authTokens)
        .where(
          and(
            eq(authTokens.memberId, result.memberId),
            eq(authTokens.type, "magic_link"),
            or(eq(authTokens.used, true), lte(authTokens.expiresAt, new Date()))
          )
        );
    });

    const member = await db
      .select()
      .from(members)
      .where(eq(members.id, result.memberId))
      .limit(1);

    if (member.length === 0) {
      return NextResponse.json({ error: "Membre non trouvé" }, { status: 404 });
    }

    // ── STATUS: email proven to be owned → verified ──
    if (member[0].status === "imported" || member[0].status === "claimed") {
      await db
        .update(members)
        .set({ status: "verified" })
        .where(eq(members.id, member[0].id));
    }

    const sessionToken = await createSessionToken(member[0].id, member[0].email);
    await setSessionCookie(sessionToken);

    const redirect = ["active", "updated", "verified"].includes(member[0].status)
      && member[0].firstName
      ? "/profile"
      : "/onboarding";

    return NextResponse.json({
      success: true,
      redirect,
    });
  } catch (error) {
    console.error("verify-magic-link error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
