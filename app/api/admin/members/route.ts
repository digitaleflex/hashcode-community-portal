import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { members, memberPoles, poles } from '@/lib/db/schema';
import { eq, ilike, or, and, desc, count, sql } from 'drizzle-orm';
import { requireAdmin, createMember } from '@/lib/auth';

export async function GET(request: Request) {
  const { session, error } = await requireAdmin();
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
  const search = searchParams.get('search') || '';
  const status = searchParams.get('status') || '';
  const pole = searchParams.get('pole') || '';
  const level = searchParams.get('level') || '';
  const country = searchParams.get('country') || '';
  const offset = (page - 1) * limit;

  const statsRow = await db
    .select({
      total: count(),
      imported: count(sql<number>`CASE WHEN ${members.status} = 'imported' THEN 1 END`),
      verified: count(sql<number>`CASE WHEN ${members.status} = 'verified' THEN 1 END`),
      updated: count(sql<number>`CASE WHEN ${members.status} = 'updated' THEN 1 END`),
      active: count(sql<number>`CASE WHEN ${members.status} = 'active' THEN 1 END`),
    })
    .from(members);

  const poleStats = await db
    .select({ name: poles.name, slug: poles.slug, c: count() })
    .from(memberPoles)
    .innerJoin(poles, eq(memberPoles.poleId, poles.id))
    .groupBy(poles.id);

  const memberPoleRows = await db
    .select({
      memberId: memberPoles.memberId,
      poleName: poles.name,
      poleSlug: poles.slug,
      level: memberPoles.level,
      isPrimary: memberPoles.isPrimary,
    })
    .from(memberPoles)
    .innerJoin(poles, eq(memberPoles.poleId, poles.id));

  const poleMap: Record<string, typeof memberPoleRows[0][]> = {};
  for (const row of memberPoleRows) {
    if (!poleMap[row.memberId]) poleMap[row.memberId] = [];
    poleMap[row.memberId].push(row);
  }

  const conditions = [];
  if (status) conditions.push(eq(members.status, status as any));
  if (country) conditions.push(eq(members.country, country));
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
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [totalRow] = await db
    .select({ c: count() })
    .from(members)
    .where(whereClause);

  const membersList = await db
    .select({
      id: members.id,
      email: members.email,
      firstName: members.firstName,
      lastName: members.lastName,
      country: members.country,
      status: members.status,
      createdAt: members.createdAt,
    })
    .from(members)
    .where(whereClause)
    .orderBy(desc(members.createdAt))
    .limit(limit)
    .offset(offset);

  const membersWithPoles = membersList.map((m) => {
    const mp = poleMap[m.id] || [];
    let filtered = mp;
    if (pole) filtered = filtered.filter((p) => p.poleSlug === pole);
    if (level) filtered = filtered.filter((p) => p.level === level);
    return {
      ...m,
      poles: filtered.map((p) => ({ name: p.poleName, slug: p.poleSlug, level: p.level, isPrimary: p.isPrimary })),
    };
  });

  const filteredCount = pole || level ? membersWithPoles.length : totalRow.c;

  return NextResponse.json({
    stats: {
      total: Number(statsRow[0]?.total ?? 0),
      imported: Number(statsRow[0]?.imported ?? 0),
      verified: Number(statsRow[0]?.verified ?? 0),
      updated: Number(statsRow[0]?.updated ?? 0),
      active: Number(statsRow[0]?.active ?? 0),
    },
    poleStats: poleStats.map((p) => ({ name: p.name, slug: p.slug, count: Number(p.c) })),
    members: membersWithPoles,
    pagination: {
      page,
      limit,
      total: Number(filteredCount),
      pages: Math.max(1, Math.ceil(Number(filteredCount) / limit)),
    },
  });
}

export async function POST(request: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const body = await request.json();
    const member = await createMember(body);
    return NextResponse.json({ member }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur inconnue';
    const status = message.includes('déjà utilisé') || message.includes('invalide') || message.includes('requis')
      ? 400
      : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
