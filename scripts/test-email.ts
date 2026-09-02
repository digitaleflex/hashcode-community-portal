import { Resend } from "resend";
import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(process.cwd(), ".env.local") });

const resend = new Resend(process.env.RESEND_API_KEY);

async function sendTestEmail() {
  const adminEmail = process.env.ADMIN_EMAIL || "admin@joinhashcode.com";

  console.log(`Envoi d'un email de test à ${adminEmail}...`);

  const { data, error } = await resend.emails.send({
    from: `${process.env.RESEND_FROM_NAME} <${process.env.RESEND_FROM_EMAIL}>`,
    to: adminEmail,
    subject: "[TEST] HASHCODE - Email de test",
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px; text-align: center;">
        <div style="background: #1a1a2e; color: #fff; padding: 20px; border-radius: 12px 12px 0 0;">
          <h1 style="margin: 0; font-size: 20px;">Email de test HASHCODE</h1>
        </div>
        <div style="border: 1px solid #e5e7eb; border-top: none; padding: 40px 20px; border-radius: 0 0 12px 12px;">
          <p style="color: #6b7280; margin: 0 0 24px;">Ceci est un email de test pour verifier que l'envoi fonctionne.</p>
          <div style="background: #f0fdf4; border: 1px solid #86efac; border-radius: 8px; padding: 16px; margin: 24px 0;">
            <p style="color: #166534; margin: 0; font-weight: 600;">✅ Configuration email OK</p>
          </div>
          <p style="color: #9ca3af; font-size: 12px;">
            Envoye le ${new Date().toLocaleString("fr-FR")}<br/>
            Depuis: ${process.env.RESEND_FROM_EMAIL}
          </p>
        </div>
      </div>
    `,
  });

  if (error) {
    console.error("Erreur:", error.message);
    process.exit(1);
  }

  console.log("✅ Email envoyé avec succès!");
  console.log("ID:", data?.id);
}

sendTestEmail();
