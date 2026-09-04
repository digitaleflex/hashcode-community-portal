export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { z } from "zod";
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
  GENDERS,
} from "@/lib/server-validation";

type PoleSelection = {
  slug: string;
  level: (typeof LEVELS)[number];
  isPrimary: boolean;
};

const bad = (error: string) => NextResponse.json({ error }, { status: 400 });

const PoleItemSchema = z.object({
  slug: z.string(),
  level: z.union([z.enum(LEVELS), z.literal(""), z.null()]).optional(),
  isPrimary: z.unknown().optional(),
});

// Payload partiel : tous les champs sont optionnels, les clés inconnues sont
// ignorées (strip, comme le whitelist manuel ci-dessous). Ne vérifie que les
// types : les contraintes métier (longueurs, formats, valeurs enum…) restent
// appliquées par les validateurs après le parse.
const MePatchBodySchema = z.object({
  firstName: z.union([z.string(), z.null()]).optional(),
  lastName: z.union([z.string(), z.null()]).optional(),
  country: z.union([z.string(), z.null()]).optional(),
  city: z.union([z.string(), z.null()]).optional(),
  phone: z.union([z.string(), z.null()]).optional(),
  age: z.union([z.string(), z.number(), z.null()]).optional(),
  gender: z.union([z.enum(GENDERS), z.literal(""), z.null()]).optional(),
  occupation: z.union([z.enum(OCCUPATIONS), z.literal(""), z.null()]).optional(),
  bio: z.union([z.string(), z.null()]).optional(),
  linkedinUrl: z.union([z.string(), z.null()]).optional(),
  poles: z.array(PoleItemSchema).optional(),
  interests: z.array(z.string()).optional(),
  communicationPrefs: z.record(z.string(), z.unknown()).optional(),
});

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  try {
    const [memberRows, profileRows, memberPolesList, memberInterestsList, prefsRows] = await Promise.all([
      db
        .select()
        .from(members)
        .where(eq(members.id, session.memberId))
        .limit(1),
      db
        .select()
        .from(memberProfiles)
        .where(eq(memberProfiles.memberId, session.memberId))
        .limit(1),
      db
        .select({
          id: memberPoles.poleId,
          level: memberPoles.level,
          isPrimary: memberPoles.isPrimary,
          pole: poles,
        })
        .from(memberPoles)
        .innerJoin(poles, eq(poles.id, memberPoles.poleId))
        .where(eq(memberPoles.memberId, session.memberId)),
      db
        .select({
          id: interests.id,
          slug: interests.slug,
          name: interests.name,
        })
        .from(memberInterests)
        .innerJoin(interests, eq(interests.id, memberInterests.interestId))
        .where(eq(memberInterests.memberId, session.memberId)),
      db
        .select()
        .from(communicationPreferences)
        .where(eq(communicationPreferences.memberId, session.memberId))
        .limit(1),
    ]);

    const [member] = memberRows;

    if (!member) {
      return NextResponse.json({ error: "Membre non trouvé" }, { status: 404 });
    }

    const [profile] = profileRows;

    const [prefs] = prefsRows;

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
    const parsed = MePatchBodySchema.safeParse(body);
    if (!parsed.success) return bad("Requête invalide");
    const data = parsed.data;

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

        if (interestNames.length > 0) {
          const slugs = interestNames.map((name) => slugifyName(name));

          // Batch lookup : 1 seul SELECT (slug OU display name).
          const existing = await tx
            .select({ id: interests.id, slug: interests.slug, name: interests.name })
            .from(interests)
            .where(
              or(
                inArray(interests.slug, slugs),
                ...interestNames.map((name) => ilike(interests.name, name))
              )
            );

          const idBySlug = new Map(existing.map((r) => [r.slug, r.id]));
          const idByLowerName = new Map(existing.map((r) => [r.name.toLowerCase(), r.id]));

          // Intérêts manquants à créer (dédupés par slug, premier display name conservé).
          const missingBySlug = new Map<string, string>();
          for (let i = 0; i < interestNames.length; i++) {
            const name = interestNames[i];
            const slug = slugs[i];
            if (!idBySlug.has(slug) && !idByLowerName.has(name.toLowerCase()) && !missingBySlug.has(slug)) {
              missingBySlug.set(slug, name);
            }
          }

          // Batch insert des inconnus (conflits concurrents ignorés).
          if (missingBySlug.size > 0) {
            const created = await tx
              .insert(interests)
              .values([...missingBySlug].map(([slug, name]) => ({ slug, name })))
              .onConflictDoNothing()
              .returning({ id: interests.id, slug: interests.slug });

            for (const row of created) {
              idBySlug.set(row.slug, row.id);
            }

            // Concurrence : les lignes en conflit n'ont rien retourné → 1 seul re-fetch.
            if (created.length < missingBySlug.size) {
              const refetched = await tx
                .select({ id: interests.id, slug: interests.slug })
                .from(interests)
                .where(inArray(interests.slug, [...missingBySlug.keys()]));
              for (const row of refetched) {
                if (!idBySlug.has(row.slug)) {
                  idBySlug.set(row.slug, row.id);
                }
              }
            }
          }

          // Dédup des ids puis 1 seul batch insert dans la jonction.
          const seenIds = new Set<string>();
          const values: { memberId: string; interestId: string }[] = [];
          for (let i = 0; i < interestNames.length; i++) {
            const name = interestNames[i];
            const id = idBySlug.get(slugs[i]) ?? idByLowerName.get(name.toLowerCase());
            if (id && !seenIds.has(id)) {
              seenIds.add(id);
              values.push({ memberId: session.memberId, interestId: id });
            }
          }

          if (values.length > 0) {
            await tx.insert(memberInterests).values(values);
          }
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
