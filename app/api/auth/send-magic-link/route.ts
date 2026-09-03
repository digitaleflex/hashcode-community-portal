import { NextResponse, after } from "next/server";
import {
  createMagicLinkToken,
  sendMagicLinkEmail,
  findMemberByEmail,
  rateLimit,
} from "@/lib/auth";
import { validateEmail } from "@/lib/server-validation";
import { getClientIp } from "@/lib/request";

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);

    // IP-based rate limit (the per-email one alone allows spraying many addresses).
    if (!await rateLimit(`magic-link-ip:${ip}`, 5, 60000)) {
      return NextResponse.json(
        { error: "Trop de tentatives depuis cette adresse IP" },
        { status: 429 }
      );
    }

    const { email } = await request.json();

    const emailCheck = validateEmail(email);
    if (!emailCheck.ok) {
      return NextResponse.json({ error: emailCheck.error }, { status: 400 });
    }
    const normalizedEmail = emailCheck.value;

    // Per-email rate limit: 3 requests per minute
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
    after(async () => {
      try {
        await sendMagicLinkEmail(normalizedEmail, token);
      } catch (err) {
        console.error("Failed to send magic link email:", err);
      }
    });

    return NextResponse.json({
      ok: true,
      message: "Un lien magique a été envoyé à ton email.",
    });
  } catch (error) {
    console.error("send-magic-link error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
