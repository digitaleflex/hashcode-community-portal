export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { members, memberPoles, poles } from '@/lib/db/schema';
import { eq, ilike, or, and, desc, count, inArray, sql } from 'drizzle-orm';
import { requireAdmin, createMember } from '@/lib/auth';
import { MEMBER_STATUSES, GENDERS } from '@/lib/server-validation';
import { rateLimit } from '@/lib/rate-limit';

function getClientIp(request: Request): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown';
}

export async function GET(request: Request) {
  const { session, error, isAdmin } = await requireAdmin();
  if (error) return error;

  const ip = getClientIp(request);
  if (!await rateLimit(`admin:${ip}`, 60, 60000)) {
    return NextResponse.json({ error: 'Trop de requêtes, veuillez attendre.' }, { status: 429 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10) || 20));
    const search = (searchParams.get('search') || '').trim().slice(0, 100);
    const status = searchParams.get('status') || '';
    const pole = (searchParams.get('pole') || '').trim().slice(0, 50);
    const level = (searchParams.get('level') || '').trim().slice(0, 20);
    const gender = (searchParams.get('gender') || '').trim().slice(0, 20);
    const offset = (page - 1) * limit;

    if (status && !(MEMBER_STATUSES as readonly string[]).includes(status)) {
      return NextResponse.json({ error: 'Statut invalide' }, { status: 400 });
    }
    if (gender && !(GENDERS as readonly string[]).includes(gender)) {
      return NextResponse.json({ error: 'Genre invalide' }, { status: 400 });
    }

    const statsRow = await db
      .select({
        total: count(),
        imported: count(sql`CASE WHEN ${members.status} = 'imported' THEN 1 END`),
        verified: count(sql`CASE WHEN ${members.status} = 'verified' THEN 1 END`),
        updated: count(sql`CASE WHEN ${members.status} = 'updated' THEN 1 END`),
        active: count(sql`CASE WHEN ${members.status} = 'active' THEN 1 END`),
      })
      .from(members);

    const poleStats = await db
      .select({ name: poles.name, slug: poles.slug, c: count() })
      .from(memberPoles)
      .innerJoin(poles, eq(memberPoles.poleId, poles.id))
      .groupBy(poles.id);

    // ── FILTERS BUILT IN SQL so pagination counts stay correct ──
    const conditions = [];
    if (status) conditions.push(eq(members.status, status as (typeof MEMBER_STATUSES)[number]));
    if (search) {
      const s = `%${search}%`;
      conditions.push(
        or(
          ilike(members.email, s),
          ilike(members.firstName, s),
          ilike(members.lastName, s),
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
        .innerJoin(poles, eq(memberPoles.poleId, poles.id))
        .where(and(...subConditions));
      conditions.push(inArray(members.id, memberIdsWithPole));
    }
    if (gender) conditions.push(eq(members.gender, gender as (typeof GENDERS)[number]));
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [totalRow] = await db
      .select({ c: count() })
      .from(members)
      .where(whereClause);
    const total = Number(totalRow?.c ?? 0);

    const membersList = await db
      .select({
        id: members.id,
        email: members.email,
        firstName: members.firstName,
        lastName: members.lastName,
        country: members.country,
        status: members.status,
        gender: members.gender,
        createdAt: members.createdAt,
      })
      .from(members)
      .where(whereClause)
      .orderBy(desc(members.createdAt))
      .limit(limit)
      .offset(offset);

    // Poles only for the current page — no full-table loads.
    const pageIds = membersList.map((m) => m.id);
    const memberPoleRows = pageIds.length
      ? await db
          .select({
            memberId: memberPoles.memberId,
            poleName: poles.name,
            poleSlug: poles.slug,
            level: memberPoles.level,
            isPrimary: memberPoles.isPrimary,
          })
          .from(memberPoles)
          .innerJoin(poles, eq(poles.id, memberPoles.poleId))
          .where(inArray(memberPoles.memberId, pageIds))
      : [];

    const poleMap: Record<string, { poleName: string; poleSlug: string; level: string; isPrimary: boolean }[]> = {};
    for (const row of memberPoleRows) {
      (poleMap[row.memberId] ||= []).push({
        poleName: row.poleName,
        poleSlug: row.poleSlug,
        level: row.level,
        isPrimary: row.isPrimary,
      });
    }

    return NextResponse.json({
      stats: {
        total: Number(statsRow[0]?.total ?? 0),
        imported: Number(statsRow[0]?.imported ?? 0),
        verified: Number(statsRow[0]?.verified ?? 0),
        updated: Number(statsRow[0]?.updated ?? 0),
        active: Number(statsRow[0]?.active ?? 0),
      },
      poleStats: poleStats.map((p) => ({ name: p.name, slug: p.slug, count: Number(p.c) })),
      members: membersList.map((m) => ({
        ...m,
        poles: (poleMap[m.id] || []).map((p) => ({
          name: p.poleName,
          slug: p.poleSlug,
          level: p.level,
          isPrimary: p.isPrimary,
        })),
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.max(1, Math.ceil(total / limit)),
      },
    });
  } catch (error) {
    console.error('GET /api/admin/members error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const { error, isAdmin } = await requireAdmin();
  if (error) return error;

  const ip = getClientIp(request);
  if (!await rateLimit(`admin:${ip}`, 20, 60000)) {
    return NextResponse.json({ error: 'Trop de requêtes, veuillez attendre.' }, { status: 429 });
  }

  try {
    const body = await request.json();
    const member = await createMember(body);
    return NextResponse.json({ member }, { status: 201 });
  } catch (err) {
    console.error('Admin members error:', err);
    return NextResponse.json({ error: 'Une erreur est survenue. Veuillez réessayer.' }, { status: 500 });
  }
}
