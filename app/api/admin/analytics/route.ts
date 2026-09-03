import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { members, memberPoles, poles } from '@/lib/db/schema';
import { eq, count, sql, and, gte, lt } from 'drizzle-orm';
import { requireAdmin } from '@/lib/auth';
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
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    const twelveMonthsAgo = new Date(currentYear, currentMonth - 12, 1);

    const [
      totalStats,
      statusStats,
      poleDistribution,
      monthlyGrowth,
      currentMonthStats,
      previousMonthStats,
      genderStats,
    ] = await Promise.all([
      db
        .select({
          total: count(),
          active: count(sql`CASE WHEN ${members.status} = 'active' THEN 1 END`),
          imported: count(),
        })
        .from(members),
      db
        .select({
          status: members.status,
          count: count(),
        })
        .from(members)
        .groupBy(members.status),
      db
        .select({
          poleId: poles.id,
          poleName: poles.name,
          poleSlug: poles.slug,
          count: count(),
        })
        .from(memberPoles)
        .innerJoin(poles, eq(memberPoles.poleId, poles.id))
        .groupBy(poles.id, poles.name, poles.slug),
      db
        .select({
          year: sql<number>`EXTRACT(YEAR FROM ${members.createdAt})`,
          month: sql<number>`EXTRACT(MONTH FROM ${members.createdAt})`,
          count: count(),
        })
        .from(members)
        .where(gte(members.createdAt, twelveMonthsAgo))
        .groupBy(sql`EXTRACT(YEAR FROM ${members.createdAt})`, sql`EXTRACT(MONTH FROM ${members.createdAt})`)
        .orderBy(sql`EXTRACT(YEAR FROM ${members.createdAt})`, sql`EXTRACT(MONTH FROM ${members.createdAt})`),
      db
        .select({
          total: count(),
          active: count(sql`CASE WHEN ${members.status} = 'active' THEN 1 END`),
          newMembers: count(sql`CASE WHEN ${members.status} = 'imported' THEN 1 END`),
        })
        .from(members)
        .where(
          and(
            gte(members.createdAt, new Date(currentYear, currentMonth - 1, 1)),
            lt(members.createdAt, new Date(currentYear, currentMonth, 1))
          )
        ),
      db
        .select({
          total: count(),
          active: count(sql`CASE WHEN ${members.status} = 'active' THEN 1 END`),
          newMembers: count(sql`CASE WHEN ${members.status} = 'imported' THEN 1 END`),
        })
        .from(members)
        .where(
          and(
            gte(members.createdAt, new Date(currentYear, currentMonth - 2, 1)),
            lt(members.createdAt, new Date(currentYear, currentMonth - 1, 1))
          )
        ),
      db
        .select({
          gender: members.gender,
          count: count(),
        })
        .from(members)
        .groupBy(members.gender),
    ]);

    const total = Number(totalStats[0]?.total ?? 0);
    const active = Number(totalStats[0]?.active ?? 0);
    const engagementRate = total > 0 ? Math.round((active / total) * 100) : 0;

    const membersByMonth = Array.from({ length: 12 }, (_, i) => {
      const d = new Date(currentYear, currentMonth - 12 + i, 1);
      const y = d.getFullYear();
      const m = d.getMonth() + 1;
      const found = monthlyGrowth.find((r) => Number(r.year) === y && Number(r.month) === m);
      return {
        year: y,
        month: m,
        label: new Date(y, m - 1).toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' }),
        count: found ? Number(found.count) : 0,
      };
    });

    const polesDistribution = poleDistribution.map((p) => ({
      name: p.poleName,
      slug: p.poleSlug,
      count: Number(p.count),
      percentage: total > 0 ? Math.round((Number(p.count) / total) * 100) : 0,
    }));

    const statusBreakdown = statusStats.map((s) => ({
      status: s.status,
      count: Number(s.count),
      percentage: total > 0 ? Math.round((Number(s.count) / total) * 100) : 0,
    }));

    const genderBreakdown = genderStats.map((g) => ({
      gender: g.gender,
      count: Number(g.count),
      percentage: total > 0 ? Math.round((Number(g.count) / total) * 100) : 0,
    }));

    const currentMonthData = {
      total: Number(currentMonthStats[0]?.total ?? 0),
      active: Number(currentMonthStats[0]?.active ?? 0),
      newMembers: Number(currentMonthStats[0]?.newMembers ?? 0),
    };

    const previousMonthData = {
      total: Number(previousMonthStats[0]?.total ?? 0),
      active: Number(previousMonthStats[0]?.active ?? 0),
      newMembers: Number(previousMonthStats[0]?.newMembers ?? 0),
    };

    const getPercentageChange = (current: number, previous: number) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return Math.round(((current - previous) / previous) * 100);
    };

    return NextResponse.json({
      summary: {
        totalMembers: total,
        activeMembers: active,
        engagementRate,
        importedFromExcel: Number(totalStats[0]?.imported ?? 0),
      },
      membersByMonth,
      polesDistribution,
      statusBreakdown,
      genderBreakdown,
      importSource: {
        excel: Number(totalStats[0]?.imported ?? 0),
        other: 0,
      },
      currentMonth: {
        ...currentMonthData,
        engagementRate: currentMonthData.total > 0 ? Math.round((currentMonthData.active / currentMonthData.total) * 100) : 0,
      },
      previousMonth: {
        ...previousMonthData,
        engagementRate: previousMonthData.total > 0 ? Math.round((previousMonthData.active / previousMonthData.total) * 100) : 0,
      },
      percentageChanges: {
        totalMembers: getPercentageChange(currentMonthData.total, previousMonthData.total),
        activeMembers: getPercentageChange(currentMonthData.active, previousMonthData.active),
        newMembers: getPercentageChange(currentMonthData.newMembers, previousMonthData.newMembers),
        engagementRate: getPercentageChange(
          currentMonthData.total > 0 ? Math.round((currentMonthData.active / currentMonthData.total) * 100) : 0,
          previousMonthData.total > 0 ? Math.round((previousMonthData.active / previousMonthData.total) * 100) : 0
        ),
      },
    });
  } catch (error) {
    console.error('GET /api/admin/analytics error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
