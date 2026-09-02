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

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;

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
}

const ALLOWED_FIELDS = ['firstName', 'lastName', 'status', 'country', 'phone', 'city', 'age'] as const;

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;
  const body = await request.json();

  const updates: Record<string, any> = {};
  for (const field of ALLOWED_FIELDS) {
    if (body[field] !== undefined) updates[field] = body[field];
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Aucun champ à mettre à jour' }, { status: 400 });
  }

  updates.updatedAt = new Date();

  await db.update(members).set(updates).where(eq(members.id, id));

  return NextResponse.json({ success: true });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;

  const result = await db.delete(members).where(eq(members.id, id)).returning({ id: members.id });

  if (result.length === 0) {
    return NextResponse.json({ error: 'Membre non trouvé' }, { status: 404 });
  }

  return NextResponse.json({ success: true, deletedId: result[0].id });
}
