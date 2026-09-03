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
import { eq } from 'drizzle-orm';
import { rateLimit } from '@/lib/auth';
import { getClientIp } from '@/lib/request';
import { validateUUID } from '@/lib/server-validation';

// Public member profile — limited fields, no email, no age.

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ip = getClientIp(request);
    if (!await rateLimit(`member-detail:${ip}`, 60, 60000)) {
      return NextResponse.json({ error: 'Trop de requêtes' }, { status: 429 });
    }

    const { id } = await params;

    if (!validateUUID(id)) {
      return NextResponse.json({ error: 'Identifiant invalide' }, { status: 400 });
    }

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
  } catch (error) {
    console.error('GET /api/members/[id] error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
