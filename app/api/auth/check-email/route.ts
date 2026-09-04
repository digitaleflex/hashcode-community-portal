export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { members } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { rateLimit } from "@/lib/auth";
import { sanitizeEmail } from "@/lib/email-lookup";

export async function POST(request: Request) {
  try {
    // ── RATE LIMITING ──────────────────────────────────
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
               request.headers.get("x-real-ip") ||
               "unknown";

    if (!await rateLimit(`check-email:${ip}`, 5, 60000)) {
      return NextResponse.json(
        { error: "Trop de tentatives. Réessaie dans une minute." },
        { status: 429 }
      );
    }

    // ── VALIDATION ─────────────────────────────────────
    const { email } = await request.json();

    const result = sanitizeEmail(email);

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    const sanitizedEmail = result.email;

    // ── 3.8: réponse uniforme — ne révèle pas l'existence du compte ──
    // Lookup conservé (résultat ignoré) pour uniformiser le timing.
    await db
      .select({ id: members.id })
      .from(members)
      .where(eq(members.email, sanitizedEmail))
      .limit(1);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("check-email error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}
