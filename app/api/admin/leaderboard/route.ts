export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { members, memberPoints } from '@/lib/db/schema';
import { eq, desc, sql } from 'drizzle-orm';
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
    const leaderboard = await db
      .select({
        id: members.id,
        email: members.email,
        firstName: members.firstName,
        lastName: members.lastName,
        points: sql<number>`COALESCE(${memberPoints.points}, 0)`.as('points'),
        level: sql<string>`COALESCE(${memberPoints.level}, 'Novice')`.as('level'),
      })
      .from(members)
      .leftJoin(memberPoints, eq(members.id, memberPoints.memberId))
      .orderBy(desc(sql`COALESCE(${memberPoints.points}, 0)`))
      .limit(20);

    return NextResponse.json({
      leaderboard: leaderboard.map((m, idx) => ({
        rank: idx + 1,
        id: m.id,
        email: m.email,
        firstName: m.firstName,
        lastName: m.lastName,
        points: Number(m.points),
        level: m.level,
      })),
    });
  } catch (error) {
    console.error('GET /api/admin/leaderboard error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}