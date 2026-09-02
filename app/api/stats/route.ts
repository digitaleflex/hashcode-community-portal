import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { members, memberPoles, poles } from '@/lib/db/schema';
import { eq, sql, count, countDistinct } from 'drizzle-orm';

export const revalidate = 60;

export async function GET() {
  const [totals] = await db
    .select({
      total: count(),
      imported: count(sql`CASE WHEN ${members.status} = 'imported' THEN 1 END`),
      active: count(sql`CASE WHEN ${members.status} = 'active' THEN 1 END`),
      verified: count(sql`CASE WHEN ${members.status} = 'verified' THEN 1 END`),
      updated: count(sql`CASE WHEN ${members.status} = 'updated' THEN 1 END`),
      countries: countDistinct(members.country),
    })
    .from(members);

  const poleStats = await db
    .select({ slug: poles.slug, c: count() })
    .from(memberPoles)
    .innerJoin(poles, eq(memberPoles.poleId, poles.id))
    .groupBy(poles.slug);

  const polesCovered = poleStats.length;

  return NextResponse.json(
    {
      total: Number(totals?.total ?? 0),
      imported: Number(totals?.imported ?? 0),
      active: Number(totals?.active ?? 0),
      verified: Number(totals?.verified ?? 0),
      updated: Number(totals?.updated ?? 0),
      countries: Number(totals?.countries ?? 0),
      polesCovered,
      poleBreakdown: poleStats.map((p) => ({ slug: p.slug, count: Number(p.c) })),
    },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
      },
    }
  );
}
