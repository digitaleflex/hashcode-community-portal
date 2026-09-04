export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';
import { logger } from '@/lib/logger';

export async function GET() {
  const startedAt = Date.now();
  try {
    await db.execute(sql`SELECT 1`);
    return NextResponse.json({
      ok: true,
      db: 'up',
      latencyMs: Date.now() - startedAt,
    });
  } catch (error) {
    logger.error({ err: error }, 'GET /api/health error');
    return NextResponse.json(
      { ok: false, db: 'down', latencyMs: Date.now() - startedAt },
      { status: 503 }
    );
  }
}
