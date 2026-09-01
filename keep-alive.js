require('dotenv').config({ path: '.env.local' });
const { neon } = require('@neondatabase/serverless');

async function ping() {
  try {
    const sql = neon(process.env.DATABASE_URL_UNPOOLED);
    const [row] = await sql`SELECT 1 as ok, now() as ts`;
    console.log(`[${new Date().toISOString()}] ✅ Neon actif — ${row.ts}`);
  } catch (e) {
    console.error(`[${new Date().toISOString()}] ❌ Neon erreur : ${e.message}`);
  }
}

ping().catch(console.error);
