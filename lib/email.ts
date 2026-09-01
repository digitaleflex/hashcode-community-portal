import { config } from "dotenv";
config({ path: ".env.local" });
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM = `${process.env.RESEND_FROM_NAME} <${process.env.RESEND_FROM_EMAIL}>`;

export async function sendMagicLink(email: string, token: string) {
  const url = `${process.env.NEXT_PUBLIC_APP_URL}/auth/verify?token=${token}`;

  await resend.emails.send({
    from: FROM,
    to: email,
    subject: "Ton lien de connexion HASHCODE",
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
        <h1 style="color: #1a1a2e; font-size: 24px;">Bienvenue sur HASHCODE</h1>
        <p style="color: #444; line-height: 1.6;">
          Clique sur le bouton ci-dessous pour accéder à ton profil HASHCODE.
          Ce lien expire dans <strong>15 minutes</strong>.
        </p>
        <a href="${url}" style="display: inline-block; background: #1a1a2e; color: #fff; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 24px 0;">
          Accéder à mon profil
        </a>
        <p style="color: #888; font-size: 12px;">
          Si tu n'as pas demandé ce lien, ignore ce message.
        </p>
      </div>
    `,
  });
}

export async function sendOTP(email: string, code: string) {
  await resend.emails.send({
    from: FROM,
    to: email,
    subject: "Ton code de vérification HASHCODE",
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
        <h1 style="color: #1a1a2e; font-size: 24px;">Code de vérification</h1>
        <p style="color: #444; line-height: 1.6;">
          Voici ton code à 6 chiffres :
        </p>
        <div style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #1a1a2e; margin: 32px 0;">
          ${code}
        </div>
        <p style="color: #888; font-size: 12px;">
          Ce code expire dans <strong>10 minutes</strong>.<br />
          Si tu n'as pas demandé ce code, ignore ce message.
        </p>
      </div>
    `,
  });
}
