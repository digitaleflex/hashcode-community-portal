import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  members,
  memberProfiles,
  memberPoles,
  memberInterests,
  poles,
  interests,
} from '@/lib/db/schema';
import { eq, asc } from 'drizzle-orm';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const [memberRows, profileRows, poleRows, interestRows] = await Promise.all([
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
  ]);

  if (memberRows.length === 0) {
    return NextResponse.json({ error: 'Membre non trouvé' }, { status: 404 });
  }

  const member = memberRows[0];

  return NextResponse.json({
    member: {
      id: member.id,
      firstName: member.firstName,
      lastName: member.lastName,
      country: member.country,
      city: member.city,
      status: member.status,
      createdAt: member.createdAt,
    },
    profile: profileRows[0] || null,
    poles: poleRows,
    interests: interestRows.map((i) => i.interest),
  });
}
