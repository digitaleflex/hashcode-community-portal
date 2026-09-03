export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { members, memberPoints, pointEvents } from '@/lib/db/schema';
import { eq, desc, sql } from 'drizzle-orm';
import { requireAdmin } from '@/lib/auth';
import { validateUUID } from '@/lib/server-validation';
import { rateLimit } from '@/lib/rate-limit';

function getClientIp(request: Request): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown';
}

type Level = 'Novice' | 'Intermediate' | 'Advanced' | 'Legend';

function calculateLevel(points: number): Level {
  if (points >= 300) return 'Legend';
  if (points >= 150) return 'Advanced';
  if (points >= 50) return 'Intermediate';
  return 'Novice';
}

export async function GET(request: Request) {
  const { error, isAdmin } = await requireAdmin();
  if (error) return error;

  const ip = getClientIp(request);
  if (!await rateLimit(`admin:${ip}`, 60, 60000)) {
    return NextResponse.json({ error: 'Trop de requêtes, veuillez attendre.' }, { status: 429 });
  }

  try {
    const membersWithPoints = await db
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
      .orderBy(desc(sql`COALESCE(${memberPoints.points}, 0)`));

    return NextResponse.json({
      members: membersWithPoints.map((m) => ({
        id: m.id,
        email: m.email,
        firstName: m.firstName,
        lastName: m.lastName,
        points: Number(m.points),
        level: m.level,
      })),
    });
  } catch (error) {
    console.error('GET /api/admin/points error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const { error, session, isAdmin } = await requireAdmin();
  if (error) return error;

  const ip = getClientIp(request);
  if (!await rateLimit(`admin:${ip}`, 20, 60000)) {
    return NextResponse.json({ error: 'Trop de requêtes, veuillez attendre.' }, { status: 429 });
  }

  try {
    const body = await request.json();
    const { memberId, delta, reason } = body;

    if (!validateUUID(memberId)) {
      return NextResponse.json({ error: 'Identifiant membre invalide' }, { status: 400 });
    }

    if (typeof delta !== 'number' || isNaN(delta)) {
      return NextResponse.json({ error: 'Delta doit être un nombre' }, { status: 400 });
    }

    if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
      return NextResponse.json({ error: 'Raison requise' }, { status: 400 });
    }

    // Wrap point update and event creation in a transaction
    const result = await db.transaction(async (tx) => {
      const memberExists = await tx
        .select({ id: members.id })
        .from(members)
        .where(eq(members.id, memberId))
        .limit(1);

      if (memberExists.length === 0) {
        return { notFound: true, newPoints: 0, newLevel: 'Novice' as Level };
      }

      const existingPoints = await tx
        .select()
        .from(memberPoints)
        .where(eq(memberPoints.memberId, memberId))
        .limit(1);

      const currentPoints = existingPoints.length > 0 ? existingPoints[0].points : 0;
      const newPoints = Math.max(0, currentPoints + delta);
      const newLevel = calculateLevel(newPoints);

      if (existingPoints.length > 0) {
        await tx
          .update(memberPoints)
          .set({
            points: newPoints,
            level: newLevel,
            updatedAt: new Date(),
          })
          .where(eq(memberPoints.memberId, memberId));
      } else {
        await tx.insert(memberPoints).values({
          memberId,
          points: newPoints,
          level: newLevel,
        });
      }

      // Insert point event with createdBy set to the admin's session memberId
      await tx.insert(pointEvents).values({
        memberId,
        delta,
        reason: reason.trim(),
        createdBy: session?.memberId ?? null,
      });

      return { notFound: false, newPoints, newLevel };
    });

    if (result.notFound) {
      return NextResponse.json({ error: 'Membre non trouvé' }, { status: 404 });
    }

    return NextResponse.json({
      memberId,
      points: result.newPoints,
      level: result.newLevel,
      delta,
    });
  } catch (error) {
    console.error('POST /api/admin/points error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
