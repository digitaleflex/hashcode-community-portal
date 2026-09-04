export const dynamic = 'force-dynamic';
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
import { eq, asc } from 'drizzle-orm';
import { requireAdmin } from '@/lib/auth';
import {
  validateUUID,
  validateOptionalString,
  validateOptionalAge,
  validateEnum,
  validateGender,
  MEMBER_STATUSES,
  GENDERS,
} from '@/lib/server-validation';
import { rateLimit } from '@/lib/rate-limit';

import { getClientIp } from '@/lib/request';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // Rate limit first: cheap IP check before the DB-backed admin lookup,
  // so a valid admin session can't be used to bypass throttling.
  const ip = getClientIp(request);
  if (!await rateLimit(`admin:${ip}`, 60, 60000)) {
    return NextResponse.json({ error: 'Trop de requêtes, veuillez attendre.' }, { status: 429 });
  }

  const { error, isAdmin } = await requireAdmin();
  if (error) return error;

  const { id } = await params;

  if (!validateUUID(id)) {
    return NextResponse.json({ error: 'Identifiant invalide' }, { status: 400 });
  }

  try {
    const [
      memberRows,
      profileRows,
      poleRows,
      interestRows,
      commRows,
      historyRows,
    ] = await Promise.all([
      db.select().from(members).where(eq(members.id, id)).limit(1),
      db.select().from(memberProfiles).where(eq(memberProfiles.memberId, id)).limit(1),
      db
        .select({ pole: poles, isPrimary: memberPoles.isPrimary, level: memberPoles.level })
        .from(memberPoles)
        .innerJoin(poles, eq(memberPoles.poleId, poles.id))
        .where(eq(memberPoles.memberId, id)),
      db
        .select({ interest: interests })
        .from(memberInterests)
        .innerJoin(interests, eq(memberInterests.interestId, interests.id))
        .where(eq(memberInterests.memberId, id)),
      db
        .select()
        .from(communicationPreferences)
        .where(eq(communicationPreferences.memberId, id))
        .limit(1),
      db
        .select()
        .from(communityHistory)
        .where(eq(communityHistory.memberId, id))
        .orderBy(asc(communityHistory.createdAt)),
    ]);

    if (memberRows.length === 0) {
      return NextResponse.json({ error: 'Membre non trouvé' }, { status: 404 });
    }

    return NextResponse.json({
      member: memberRows[0],
      profile: profileRows[0] || null,
      poles: poleRows,
      interests: interestRows.map((i) => i.interest),
      communicationPrefs: commRows[0] || null,
      history: historyRows,
    });
  } catch (error) {
    console.error('GET /api/admin/members/[id] error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

const ALLOWED_FIELDS = ['firstName', 'lastName', 'status', 'country', 'phone', 'city', 'age', 'gender'] as const;

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // Rate limit first (see GET above).
  const ip = getClientIp(request);
  if (!await rateLimit(`admin:${ip}`, 20, 60000)) {
    return NextResponse.json({ error: 'Trop de requêtes, veuillez attendre.' }, { status: 429 });
  }

  const { error, isAdmin } = await requireAdmin();
  if (error) return error;

  const { id } = await params;

  if (!validateUUID(id)) {
    return NextResponse.json({ error: 'Identifiant invalide' }, { status: 400 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'JSON invalide' }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};

  try {
    for (const field of ALLOWED_FIELDS) {
      if (body[field] === undefined) continue;

      let check;
      switch (field) {
        case 'firstName': check = validateOptionalString(body.firstName, 'Prénom', 100); break;
        case 'lastName': check = validateOptionalString(body.lastName, 'Nom', 100); break;
        case 'country': check = validateOptionalString(body.country, 'Pays', 100); break;
        case 'city': check = validateOptionalString(body.city, 'Ville', 100); break;
        case 'phone': check = validateOptionalString(body.phone, 'Téléphone', 30); break;
        case 'age': check = validateOptionalAge(body.age); break;
        case 'gender': check = validateGender(body.gender); break;
        case 'status': check = validateEnum(body.status, MEMBER_STATUSES, 'Statut'); break;
      }
      if (!check || !check.ok) {
        const message = check && !check.ok ? check.error : 'Champ invalide';
        return NextResponse.json({ error: `${field} : ${message}` }, { status: 400 });
      }
      updates[field] = check.value as string | number | null;
    }

    if (Object.keys(updates).length === 0 && body.bio === undefined && body.linkedinUrl === undefined && body.occupation === undefined) {
      return NextResponse.json({ error: 'Aucun champ à mettre à jour' }, { status: 400 });
    }

    // Profile data (bio, LinkedIn, occupation)
    const profileData: Record<string, unknown> = {};
    if (body.bio !== undefined) profileData.bio = body.bio;
    if (body.linkedinUrl !== undefined) profileData.linkedinUrl = body.linkedinUrl;
    if (body.occupation !== undefined) profileData.occupation = body.occupation;

    updates.updatedAt = new Date();

    // Wrap in transaction: check existence first, then do profile upsert + member update
    const result = await db.transaction(async (tx) => {
      // Check member exists first
      const memberRows = await tx
        .select({ id: members.id })
        .from(members)
        .where(eq(members.id, id))
        .limit(1);

      if (memberRows.length === 0) {
        return { notFound: true };
      }

      // Upsert profile if there's profile data
      if (Object.keys(profileData).length > 0) {
        await tx.insert(memberProfiles).values({
          memberId: id,
          ...profileData,
        }).onConflictDoUpdate({
          target: memberProfiles.memberId,
          set: profileData,
        });
      }

      // Update member
      const updated = await tx
        .update(members)
        .set(updates)
        .where(eq(members.id, id))
        .returning({ id: members.id });

      return { notFound: false, updated };
    });

    if (result.notFound) {
      return NextResponse.json({ error: 'Membre non trouvé' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('PATCH /api/admin/members/[id] error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // Rate limit first (see GET above).
  const ip = getClientIp(request);
  if (!await rateLimit(`admin:${ip}`, 20, 60000)) {
    return NextResponse.json({ error: 'Trop de requêtes, veuillez attendre.' }, { status: 429 });
  }

  const { error, isAdmin } = await requireAdmin();
  if (error) return error;

  const { id } = await params;

  if (!validateUUID(id)) {
    return NextResponse.json({ error: 'Identifiant invalide' }, { status: 400 });
  }

  try {
    // Wrap delete in transaction
    const result = await db.transaction(async (tx) => {
      return tx.delete(members).where(eq(members.id, id)).returning({ id: members.id });
    });

    if (result.length === 0) {
      return NextResponse.json({ error: 'Membre non trouvé' }, { status: 404 });
    }

    return NextResponse.json({ success: true, deletedId: result[0].id });
  } catch (error) {
    console.error('DELETE /api/admin/members/[id] error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
