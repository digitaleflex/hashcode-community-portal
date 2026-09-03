export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { members, memberPoles, poles } from '@/lib/db/schema';
import { eq, inArray, sql, and } from 'drizzle-orm';
import { requireAdmin } from '@/lib/auth';
import { validateUUID, validateOptionalEnum, LEVELS } from '@/lib/server-validation';
import { rateLimit } from '@/lib/rate-limit';

import { getClientIp } from '@/lib/request';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, isAdmin } = await requireAdmin();
  if (error) return error;

  const ip = getClientIp(request);
  if (!await rateLimit(`admin:${ip}`, 60, 60000)) {
    return NextResponse.json({ error: 'Trop de requêtes, veuillez attendre.' }, { status: 429 });
  }

  const { id } = await params;

  if (!validateUUID(id)) {
    return NextResponse.json({ error: 'Identifiant invalide' }, { status: 400 });
  }

  try {
    const memberPolesRows = await db
      .select({ pole: poles, isPrimary: memberPoles.isPrimary, level: memberPoles.level })
      .from(memberPoles)
      .innerJoin(poles, eq(memberPoles.poleId, poles.id))
      .where(eq(memberPoles.memberId, id));

    return NextResponse.json({ poles: memberPolesRows });
  } catch (error) {
    console.error('GET /api/admin/members/[id]/poles error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, isAdmin } = await requireAdmin();
  if (error) return error;

  const ip = getClientIp(request);
  if (!await rateLimit(`admin:${ip}`, 20, 60000)) {
    return NextResponse.json({ error: 'Trop de requêtes, veuillez attendre.' }, { status: 429 });
  }

  const { id } = await params;

  if (!validateUUID(id)) {
    return NextResponse.json({ error: 'Identifiant invalide' }, { status: 400 });
  }

  try {
    const body = await request.json();
    const { poleId, level, isPrimary } = body;

    if (!poleId) {
      return NextResponse.json({ error: 'Pôle requis' }, { status: 400 });
    }

    // Validate level against LEVELS enum if provided
    if (level !== undefined && level !== null && level !== '') {
      const levelCheck = validateOptionalEnum(level, LEVELS, 'Niveau');
      if (!levelCheck.ok) {
        return NextResponse.json({ error: levelCheck.error }, { status: 400 });
      }
    }

    // Vérifier que le pôle existe
    const poleExists = await db.select({ id: poles.id }).from(poles).where(eq(poles.id, poleId)).limit(1);
    if (poleExists.length === 0) {
      return NextResponse.json({ error: 'Pôle introuvable' }, { status: 404 });
    }

    // Optionnel : s'assurer qu'il n'y a qu'un seul pôle primaire par membre
    if (isPrimary) {
      await db
        .update(memberPoles)
        .set({ isPrimary: false })
        .where(inArray(memberPoles.memberId, [id]));
    }

    await db.insert(memberPoles).values({
      memberId: id,
      poleId,
      level: (level as typeof LEVELS[number]) || 'beginner',
      isPrimary: isPrimary ?? false,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('POST /api/admin/members/[id]/poles error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, isAdmin } = await requireAdmin();
  if (error) return error;

  const ip = getClientIp(request);
  if (!await rateLimit(`admin:${ip}`, 20, 60000)) {
    return NextResponse.json({ error: 'Trop de requêtes, veuillez attendre.' }, { status: 429 });
  }

  const { id } = await params;

  if (!validateUUID(id)) {
    return NextResponse.json({ error: 'Identifiant invalide' }, { status: 400 });
  }

  try {
    const { poleId, level } = await request.json();
    if (!poleId) {
      return NextResponse.json({ error: 'Pôle requis' }, { status: 400 });
    }

    // Validate level against LEVELS enum if provided
    if (level !== undefined && level !== null && level !== '') {
      const levelCheck = validateOptionalEnum(level, LEVELS, 'Niveau');
      if (!levelCheck.ok) {
        return NextResponse.json({ error: levelCheck.error }, { status: 400 });
      }
    }

    // Wrap delete in transaction
    const result = await db.transaction(async (tx) => {
      return tx
        .delete(memberPoles)
        .where(and(eq(memberPoles.memberId, id), eq(memberPoles.poleId, poleId)))
        .returning({ memberId: memberPoles.memberId, poleId: memberPoles.poleId });
    });

    return NextResponse.json({ success: true, deleted: result.length > 0 });
  } catch (error) {
    console.error('DELETE /api/admin/members/[id]/poles error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
