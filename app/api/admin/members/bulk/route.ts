export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { members, memberPoles, poles } from '@/lib/db/schema';
import { eq, inArray, sql } from 'drizzle-orm';
import { requireAdmin } from '@/lib/auth';
import { MEMBER_STATUSES, validateOptionalEnum, LEVELS } from '@/lib/server-validation';
import { rateLimit } from '@/lib/rate-limit';

function getClientIp(request: Request): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown';
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
    const { ids, action, status, poles: polesData } = body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'IDs invalides' }, { status: 400 });
    }

    if (!action) {
      return NextResponse.json({ error: 'Action requise' }, { status: 400 });
    }

    switch (action) {
      case 'changeStatus': {
        if (!status || !MEMBER_STATUSES.includes(status as (typeof MEMBER_STATUSES)[number])) {
          return NextResponse.json({ error: 'Statut invalide' }, { status: 400 });
        }
        const result = await db
          .update(members)
          .set({ status, updatedAt: new Date() })
          .where(inArray(members.id, ids))
          .returning({ id: members.id });
        return NextResponse.json({
          success: true,
          modifiedCount: result.length,
        });
      }

      case 'delete': {
        const result = await db.transaction(async (tx) => {
          return tx.delete(members).where(inArray(members.id, ids)).returning({ id: members.id });
        });
        return NextResponse.json({
          success: true,
          requested: ids.length,
          deleted: result.length,
        });
      }

      case 'assignPoles': {
        if (!Array.isArray(polesData) || polesData.length === 0) {
          return NextResponse.json({ error: 'Données de pôle invalides' }, { status: 400 });
        }

        // Validate pole data: each item should have poleId
        for (const pole of polesData) {
          if (!pole || typeof pole !== 'object' || !pole.poleId) {
            return NextResponse.json({ error: 'Données de pôle invalides' }, { status: 400 });
          }
          // Validate optional level if provided
          if (pole.level !== undefined && pole.level !== null && pole.level !== '') {
            const levelCheck = validateOptionalEnum(pole.level, LEVELS, 'Niveau');
            if (!levelCheck.ok) {
              return NextResponse.json({ error: `Niveau invalide: ${levelCheck.error}` }, { status: 400 });
            }
          }
        }

        // Wrap entire bulk operation in a transaction
        const result = await db.transaction(async (tx) => {
          let assignedCount = 0;
          let failed = 0;

          // Process each member
          for (const memberId of ids) {
            // Insert all poles for this member
            for (const pole of polesData) {
              try {
                await tx.insert(memberPoles).values({
                  memberId,
                  poleId: pole.poleId,
                  level: (pole.level as typeof LEVELS[number]) || 'beginner',
                  isPrimary: pole.isPrimary ?? false,
                });
                assignedCount++;
              } catch {
                // Track failures but continue with other poles/members
                failed++;
              }
            }
          }

          return { assignedCount, failed };
        });

        return NextResponse.json({
          success: true,
          assignedCount: result.assignedCount,
          failed: result.failed,
        });
      }

      default:
        return NextResponse.json({ error: 'Action inconnue' }, { status: 400 });
    }
  } catch (err) {
    console.error('Admin members error:', err);
    return NextResponse.json({ error: 'Une erreur est survenue. Veuillez réessayer.' }, { status: 500 });
  }
}
