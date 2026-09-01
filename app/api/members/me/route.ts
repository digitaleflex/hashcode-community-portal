import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  members,
  memberProfiles,
  memberPoles,
  memberInterests,
  communicationPreferences,
  poles,
  interests,
} from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { getSession } from '@/lib/auth';

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  }

  const member = await db
    .select()
    .from(members)
    .where(eq(members.id, session.memberId))
    .limit(1);

  if (member.length === 0) {
    return NextResponse.json({ error: 'Membre non trouvé' }, { status: 404 });
  }

  const profile = await db
    .select()
    .from(memberProfiles)
    .where(eq(memberProfiles.memberId, session.memberId))
    .limit(1);

  const memberPolesData = await db
    .select({
      pole: poles,
      isPrimary: memberPoles.isPrimary,
      level: memberPoles.level,
    })
    .from(memberPoles)
    .innerJoin(poles, eq(memberPoles.poleId, poles.id))
    .where(eq(memberPoles.memberId, session.memberId));

  const memberInterestsData = await db
    .select({ interest: interests })
    .from(memberInterests)
    .innerJoin(interests, eq(memberInterests.interestId, interests.id))
    .where(eq(memberInterests.memberId, session.memberId));

  const commPrefs = await db
    .select()
    .from(communicationPreferences)
    .where(eq(communicationPreferences.memberId, session.memberId))
    .limit(1);

  return NextResponse.json({
    member: member[0],
    profile: profile[0] || null,
    poles: memberPolesData,
    interests: memberInterestsData.map((i) => i.interest),
    communicationPrefs: commPrefs[0] || null,
  });
}

export async function PATCH(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const memberId = session.memberId;

    // Update member
    if (body.firstName !== undefined || body.lastName !== undefined || body.age !== undefined || body.country !== undefined || body.phone !== undefined) {
      await db
        .update(members)
        .set({
          firstName: body.firstName,
          lastName: body.lastName,
          age: body.age,
          country: body.country,
          phone: body.phone,
          status: 'updated',
          updatedAt: new Date(),
        })
        .where(eq(members.id, memberId));
    }

    // Upsert profile
    if (body.occupation !== undefined || body.bio !== undefined || body.linkedinUrl !== undefined || body.timeAvailable !== undefined || body.workPreference !== undefined) {
      const existing = await db
        .select()
        .from(memberProfiles)
        .where(eq(memberProfiles.memberId, memberId))
        .limit(1);

      if (existing.length > 0) {
        await db
          .update(memberProfiles)
          .set({
            occupation: body.occupation,
            bio: body.bio,
            linkedinUrl: body.linkedinUrl,
            timeAvailable: body.timeAvailable,
            workPreference: body.workPreference,
          })
          .where(eq(memberProfiles.memberId, memberId));
      } else {
        await db.insert(memberProfiles).values({
          memberId,
          occupation: body.occupation,
          bio: body.bio,
          linkedinUrl: body.linkedinUrl,
          timeAvailable: body.timeAvailable,
          workPreference: body.workPreference,
        });
      }
    }

    // Update poles
    if (body.poles !== undefined && Array.isArray(body.poles)) {
      await db.delete(memberPoles).where(eq(memberPoles.memberId, memberId));

      for (const p of body.poles) {
        const poleRow = await db
          .select()
          .from(poles)
          .where(eq(poles.slug, p.slug))
          .limit(1);

        if (poleRow.length > 0) {
          await db.insert(memberPoles).values({
            memberId,
            poleId: poleRow[0].id,
            isPrimary: p.isPrimary === true,
            level: p.level || 'beginner',
          });
        }
      }
    }

    // Update interests
    if (body.interests !== undefined && Array.isArray(body.interests)) {
      await db.delete(memberInterests).where(eq(memberInterests.memberId, memberId));

      for (const slug of body.interests) {
        const interestRow = await db
          .select()
          .from(interests)
          .where(eq(interests.slug, slug))
          .limit(1);

        if (interestRow.length > 0) {
          await db.insert(memberInterests).values({
            memberId,
            interestId: interestRow[0].id,
          });
        }
      }
    }

    // Update communication preferences
    if (body.communicationPrefs !== undefined) {
      const existing = await db
        .select()
        .from(communicationPreferences)
        .where(eq(communicationPreferences.memberId, memberId))
        .limit(1);

      if (existing.length > 0) {
        await db
          .update(communicationPreferences)
          .set(body.communicationPrefs)
          .where(eq(communicationPreferences.memberId, memberId));
      } else {
        await db.insert(communicationPreferences).values({
          memberId,
          ...body.communicationPrefs,
        });
      }
    }

    // Update member status to active if everything is set
    await db
      .update(members)
      .set({ status: 'active' })
      .where(eq(members.id, memberId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('PATCH member error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
