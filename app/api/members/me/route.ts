export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { members, memberProfiles, memberPoles, memberInterests, poles, interests, communicationPreferences } from "@/lib/db/schema";
import { eq, and, inArray, or, ilike } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import {
  validateOptionalString,
  validateOptionalAge,
  validateOptionalEnum,
  validateOptionalLinkedinUrl,
  validateCommPrefs,
  validatePoles,
  validateInterestNames,
  validateGender,
  slugifyName,
  OCCUPATIONS,
  LEVELS,
} from "@/lib/server-validation";

type PoleSelection = {
  slug: string;
  level: (typeof LEVELS)[number];
  isPrimary: boolean;
};

const bad = (error: string) => NextResponse.json({ error }, { status: 400 });

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
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return bad("JSON invalide");
    }
    if (typeof body !== "object" || body === null) return bad("Requête invalide");
    const data = body as Record<string, unknown>;

    // ── VALIDATE EVERYTHING BEFORE TOUCHING THE DATABASE ──
    const memberUpdates: Record<string, unknown> = {};
    if (data.firstName !== undefined) {
      const c = validateOptionalString(data.firstName, 'Prénom', 100);
      if (!c.ok) return bad(c.error);
      memberUpdates.firstName = c.value;
    }
    if (data.lastName !== undefined) {
      const c = validateOptionalString(data.lastName, 'Nom', 100);
      if (!c.ok) return bad(c.error);
      memberUpdates.lastName = c.value;
    }
    if (data.country !== undefined) {
      const c = validateOptionalString(data.country, 'Pays', 100);
      if (!c.ok) return bad(c.error);
      memberUpdates.country = c.value;
    }
    if (data.city !== undefined) {
      const c = validateOptionalString(data.city, 'Ville', 100);
      if (!c.ok) return bad(c.error);
      memberUpdates.city = c.value;
    }
    if (data.phone !== undefined) {
      const c = validateOptionalString(data.phone, 'Téléphone', 30);
      if (!c.ok) return bad(c.error);
      memberUpdates.phone = c.value;
    }
    if (data.age !== undefined) {
      const c = validateOptionalAge(data.age);
      if (!c.ok) return bad(c.error);
      memberUpdates.age = c.value;
    }
    if (data.gender !== undefined) {
      const c = validateGender(data.gender);
      if (!c.ok) return bad(c.error);
      memberUpdates.gender = c.value;
    }

    const profileUpdates: Record<string, unknown> = {};
    if (data.occupation !== undefined) {
      const c = validateOptionalEnum(data.occupation, OCCUPATIONS, 'Occupation');
      if (!c.ok) return bad(c.error);
      profileUpdates.occupation = c.value;
    }
    if (data.bio !== undefined) {
      const c = validateOptionalString(data.bio, 'Bio', 500);
      if (!c.ok) return bad(c.error);
      profileUpdates.bio = c.value;
    }
    if (data.linkedinUrl !== undefined) {
      const c = validateOptionalLinkedinUrl(data.linkedinUrl);
      if (!c.ok) return bad(c.error);
      profileUpdates.linkedinUrl = c.value;
    }

    let polesData: PoleSelection[] | null = null;
    if (data.poles !== undefined) {
      const c = validatePoles(data.poles);
      if (!c.ok) return bad(c.error);
      polesData = c.value;
    }

    let interestNames: string[] | null = null;
    if (data.interests !== undefined) {
      const c = validateInterestNames(data.interests);
      if (!c.ok) return bad(c.error);
      interestNames = c.value;
    }

    let commPrefs: Record<string, boolean> | null = null;
    if (data.communicationPrefs !== undefined) {
      const c = validateCommPrefs(data.communicationPrefs);
      if (!c.ok) return bad(c.error);
      commPrefs = c.value;
    }

    const [current] = await db
      .select({ status: members.status })
      .from(members)
      .where(eq(members.id, session.memberId))
      .limit(1);

    if (!current) {
      return NextResponse.json({ error: "Membre non trouvé" }, { status: 404 });
    }

    // ── ATOMIC UPDATE (wraps all writes in a single transaction) ───
    // Completing onboarding (selecting poles) activates the profile.
    if (polesData && polesData.length > 0 && ["imported", "claimed", "verified"].includes(current.status)) {
      memberUpdates.status = "active";
    }

    await db.transaction(async (tx) => {
      // ── MEMBER BASICS ────────────────────────────────────
      if (Object.keys(memberUpdates).length > 0) {
        memberUpdates.updatedAt = new Date();
        await tx.update(members).set(memberUpdates).where(eq(members.id, session.memberId));
      }

      // ── PROFILE (upsert) ─────────────────────────────────
      if (Object.keys(profileUpdates).length > 0) {
        const [existing] = await tx
          .select({ id: memberProfiles.id })
          .from(memberProfiles)
          .where(eq(memberProfiles.memberId, session.memberId))
          .limit(1);

        if (existing) {
          await tx
            .update(memberProfiles)
            .set(profileUpdates)
            .where(eq(memberProfiles.memberId, session.memberId));
        } else {
          await tx.insert(memberProfiles).values({
            memberId: session.memberId,
            ...profileUpdates,
          });
        }
      }

      // ── POLES (replace) ──────────────────────────────────
      if (polesData !== null) {
        await tx.delete(memberPoles).where(eq(memberPoles.memberId, session.memberId));

        if (polesData.length > 0) {
          const poleRows = await tx
            .select({ id: poles.id, slug: poles.slug })
            .from(poles)
            .where(inArray(poles.slug, polesData.map((p) => p.slug)));

          const poleIdBySlug = new Map(poleRows.map((p) => [p.slug, p.id]));

          const values = polesData
            .filter((p) => poleIdBySlug.has(p.slug))
            .map((p) => ({
              memberId: session.memberId,
              poleId: poleIdBySlug.get(p.slug)!,
              level: p.level,
              isPrimary: p.isPrimary,
            }));

          if (values.length > 0) {
            await tx.insert(memberPoles).values(values);
          }
        }
      }

      // ── INTERESTS (replace) ──────────────────────────────
      if (interestNames !== null) {
        await tx.delete(memberInterests).where(eq(memberInterests.memberId, session.memberId));

        const insertedInterestIds: string[] = [];

        for (const name of interestNames) {
          const slug = slugifyName(name);
          let [interest] = await tx
            .select({ id: interests.id })
            .from(interests)
            .where(or(eq(interests.slug, slug), ilike(interests.name, name)))
            .limit(1);

          if (!interest) {
            const created = await tx
              .insert(interests)
              .values({ slug, name })
              .onConflictDoNothing()
              .returning({ id: interests.id });
            if (created.length > 0) {
              interest = created[0];
            } else {
              const [existing] = await tx
                .select({ id: interests.id })
                .from(interests)
                .where(eq(interests.slug, slug))
                .limit(1);
              interest = existing;
            }
          }

          if (interest && !insertedInterestIds.includes(interest.id)) {
            insertedInterestIds.push(interest.id);
          }
        }

        if (insertedInterestIds.length > 0) {
          await tx.insert(memberInterests).values(
            insertedInterestIds.map((interestId) => ({
              memberId: session.memberId,
              interestId,
            }))
          );
        }
      }

      // ── COMMUNICATION PREFS (upsert, whitelisted keys only) ──
      if (commPrefs !== null) {
        const [existing] = await tx
          .select({ id: communicationPreferences.id })
          .from(communicationPreferences)
          .where(eq(communicationPreferences.memberId, session.memberId))
          .limit(1);

        if (existing) {
          await tx
            .update(communicationPreferences)
            .set(commPrefs)
            .where(eq(communicationPreferences.memberId, session.memberId));
        } else {
          await tx.insert(communicationPreferences).values({
            memberId: session.memberId,
            ...commPrefs,
          });
        }
      }
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("PATCH /api/members/me error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
