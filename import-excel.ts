import { config } from "dotenv";
config({ path: ".env.local" });
import * as xlsx from "xlsx";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq } from "drizzle-orm";
import * as schema from "./lib/db/schema";

const sql = neon(process.env.DATABASE_URL_UNPOOLED!);
const db = drizzle(sql, { schema });

const FILES = [
  "Formulaire d'inscription pour HashCode Informatique (réponses).xlsx",
  "Préinscription HashCode Connect.xlsx",
  "Rejoignez innoveCode!   (réponses).xlsx",
];

function getVal(row: any[], idx: number): string {
  if (idx < 0 || idx >= row.length) return "";
  const v = row[idx];
  if (v === undefined || v === null) return "";
  return String(v).trim();
}

function findEmailCol(headers: any[]): number {
  for (let i = 0; i < headers.length; i++) {
    const h = String(headers[i] || "").toLowerCase();
    if (h.includes("e-mail") || h.includes("email") || h.includes("courriel")) {
      return i;
    }
  }
  return -1;
}

function splitName(full: string): { first: string; last: string } {
  const cleaned = full.replace(/\s+/g, " ").trim();
  if (!cleaned) return { first: "", last: "" };
  const parts = cleaned.split(" ");
  if (parts.length === 1) return { first: parts[0], last: "" };
  return { first: parts[0], last: parts.slice(1).join(" ") };
}

function detectPoleFromInfo(row: any[], fileIndex: number): string {
  const joinText = (indices: number[]): string =>
    indices.map((i) => getVal(row, i).toLowerCase()).join(" | ");

  let spec = "";
  let expertise = "";
  let passion = "";
  let techs = "";
  let goals = "";
  let needs = "";

  if (fileIndex === 0) {
    // HashCode Informatique
    spec = joinText([10, 17, 26, 28, 31, 33]);
    expertise = joinText([10]);
    passion = joinText([10]);
    techs = joinText([9, 20, 23, 28]);
    goals = joinText([12, 13, 17]);
    needs = joinText([17]);
  } else if (fileIndex === 1) {
    // HashCode Connect - checkboxes at columns 7-13
    if (getVal(row, 7).toLowerCase() === "true") return "cloud"; // Dev Web is closest to cloud in V1
    if (getVal(row, 8).toLowerCase() === "true") return "security";
    if (getVal(row, 9).toLowerCase() === "true") return "cloud";
    if (getVal(row, 10).toLowerCase() === "true") return "cloud";
    if (getVal(row, 11).toLowerCase() === "true") return "ai";
    if (getVal(row, 12).toLowerCase() === "true") return "ai";
    if (getVal(row, 13).toLowerCase() === "true") return "cloud"; // Content creation
  } else {
    // innoveCode
    expertise = joinText([6]);
  }

  const all = `${spec} ${expertise} ${passion} ${techs} ${goals} ${needs}`;

  // Security keywords
  if (
    /\b(cybersécurité|cybersecurite|cyber[ -]?sécurité|cyber[ -]?security|security|sécurité|pentest|hacking|forensic|blue[ -]?team|red[ -]?team|soc|appsec|osint|reverse[ -]?engineering|cryptographi|pare-?feu|firewall|vulnerabilit)\b/.test(
      all
    )
  ) {
    return "security";
  }

  // AI keywords
  if (
    /\b(intelligence artificielle|machine learning|deep learning|nlp|llm|ai|ia\b|generative|générative|prompt|chatbot|stable diffusion|langchain|modèle|model|algorithme|mathématiques?|statistiques?)\b/.test(
      all
    )
  ) {
    return "ai";
  }

  // Cloud keywords
  if (
    /\b(cloud|aws|azure|gcp|devops|kubernetes|docker|linux|infrastructure|terraform|ansible|ci[/-]?cd|monitoring|observability|web|développement|development|backend|frontend|full[ -]?stack|javascript|python|java\b|react|node)\b/.test(
      all
    )
  ) {
    return "cloud";
  }

  // Default by file
  if (fileIndex === 0) return "security";
  if (fileIndex === 1) return "security";
  return "cloud";
}

function detectLevelFromInfo(row: any[], fileIndex: number): string {
  let lvl = "";

  if (fileIndex === 0) {
    // HashCode Informatique
    const niveau = getVal(row, 8).toLowerCase();
    if (niveau.includes("débutant") || niveau.includes("debutant") || niveau.includes("🐣")) {
      lvl = "beginner";
    } else if (niveau.includes("intermédiaire") || niveau.includes("intermediaire") || niveau.includes("🔧")) {
      lvl = "intermediate";
    } else if (niveau.includes("avancé") || niveau.includes("avance") || niveau.includes("🧠") || niveau.includes("expert")) {
      lvl = "advanced";
    }
  } else if (fileIndex === 1) {
    const niveau = getVal(row, 5).toLowerCase();
    if (niveau.includes("🐣") || niveau.includes("débutant")) lvl = "beginner";
    else if (niveau.includes("🔧") || niveau.includes("intermédiaire")) lvl = "intermediate";
    else if (niveau.includes("🧠") || niveau.includes("avancé")) lvl = "advanced";
  } else {
    // innoveCode - no level column, default to beginner
    lvl = "beginner";
  }

  return lvl || "beginner";
}

function detectInterests(row: any[], fileIndex: number): string[] {
  const interests = new Set<string>();
  let blob = "";

  if (fileIndex === 0) {
    blob = [16, 12, 14, 17, 13, 18].map((i) => getVal(row, i)).join(" | ").toLowerCase();
  } else if (fileIndex === 1) {
    blob = [14, 15, 16].map((i) => getVal(row, i)).join(" | ").toLowerCase();
  } else {
    blob = [7, 9, 8].map((i) => getVal(row, i)).join(" | ").toLowerCase();
  }

  if (blob.includes("apprendre") || blob.includes("formation") || blob.includes("learn") || blob.includes("renforcer") || blob.includes("approfondir")) {
    interests.add("learn");
  }
  if (blob.includes("workshop") || blob.includes("atelier") || blob.includes("formation pratique") || blob.includes("challenge")) {
    interests.add("workshops");
  }
  if (blob.includes("projet") || blob.includes("project") || blob.includes("collaboratif")) {
    interests.add("projects");
  }
  if (blob.includes("opportun") || blob.includes("opportunité") || blob.includes("emploi") || blob.includes("job") || blob.includes("carrière") || blob.includes("professionnel")) {
    interests.add("opportunities");
  }
  if (blob.includes("réseau") || blob.includes("network") || blob.includes("networking") || blob.includes("événement") || blob.includes("meetup") || blob.includes("webinaire")) {
    interests.add("networking");
  }
  if (blob.includes("mentor") && (blob.includes("en tant que mentor") || blob.includes("devenir mentor") || blob.includes("encadrer"))) {
    interests.add("mentor");
  } else if (blob.includes("mentor") && (blob.includes("mentoré") || blob.includes("accompagné") || blob.includes("être mentoré"))) {
    interests.add("mentee");
  } else if (blob.includes("accompagn")) {
    interests.add("mentee");
  }
  if (blob.includes("entrepreneur") || blob.includes("startup") || blob.includes("fonder") || blob.includes("lancer") || blob.includes("innovation")) {
    interests.add("entrepreneurship");
  }

  return Array.from(interests);
}

async function main() {
  const args = process.argv.slice(2);
  const execute = args.includes("--execute");

  console.log(`\n${"=".repeat(60)}`);
  console.log(`HASHCODE Community Registry — Import historique`);
  console.log(`Mode: ${execute ? "🚀 EXECUTE" : "🔍 DRY RUN"}`);
  console.log("=".repeat(60));

  // Get poles and interests from DB
  const poles = await db.select().from(schema.poles);
  const poleBySlug: Record<string, any> = {};
  for (const p of poles) poleBySlug[p.slug] = p;

  const interests = await db.select().from(schema.interests);
  const interestBySlug: Record<string, any> = {};
  for (const i of interests) interestBySlug[i.slug] = i;

  // Collect all unique emails
  const emailMap = new Map<string, { file: string; fileIndex: number; row: any[]; headers: any[] }>();

  for (let f = 0; f < FILES.length; f++) {
    const file = FILES[f];
    console.log(`\n[${f + 1}/3] Reading: ${file}`);
    try {
      const wb = xlsx.readFile(file);
      const ws = wb.Sheets[wb.SheetNames[0]];
      const data = xlsx.utils.sheet_to_json(ws, { header: 1 }) as any[][];
      if (data.length <= 1) {
        console.log(`   ⚠ Empty file`);
        continue;
      }
      const headers = data[0];
      const rows = data.slice(1);
      const emailCol = findEmailCol(headers);
      if (emailCol === -1) {
        console.log(`   ⚠ No email column found`);
        continue;
      }
      console.log(`   Rows: ${rows.length}, Email col: ${emailCol}`);

      for (const row of rows) {
        const email = getVal(row, emailCol).toLowerCase();
        if (!email || !email.includes("@") || !email.includes(".")) continue;
        if (!emailMap.has(email)) {
          emailMap.set(email, { file, fileIndex: f, row, headers });
        }
      }
    } catch (e) {
      console.log(`   ❌ Error: ${e}`);
    }
  }

  console.log(`\n${"=".repeat(60)}`);
  console.log(`Total unique emails: ${emailMap.size}`);
  console.log("=".repeat(60));

  // Check which are already in DB
  const existing = await db
    .select({ email: schema.members.email })
    .from(schema.members);
  const existingEmails = new Set(existing.map((e) => e.email.toLowerCase()));

  let toImport = 0;
  let skipped = 0;
  for (const [email] of emailMap) {
    if (existingEmails.has(email)) skipped++;
    else toImport++;
  }

  console.log(`Already in DB: ${skipped}`);
  console.log(`To import: ${toImport}`);

  // Pole distribution preview
  const poleDist: Record<string, number> = { security: 0, ai: 0, cloud: 0 };
  const levelDist: Record<string, number> = { beginner: 0, intermediate: 0, advanced: 0 };

  const membersToInsert: any[] = [];
  const profilesToInsert: any[] = [];
  const memberPolesToInsert: any[] = [];
  const memberInterestsToInsert: any[] = [];
  const commPrefsToInsert: any[] = [];
  const historyToInsert: any[] = [];

  for (const [email, data] of emailMap) {
    if (existingEmails.has(email)) continue;
    const { row, fileIndex, file } = data;

    let firstName = "";
    let lastName = "";
    let phone = "";
    let country = "";
    let city = "";
    let linkedin = "";
    let age: number | null = null;
    let bio = "";
    let languages = "";
    let score: number | null = null;
    let oldGroup = "";
    let oldActivity = "";
    let occupation = "student";

    if (fileIndex === 0) {
      // HashCode Informatique
      const { first, last } = splitName(getVal(row, 4) || getVal(row, 2));
      firstName = first;
      lastName = last;
      phone = getVal(row, 3);
      country = getVal(row, 6);
      const ageStr = getVal(row, 5);
      if (ageStr) age = parseInt(ageStr) || null;
      languages = getVal(row, 7);
      bio = `Tech: ${getVal(row, 9)}. Spec: ${getVal(row, 10)}. Projects: ${getVal(row, 11)}.`.substring(0, 500);
      oldGroup = "HASHCODE Informatique";
      oldActivity = `Niveau: ${getVal(row, 8)}. Activités: ${getVal(row, 16)}.`;
      const scoreStr = getVal(row, 37);
      if (scoreStr) score = parseInt(scoreStr) || null;
    } else if (fileIndex === 1) {
      // HashCode Connect
      const { first, last } = splitName(getVal(row, 3));
      firstName = first;
      lastName = last;
      oldGroup = "HashCode Connect";
      oldActivity = getVal(row, 16) || "Connect";
      bio = `Niveau: ${getVal(row, 5)}. Domaines: ${getVal(row, 6)}.`.substring(0, 500);
    } else {
      // innoveCode
      const { first, last } = splitName(getVal(row, 2));
      firstName = first;
      lastName = last;
      country = getVal(row, 3);
      phone = getVal(row, 4);
      linkedin = getVal(row, 5);
      oldGroup = "innoveCode";
      oldActivity = `Domaine: ${getVal(row, 6)}. Motivation: ${getVal(row, 7)}.`;
      bio = oldActivity.substring(0, 500);
    }

    const poleSlug = detectPoleFromInfo(row, fileIndex);
    const level = detectLevelFromInfo(row, fileIndex);
    const interests = detectInterests(row, fileIndex);

    poleDist[poleSlug]++;
    levelDist[level]++;

    const memberId = crypto.randomUUID();

    membersToInsert.push({
      id: memberId,
      email,
      firstName: firstName || null,
      lastName: lastName || null,
      age,
      phone: phone || null,
      city: city || null,
      country: country || null,
      status: "imported",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    profilesToInsert.push({
      memberId,
      occupation,
      bio: bio || null,
      linkedinUrl: linkedin || null,
      timeAvailable: null,
      workPreference: null,
    });

    memberPolesToInsert.push({
      memberId,
      poleId: poleBySlug[poleSlug].id,
      isPrimary: true,
      level,
    });

    for (const intSlug of interests) {
      const interest = interestBySlug[intSlug];
      if (interest) {
        memberInterestsToInsert.push({
          memberId,
          interestId: interest.id,
        });
      }
    }

    // Default communication preferences: only community announcements enabled
    commPrefsToInsert.push({
      memberId,
      community: true,
      security: poleSlug === "security",
      ai: poleSlug === "ai",
      cloud: poleSlug === "cloud",
      training: false,
      workshops: interests.includes("workshops"),
      opportunities: interests.includes("opportunities"),
      projects: interests.includes("projects"),
    });

    historyToInsert.push({
      memberId,
      source: "whatsapp_migration",
      oldGroup: oldGroup || null,
      oldActivity: oldActivity || null,
      score,
      languages: languages || null,
      metadata: JSON.stringify({ sourceFile: file }),
      createdAt: new Date(),
    });
  }

  console.log(`\n${"=".repeat(60)}`);
  console.log(`DISTRIBUTION PREVIEW`);
  console.log("=".repeat(60));
  console.log(`Pôles:  security=${poleDist.security}, ai=${poleDist.ai}, cloud=${poleDist.cloud}`);
  console.log(`Niveaux: beginner=${levelDist.beginner}, intermediate=${levelDist.intermediate}, advanced=${levelDist.advanced}`);

  console.log(`\n${"=".repeat(60)}`);
  console.log(`RECORDS TO INSERT`);
  console.log("=".repeat(60));
  console.log(`members:                  ${membersToInsert.length}`);
  console.log(`member_profiles:          ${profilesToInsert.length}`);
  console.log(`member_poles:             ${memberPolesToInsert.length}`);
  console.log(`member_interests:         ${memberInterestsToInsert.length}`);
  console.log(`communication_preferences: ${commPrefsToInsert.length}`);
  console.log(`community_history:        ${historyToInsert.length}`);

  if (membersToInsert.length > 0) {
    console.log(`\nSample (first 3):`);
    for (let i = 0; i < Math.min(3, membersToInsert.length); i++) {
      const m = membersToInsert[i];
      const pole = memberPolesToInsert.find((mp) => mp.memberId === m.id);
      console.log(
        `  ${m.email} | ${m.firstName} ${m.lastName} | ${poleBySlug && pole ? pole.level : ""}`
      );
    }
  }

  if (!execute) {
    console.log(`\n🔍 DRY RUN. To execute, run:`);
    console.log(`   npx tsx import-excel.ts --execute`);
    return;
  }

  console.log(`\n🚀 Executing import...`);

  // Insert in FK-safe order
  console.log(`   Inserting members...`);
  await db.insert(schema.members).values(membersToInsert);

  console.log(`   Inserting member_profiles...`);
  await db.insert(schema.memberProfiles).values(profilesToInsert);

  console.log(`   Inserting member_poles...`);
  await db.insert(schema.memberPoles).values(memberPolesToInsert);

  console.log(`   Inserting member_interests...`);
  if (memberInterestsToInsert.length > 0) {
    await db.insert(schema.memberInterests).values(memberInterestsToInsert);
  }

  console.log(`   Inserting communication_preferences...`);
  await db.insert(schema.communicationPreferences).values(commPrefsToInsert);

  console.log(`   Inserting community_history...`);
  await db.insert(schema.communityHistory).values(historyToInsert);

  console.log(`\n🎉 Import completed successfully!`);
  console.log(`   ${membersToInsert.length} members imported with full profile data.`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Import failed:", err);
    process.exit(1);
  });
