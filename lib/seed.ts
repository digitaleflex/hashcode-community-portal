import { config } from "dotenv";
config({ path: ".env.local" });
import { db } from "./db";
import { poles, interests } from "./db/schema";

async function seed() {
  console.log("Seeding poles...");

  await db
    .insert(poles)
    .values([
      {
        slug: "security",
        name: "HASHCODE Security",
        description: "Cybersécurité, pentesting, SOC, forensics, threat intelligence",
      },
      {
        slug: "ai",
        name: "HASHCODE AI",
        description: "Intelligence artificielle, machine learning, deep learning, NLP",
      },
      {
        slug: "cloud",
        name: "HASHCODE Cloud",
        description: "Cloud computing, DevOps, architecture, infrastructure",
      },
    ])
    .onConflictDoNothing();

  console.log("Seeding interests...");

  await db
    .insert(interests)
    .values([
      { slug: "learn", name: "Apprendre" },
      { slug: "workshops", name: "Participer à des workshops" },
      { slug: "projects", name: "Travailler sur des projets" },
      { slug: "opportunities", name: "Trouver des opportunités" },
      { slug: "networking", name: "Développer mon réseau" },
      { slug: "mentor", name: "Devenir mentor" },
      { slug: "mentee", name: "Trouver un mentor" },
      { slug: "entrepreneurship", name: "Entreprendre" },
    ])
    .onConflictDoNothing();

  console.log("Seed complete.");
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
