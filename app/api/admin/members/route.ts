import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  members,
  memberProfiles,
  memberPoles,
  memberInterests,
  communicationPreferences,
  communityHistory,
  poles,
  interests,
} from '@/lib/db/schema';
import { eq, count, and, like, or, sql } from 'drizzle-orm';
import { getSession } from '@/lib/auth';

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');
  const search = searchParams.get('search') || '';
  const status = searchParams.get('status') || '';
  const pole = searchParams.get('pole') || '';
  const level = searchParams.get('level') || '';
  const country = searchParams.get('country') || '';

  const offset = (page - 1) * limit;

  // Stats
  const [totalResult] = await db.select({ c: count() }).from(members);
  const [importedResult] = await db.select({ c: count() }).from(members).where(eq(members.status, 'imported'));
  const [verifiedResult] = await db.select({ c: count() }).from(members).where(eq(members.status, 'verified'));
  const [activeResult] = await db.select({ c: count() }).from(members).where(eq(members.status, 'active'));
  const [updatedResult] = await db.select({ c: count() }).from(members).where(eq(members.status, 'updated'));

  // Members by pole
  const poleStats = await db
    .select({ poleName: poles.name, poleSlug: poles.slug, c: count() })
    .from(memberPoles)
    .innerJoin(poles, eq(memberPoles.poleId, poles.id))
    .groupBy(poles.id);

  // Members by level
  const levelStats = await db
    .select({ level: memberPoles.level, c: count() })
    .from(memberPoles)
    .groupBy(memberPoles.level);

  // Members by country (top 10)
  const countryStats = await db
    .select({ country: members.country, c: count() })
    .from(members)
    .where(sql`${members.country} IS NOT NULL`)
    .groupBy(members.country)
    .orderBy(sql`count(*) DESC`)
    .limit(10);

  // Members list with filters
  let memberQuery = db
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
    .limit(limit)
    .offset(offset)
    .orderBy(sql`${members.createdAt} DESC`);

  const allMembers = await memberQuery;

  // Get poles and profile for each member
  const membersWithDetails = await Promise.all(
    allMembers.map(async (m) => {
      const memberPolesData = await db
        .select({ name: poles.name, slug: poles.slug, level: memberPoles.level, isPrimary: memberPoles.isPrimary })
        .from(memberPoles)
        .innerJoin(poles, eq(memberPoles.poleId, poles.id))
        .where(eq(memberPoles.memberId, m.id));

      const profile = await db
        .select({ occupation: memberProfiles.occupation })
        .from(memberProfiles)
        .where(eq(memberProfiles.memberId, m.id))
        .limit(1);

      return {
        ...m,
        poles: memberPolesData,
        occupation: profile[0]?.occupation || null,
      };
    })
  );

  // Apply search filter on results (simple client-side filter for now)
  let filtered = membersWithDetails;
  if (search) {
    const s = search.toLowerCase();
    filtered = filtered.filter(
      (m) =>
        m.email.toLowerCase().includes(s) ||
        (m.firstName && m.firstName.toLowerCase().includes(s)) ||
        (m.lastName && m.lastName.toLowerCase().includes(s)) ||
        (m.country && m.country.toLowerCase().includes(s))
    );
  }
  if (status) {
    filtered = filtered.filter((m) => m.status === status);
  }
  if (pole) {
    filtered = filtered.filter((m) => m.poles.some((p) => p.slug === pole));
  }
  if (level) {
    filtered = filtered.filter((m) => m.poles.some((p) => p.level === level));
  }
  if (country) {
    filtered = filtered.filter((m) => m.country === country);
  }

  return NextResponse.json({
    stats: {
      total: totalResult?.c || 0,
      imported: importedResult?.c || 0,
      verified: verifiedResult?.c || 0,
      updated: updatedResult?.c || 0,
      active: activeResult?.c || 0,
    },
    poleStats: poleStats.map((p) => ({ name: p.poleName, slug: p.poleSlug, count: p.c })),
    levelStats: levelStats.map((l) => ({ level: l.level, count: l.c })),
    countryStats,
    members: filtered,
    pagination: {
      page,
      limit,
      total: totalResult?.c || 0,
      pages: Math.ceil((totalResult?.c || 0) / limit),
    },
  });
}
