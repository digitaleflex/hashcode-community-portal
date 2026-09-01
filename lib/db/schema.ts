import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
  index,
  uniqueIndex,
  pgEnum,
  integer,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ── ENUMS ──────────────────────────────────────────────

export const memberStatusEnum = pgEnum("member_status", [
  "imported",
  "claimed",
  "verified",
  "updated",
  "active",
  "inactive",
]);

export const levelEnum = pgEnum("level", ["beginner", "intermediate", "advanced"]);

export const occupationEnum = pgEnum("occupation", [
  "student",
  "professional",
  "entrepreneur",
  "freelancer",
  "seeking_opportunities",
  "other",
]);

// ── MEMBERS ────────────────────────────────────────────

export const members = pgTable(
  "members",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: varchar("email", { length: 255 }).notNull().unique(),
    firstName: varchar("first_name", { length: 100 }),
    lastName: varchar("last_name", { length: 100 }),
    age: integer("age"),
    phone: varchar("phone", { length: 30 }),
    city: varchar("city", { length: 100 }),
    country: varchar("country", { length: 100 }),
    status: memberStatusEnum("status").notNull().default("imported"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("members_status_idx").on(table.status),
    index("members_age_idx").on(table.age),
    index("members_city_idx").on(table.city),
    index("members_country_idx").on(table.country),
  ]
);

export const membersRelations = relations(members, ({ one, many }) => ({
  profile: one(memberProfiles, {
    fields: [members.id],
    references: [memberProfiles.memberId],
  }),
  poles: many(memberPoles),
  interests: many(memberInterests),
  communicationPrefs: one(communicationPreferences, {
    fields: [members.id],
    references: [communicationPreferences.memberId],
  }),
  history: many(communityHistory),
  authTokens: many(authTokens),
}));

// ── MEMBER PROFILES ────────────────────────────────────

export const memberProfiles = pgTable("member_profiles", {
  id: uuid("id").primaryKey().defaultRandom(),
  memberId: uuid("member_id")
    .notNull()
    .unique()
    .references(() => members.id, { onDelete: "cascade" }),
  occupation: occupationEnum("occupation"),
  bio: text("bio"),
  linkedinUrl: varchar("linkedin_url", { length: 500 }),
  timeAvailable: integer("time_available"),
  workPreference: varchar("work_preference", { length: 20 }),
});

export const memberProfilesRelations = relations(memberProfiles, ({ one }) => ({
  member: one(members, {
    fields: [memberProfiles.memberId],
    references: [members.id],
  }),
}));

// ── POLES ──────────────────────────────────────────────

export const poles = pgTable("poles", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: varchar("slug", { length: 50 }).notNull().unique(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
});

export const polesRelations = relations(poles, ({ many }) => ({
  members: many(memberPoles),
}));

// ── MEMBER ↔ POLES (junction) ─────────────────────────

export const memberPoles = pgTable(
  "member_poles",
  {
    memberId: uuid("member_id")
      .notNull()
      .references(() => members.id, { onDelete: "cascade" }),
    poleId: uuid("pole_id")
      .notNull()
      .references(() => poles.id, { onDelete: "cascade" }),
    isPrimary: boolean("is_primary").notNull().default(false),
    level: levelEnum("level").notNull().default("beginner"),
  },
  (table) => [
    index("member_poles_member_idx").on(table.memberId),
    index("member_poles_pole_idx").on(table.poleId),
  ]
);

export const memberPolesRelations = relations(memberPoles, ({ one }) => ({
  member: one(members, {
    fields: [memberPoles.memberId],
    references: [members.id],
  }),
  pole: one(poles, {
    fields: [memberPoles.poleId],
    references: [poles.id],
  }),
}));

// ── INTERESTS ──────────────────────────────────────────

export const interests = pgTable("interests", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: varchar("slug", { length: 50 }).notNull().unique(),
  name: varchar("name", { length: 100 }).notNull(),
});

export const interestsRelations = relations(interests, ({ many }) => ({
  members: many(memberInterests),
}));

// ── MEMBER ↔ INTERESTS (junction) ─────────────────────

export const memberInterests = pgTable(
  "member_interests",
  {
    memberId: uuid("member_id")
      .notNull()
      .references(() => members.id, { onDelete: "cascade" }),
    interestId: uuid("interest_id")
      .notNull()
      .references(() => interests.id, { onDelete: "cascade" }),
  },
  (table) => [
    index("member_interests_member_idx").on(table.memberId),
    index("member_interests_interest_idx").on(table.interestId),
  ]
);

export const memberInterestsRelations = relations(memberInterests, ({ one }) => ({
  member: one(members, {
    fields: [memberInterests.memberId],
    references: [members.id],
  }),
  interest: one(interests, {
    fields: [memberInterests.interestId],
    references: [interests.id],
  }),
}));

// ── COMMUNICATION PREFERENCES ─────────────────────────

export const communicationPreferences = pgTable("communication_preferences", {
  id: uuid("id").primaryKey().defaultRandom(),
  memberId: uuid("member_id")
    .notNull()
    .unique()
    .references(() => members.id, { onDelete: "cascade" }),
  community: boolean("community").notNull().default(true),
  security: boolean("security").notNull().default(false),
  ai: boolean("ai").notNull().default(false),
  cloud: boolean("cloud").notNull().default(false),
  training: boolean("training").notNull().default(false),
  workshops: boolean("workshops").notNull().default(false),
  opportunities: boolean("opportunities").notNull().default(false),
  projects: boolean("projects").notNull().default(false),
});

export const communicationPreferencesRelations = relations(
  communicationPreferences,
  ({ one }) => ({
    member: one(members, {
      fields: [communicationPreferences.memberId],
      references: [members.id],
    }),
  })
);

// ── COMMUNITY HISTORY ─────────────────────────────────

export const communityHistory = pgTable(
  "community_history",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    memberId: uuid("member_id")
      .notNull()
      .references(() => members.id, { onDelete: "cascade" }),
    source: varchar("source", { length: 100 }),
    oldGroup: varchar("old_group", { length: 200 }),
    oldActivity: text("old_activity"),
    score: integer("score"),
    languages: text("languages"),
    metadata: text("metadata"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("community_history_member_idx").on(table.memberId),
  ]
);

// ── AUTH TOKENS ──────────────────────────────────────────

export const authTokens = pgTable(
  "auth_tokens",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    token: varchar("token", { length: 255 }).notNull().unique(),
    memberId: uuid("member_id")
      .notNull()
      .references(() => members.id, { onDelete: "cascade" }),
    type: varchar("type", { length: 20 }).notNull(), // otp | magic_link
    used: boolean("used").notNull().default(false),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("auth_tokens_member_idx").on(table.memberId),
    index("auth_tokens_type_idx").on(table.type),
    index("auth_tokens_expires_idx").on(table.expiresAt),
  ]
);

export const authTokensRelations = relations(authTokens, ({ one }) => ({
  member: one(members, {
    fields: [authTokens.memberId],
    references: [members.id],
  }),
}));
