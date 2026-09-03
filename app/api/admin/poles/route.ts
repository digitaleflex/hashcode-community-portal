export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { poles } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { requireAdmin } from '@/lib/auth';
import { rateLimit } from '@/lib/rate-limit';

import { getClientIp } from '@/lib/request';

export async function GET(request: Request) {
  const { error, isAdmin } = await requireAdmin();
  if (error) return error;

  const ip = getClientIp(request);
  if (!await rateLimit(`admin:${ip}`, 60, 60000)) {
    return NextResponse.json({ error: 'Trop de requêtes, veuillez attendre.' }, { status: 429 });
  }

  try {
    const allPoles = await db.select().from(poles);
    return NextResponse.json({ poles: allPoles });
  } catch (error) {
    console.error('GET /api/admin/poles error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}