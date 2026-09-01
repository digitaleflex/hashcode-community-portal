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
import { eq } from 'drizzle-orm';
import { getSession } from '@/lib/auth';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  }

  const { id } = await params;

  const member = await db
    .select()
    .from(members)
    .where(eq(members.id, id))
    .limit(1);

  if (member.length === 0) {
    return NextResponse.json({ error: 'Membre non trouvé' }, { status: 404 });
  }

  const profile = await db
    .select()
    .from(memberProfiles)
    .where(eq(memberProfiles.memberId, id))
    .limit(1);

  const memberPolesData = await db
    .select({ pole: poles, isPrimary: memberPoles.isPrimary, level: memberPoles.level })
    .from(memberPoles)
    .innerJoin(poles, eq(memberPoles.poleId, poles.id))
    .where(eq(memberPoles.memberId, id));

  const memberInterestsData = await db
    .select({ interest: interests })
    .from(memberInterests)
    .innerJoin(interests, eq(memberInterests.interestId, interests.id))
    .where(eq(memberInterests.memberId, id));

  const commPrefs = await db
    .select()
    .from(communicationPreferences)
    .where(eq(communicationPreferences.memberId, id))
    .limit(1);

  const history = await db
    .select()
    .from(communityHistory)
    .where(eq(communityHistory.memberId, id))
    .orderBy(communityHistory.createdAt);

  return NextResponse.json({
    member: member[0],
    profile: profile[0] || null,
    poles: memberPolesData,
    interests: memberInterestsData.map((i) => i.interest),
    communicationPrefs: commPrefs[0] || null,
    history,
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();

  if (body.firstName !== undefined) {
    await db.update(members).set({ firstName: body.firstName }).where(eq(members.id, id));
  }
  if (body.lastName !== undefined) {
    await db.update(members).set({ lastName: body.lastName }).where(eq(members.id, id));
  }
  if (body.status !== undefined) {
    await db.update(members).set({ status: body.status }).where(eq(members.id, id));
  }
  if (body.country !== undefined) {
    await db.update(members).set({ country: body.country }).where(eq(members.id, id));
  }
  if (body.phone !== undefined) {
    await db.update(members).set({ phone: body.phone }).where(eq(members.id, id));
  }

  return NextResponse.json({ success: true });
}
