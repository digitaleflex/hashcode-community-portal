export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { members, memberPoles, poles } from '@/lib/db/schema';
import { eq, ilike, or, and, count, inArray, desc } from 'drizzle-orm';
import { rateLimit } from '@/lib/auth';
import { getClientIp } from '@/lib/request';

// Public member directory. Only members who engaged with the community are
// listed, and emails are never included in the response.

const PUBLIC_STATUSES = ['verified', 'updated', 'active'] as const;

export async function GET(request: Request) {
  try {
    const ip = getClientIp(request);
    if (!await rateLimit(`members:${ip}`, 60, 60000)) {
      return NextResponse.json({ error: 'Trop de requêtes' }, { status: 429 });
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20', 10) || 20));
    const search = (searchParams.get('search') || '').trim().slice(0, 100);
    const status = searchParams.get('status') || '';
    const pole = (searchParams.get('pole') || '').trim().slice(0, 50);
    const level = (searchParams.get('level') || '').trim().slice(0, 20);
    const offset = (page - 1) * limit;

    const conditions = [
      (PUBLIC_STATUSES as readonly string[]).includes(status)
        ? eq(members.status, status as (typeof PUBLIC_STATUSES)[number])
        : inArray(members.status, [...PUBLIC_STATUSES]),
    ];

    if (search) {
      const s = `%${search}%`;
      conditions.push(
        or(
          ilike(members.firstName, s),
          ilike(members.lastName, s),
          ilike(members.city, s),
          ilike(members.country, s)
        )!
      );
    }

    if (pole || level) {
      const subConditions = [];
      if (pole) subConditions.push(eq(poles.slug, pole));
      if (level) subConditions.push(eq(memberPoles.level, level as 'beginner' | 'intermediate' | 'advanced' | 'expert'));
      const memberIdsWithPole = db
        .select({ id: memberPoles.memberId })
        .from(memberPoles)
        .innerJoin(poles, eq(poles.id, memberPoles.poleId))
        .where(and(...subConditions));
      conditions.push(inArray(members.id, memberIdsWithPole));
    }

    const whereClause = and(...conditions);

    const [totalRow] = await db.select({ c: count() }).from(members).where(whereClause);
    const total = Number(totalRow?.c ?? 0);

    const list = await db
      .select({
        id: members.id,
        firstName: members.firstName,
        lastName: members.lastName,
        country: members.country,
        city: members.city,
        status: members.status,
        createdAt: members.createdAt,
      })
      .from(members)
      .where(whereClause)
      .orderBy(desc(members.createdAt))
      .limit(limit)
      .offset(offset);

    // Poles only for the current page — no full-table loads.
    const pageIds = list.map((m) => m.id);
    const poleRows = pageIds.length
      ? await db
          .select({
            memberId: memberPoles.memberId,
            slug: poles.slug,
            level: memberPoles.level,
            isPrimary: memberPoles.isPrimary,
          })
          .from(memberPoles)
          .innerJoin(poles, eq(poles.id, memberPoles.poleId))
          .where(inArray(memberPoles.memberId, pageIds))
      : [];

    const poleMap: Record<string, { slug: string; level: string; isPrimary: boolean }[]> = {};
    for (const row of poleRows) {
      (poleMap[row.memberId] ||= []).push({
        slug: row.slug,
        level: row.level,
        isPrimary: row.isPrimary,
      });
    }

    return NextResponse.json({
      members: list.map((m) => ({ ...m, poles: poleMap[m.id] || [] })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.max(1, Math.ceil(total / limit)),
      },
    });
  } catch (error) {
    console.error('GET /api/members error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
