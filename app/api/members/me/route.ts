import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { members, memberProfiles, memberPoles, memberInterests, poles, interests, communicationPreferences } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  try {
    const [member] = await db
      .select()
      .from(members)
      .where(eq(members.id, session.memberId))
      .limit(1);

    if (!member) {
      return NextResponse.json({ error: "Membre non trouvé" }, { status: 404 });
    }

    const [profile] = await db
      .select()
      .from(memberProfiles)
      .where(eq(memberProfiles.memberId, session.memberId))
      .limit(1);

    const memberPolesList = await db
      .select({
        id: memberPoles.poleId,
        level: memberPoles.level,
        isPrimary: memberPoles.isPrimary,
        pole: poles,
      })
      .from(memberPoles)
      .innerJoin(poles, eq(poles.id, memberPoles.poleId))
      .where(eq(memberPoles.memberId, session.memberId));

    const memberInterestsList = await db
      .select({
        id: interests.id,
        slug: interests.slug,
        name: interests.name,
      })
      .from(memberInterests)
      .innerJoin(interests, eq(interests.id, memberInterests.interestId))
      .where(eq(memberInterests.memberId, session.memberId));

    const [prefs] = await db
      .select()
      .from(communicationPreferences)
      .where(eq(communicationPreferences.memberId, session.memberId))
      .limit(1);

    return NextResponse.json({
      member,
      isAdmin: session.email.toLowerCase() === (process.env.ADMIN_EMAIL?.toLowerCase() || ''),
      profile: profile || null,
      poles: memberPolesList,
      interests: memberInterestsList,
      communicationPrefs: prefs || null,
    });
  } catch (error) {
    console.error("GET /api/members/me error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const {
      firstName,
      lastName,
      age,
      country,
      city,
      phone,
      occupation,
      bio,
      linkedinUrl,
      poles: polesData,
      interests: interestsData,
      communicationPrefs,
    } = body;

    // Update member basic info
    const memberUpdates: any = {};
    if (firstName !== undefined) memberUpdates.firstName = firstName;
    if (lastName !== undefined) memberUpdates.lastName = lastName;
    if (age !== undefined) memberUpdates.age = age;
    if (country !== undefined) memberUpdates.country = country;
    if (city !== undefined) memberUpdates.city = city;
    if (phone !== undefined) memberUpdates.phone = phone;
    memberUpdates.updatedAt = new Date();

    if (Object.keys(memberUpdates).length > 0) {
      await db.update(members).set(memberUpdates).where(eq(members.id, session.memberId));
    }

    // Update or create profile
    if (occupation !== undefined || bio !== undefined || linkedinUrl !== undefined) {
      const [existing] = await db
        .select()
        .from(memberProfiles)
        .where(eq(memberProfiles.memberId, session.memberId))
        .limit(1);

      const profileUpdates: any = {};
      if (occupation !== undefined) profileUpdates.occupation = occupation;
      if (bio !== undefined) profileUpdates.bio = bio;
      if (linkedinUrl !== undefined) profileUpdates.linkedinUrl = linkedinUrl;

      if (existing) {
        await db
          .update(memberProfiles)
          .set(profileUpdates)
          .where(eq(memberProfiles.memberId, session.memberId));
      } else {
        await db.insert(memberProfiles).values({
          memberId: session.memberId,
          ...profileUpdates,
        });
      }
    }

    // Update poles
    if (polesData !== undefined && Array.isArray(polesData)) {
      await db.delete(memberPoles).where(eq(memberPoles.memberId, session.memberId));

      for (const poleData of polesData) {
        const [pole] = await db
          .select()
          .from(poles)
          .where(eq(poles.slug, poleData.slug))
          .limit(1);

        if (pole) {
          await db.insert(memberPoles).values({
            memberId: session.memberId,
            poleId: pole.id,
            level: poleData.level || "beginner",
            isPrimary: poleData.isPrimary || false,
          });
        }
      }
    }

    // Update interests
    if (interestsData !== undefined && Array.isArray(interestsData)) {
      await db.delete(memberInterests).where(eq(memberInterests.memberId, session.memberId));

      for (const slug of interestsData) {
        const [interest] = await db
          .select()
          .from(interests)
          .where(eq(interests.slug, slug))
          .limit(1);

        if (interest) {
          await db.insert(memberInterests).values({
            memberId: session.memberId,
            interestId: interest.id,
          });
        }
      }
    }

    // Update communication prefs
    if (communicationPrefs !== undefined) {
      const [existing] = await db
        .select()
        .from(communicationPreferences)
        .where(eq(communicationPreferences.memberId, session.memberId))
        .limit(1);

      if (existing) {
        await db
          .update(communicationPreferences)
          .set(communicationPrefs)
          .where(eq(communicationPreferences.memberId, session.memberId));
      } else {
        await db.insert(communicationPreferences).values({
          memberId: session.memberId,
          ...communicationPrefs,
        });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("PATCH /api/members/me error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}