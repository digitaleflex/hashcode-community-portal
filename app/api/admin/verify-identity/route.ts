export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { members, memberVerifications } from '@/lib/db/schema';
import { eq, or, ilike } from 'drizzle-orm';
import { requireAdmin } from '@/lib/auth';
import { validateUUID } from '@/lib/server-validation';
import { rateLimit } from '@/lib/rate-limit';

function getClientIp(request: Request): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown';
}

const FLAG_KEYS = ['emailVerified', 'linkedinVerified', 'identityVerified', 'contributor'] as const;

function computeTrustScore(row: { emailVerified: boolean; linkedinVerified: boolean; identityVerified: boolean; contributor: boolean }): number {
  return FLAG_KEYS.reduce((acc, k) => acc + (row[k] ? 1 : 0), 0);
}

export async function GET(request: Request) {
  const { error, isAdmin } = await requireAdmin();
  if (error) return error;

  const ip = getClientIp(request);
  if (!await rateLimit(`admin:${ip}`, 60, 60000)) {
    return NextResponse.json({ error: 'Trop de requêtes, veuillez attendre.' }, { status: 429 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const q = (searchParams.get('q') || '').trim().slice(0, 254);
    if (!q) {
      return NextResponse.json({ member: null, verification: null });
    }

    let memberRows;
    if (validateUUID(q)) {
      memberRows = await db.select().from(members).where(eq(members.id, q)).limit(1);
    } else {
      const normalized = q.toLowerCase();
      memberRows = await db
        .select()
        .from(members)
        .where(or(eq(members.email, normalized), ilike(members.email, `%${normalized}%`)))
        .limit(1);
    }

    if (memberRows.length === 0) {
      return NextResponse.json({ member: null, verification: null }, { status: 404 });
    }

    const member = memberRows[0];
    const verRows = await db
      .select()
      .from(memberVerifications)
      .where(eq(memberVerifications.memberId, member.id))
      .limit(1);

    const verification = verRows[0] || {
      memberId: member.id,
      emailVerified: false,
      linkedinVerified: false,
      identityVerified: false,
      contributor: false,
      trustScore: 0,
    };

    return NextResponse.json({
      member: {
        id: member.id,
        email: member.email,
        firstName: member.firstName,
        lastName: member.lastName,
        status: member.status,
      },
      verification: {
        ...verification,
        trustScore: computeTrustScore(verification as any),
      },
    });
  } catch (err) {
    console.error('GET /api/admin/verify-identity error:', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const { session, error, isAdmin } = await requireAdmin();
  if (error) return error;

  const ip = getClientIp(request);
  if (!await rateLimit(`admin:${ip}`, 20, 60000)) {
    return NextResponse.json({ error: 'Trop de requêtes, veuillez attendre.' }, { status: 429 });
  }

  try {
    const body = await request.json();

    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'JSON invalide' }, { status: 400 });
    }

    const { memberId } = body;
    if (!validateUUID(memberId)) {
      return NextResponse.json({ error: 'memberId invalide' }, { status: 400 });
    }

    const flags: Record<(typeof FLAG_KEYS)[number], boolean> = {
      emailVerified: body.emailVerified === true,
      linkedinVerified: body.linkedinVerified === true,
      identityVerified: body.identityVerified === true,
      contributor: body.contributor === true,
    };

    const memberRows = await db.select({ id: members.id }).from(members).where(eq(members.id, memberId)).limit(1);
    if (memberRows.length === 0) {
      return NextResponse.json({ error: 'Membre non trouvé' }, { status: 404 });
    }

    const existing = await db
      .select()
      .from(memberVerifications)
      .where(eq(memberVerifications.memberId, memberId))
      .limit(1);

    const now = new Date();
    const trustScore = computeTrustScore(flags);

    let saved;
    if (existing.length === 0) {
      [saved] = await db
        .insert(memberVerifications)
        .values({
          memberId,
          ...flags,
          verifiedBy: session!.memberId,
          verifiedAt: now,
          createdAt: now,
          updatedAt: now,
        })
        .returning();
    } else {
      [saved] = await db
        .update(memberVerifications)
        .set({
          ...flags,
          verifiedBy: session!.memberId,
          verifiedAt: now,
          updatedAt: now,
        })
        .where(eq(memberVerifications.memberId, memberId))
        .returning();
    }

    return NextResponse.json({
      verification: { ...saved, trustScore },
    });
  } catch (err) {
    console.error('Admin members error:', err);
    return NextResponse.json({ error: 'Une erreur est survenue. Veuillez réessayer.' }, { status: 500 });
  }
}
