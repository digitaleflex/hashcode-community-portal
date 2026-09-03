import { NextResponse } from "next/server";
import { Resend } from "resend";
import { requireAdmin } from "@/lib/auth";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json({ error: "RESEND_API_KEY not set" }, { status: 500 });
    }

    const adminEmail = process.env.ADMIN_EMAIL;
    if (!adminEmail) {
      return NextResponse.json({ error: "ADMIN_EMAIL not set" }, { status: 500 });
    }

    const { data, error: sendError } = await resend.emails.send({
      from: `${process.env.RESEND_FROM_NAME} <${process.env.RESEND_FROM_EMAIL}>`,
      to: adminEmail,
      subject: "[TEST] HASHCODE - Email de test",
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px; text-align: center;">
          <div style="background: #1a1a2e; color: #fff; padding: 20px; border-radius: 12px 12px 0 0;">
            <h1 style="margin: 0; font-size: 20px;">Email de test HASHCODE</h1>
          </div>
          <div style="border: 1px solid #e5e7eb; border-top: none; padding: 40px 20px; border-radius: 0 0 12px 12px;">
            <p style="color: #6b7280; margin: 0 0 24px;">Ceci est un email de test pour vérifier que l'envoi fonctionne.</p>
            <div style="background: #f0fdf4; border: 1px solid #86efac; border-radius: 8px; padding: 16px; margin: 24px 0;">
              <p style="color: #166534; margin: 0; font-weight: 600;">✅ Configuration email OK</p>
            </div>
            <p style="color: #9ca3af; font-size: 12px;">
              Envoyé le ${new Date().toLocaleString('fr-FR')}
            </p>
          </div>
        </div>
      `,
    });

    if (sendError) {
      return NextResponse.json({ error: sendError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `Email de test envoyé à ${adminEmail}`,
      id: data?.id,
    });
  } catch (error) {
    console.error("test-email error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
