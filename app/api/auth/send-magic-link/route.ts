import { NextResponse } from "next/server";
import {
  createMagicLinkToken,
  sendMagicLinkEmail,
  findMemberByEmail,
  rateLimit,
} from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email requis" }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Rate limiting
    if (!await rateLimit(`magic-link:${normalizedEmail}`, 3, 60000)) {
      return NextResponse.json(
        { error: "Trop de demandes. Réessaie dans 1 minute." },
        { status: 429 }
      );
    }

    const member = await findMemberByEmail(normalizedEmail);

    if (!member) {
      // Don't reveal whether email exists
      return NextResponse.json({
        ok: true,
        message: "Si ton email est dans notre base, un lien a été envoyé.",
      });
    }

    const token = await createMagicLinkToken(member.id);
    await sendMagicLinkEmail(normalizedEmail, token);

    return NextResponse.json({
      ok: true,
      message: "Un lien magique a été envoyé à ton email.",
    });
  } catch (error) {
    console.error("send-magic-link error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}