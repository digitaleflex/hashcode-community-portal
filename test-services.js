require('dotenv').config({ path: '.env.local' });

const { neon } = require('@neondatabase/serverless');
const { Resend } = require('resend');

async function test() {
  console.log('=== TEST DES SERVICES ===\n');

  // ── Neon ────────────────────────────────────────────────
  console.log('1. Neon PostgreSQL...');
  try {
    const sql = neon(process.env.DATABASE_URL_UNPOOLED);
    const [row] = await sql`SELECT 1 as ok, version() as pg_version, now() as now`;
    console.log(`   ✅ Connecté : PostgreSQL ${row.pg_version.split(' ')[0]}`);
    console.log(`   ✅ Timestamp serveur : ${row.now}`);
  } catch (e) {
    console.error(`   ❌ Erreur Neon : ${e.message}`);
  }

  // ── Resend ──────────────────────────────────────────────
  console.log('\n2. Resend (email)...');
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const result = await resend.emails.send({
      from: `${process.env.RESEND_FROM_NAME} <${process.env.RESEND_FROM_EMAIL}>`,
      to: 'test@resend.dev',
      subject: 'HASHCODE — Test de connexion',
      html: '<p>✅ Le service Resend fonctionne correctement.</p>',
    });
    console.log(`   ✅ Email envoyé : ${result.data?.id || JSON.stringify(result)}`);
  } catch (e) {
    console.error(`   ❌ Erreur Resend : ${e.message}`);
  }

  // ── Variables ────────────────────────────────────────────
  console.log('\n3. Variables d\'environnement...');
  const vars = ['DATABASE_URL_UNPOOLED', 'RESEND_API_KEY', 'RESEND_FROM_EMAIL', 'NEXT_PUBLIC_APP_URL', 'JWT_SECRET'];
  for (const v of vars) {
    const val = process.env[v];
    if (!val) {
      console.log(`   ❌ ${v} manquant`);
    } else {
      const preview = val.length > 12 ? `${val.substring(0, 8)}...${val.substring(val.length - 4)}` : val;
      console.log(`   ✅ ${v} = ${preview}`);
    }
  }

  console.log('\n=== FIN DES TESTS ===');
}

test().catch(console.error);
