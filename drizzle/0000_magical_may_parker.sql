CREATE TYPE "public"."level" AS ENUM('beginner', 'intermediate', 'advanced', 'expert');--> statement-breakpoint
CREATE TYPE "public"."member_status" AS ENUM('imported', 'claimed', 'verified', 'updated', 'active', 'inactive');--> statement-breakpoint
CREATE TYPE "public"."occupation" AS ENUM('student', 'professional', 'entrepreneur', 'freelancer', 'seeking_opportunities', 'other');--> statement-breakpoint
CREATE TABLE "auth_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"token" varchar(255) NOT NULL,
	"member_id" uuid NOT NULL,
	"type" varchar(20) NOT NULL,
	"used" boolean DEFAULT false NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "auth_tokens_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "communication_preferences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"member_id" uuid NOT NULL,
	"community" boolean DEFAULT true NOT NULL,
	"security" boolean DEFAULT false NOT NULL,
	"ai" boolean DEFAULT false NOT NULL,
	"cloud" boolean DEFAULT false NOT NULL,
	"training" boolean DEFAULT false NOT NULL,
	"workshops" boolean DEFAULT false NOT NULL,
	"opportunities" boolean DEFAULT false NOT NULL,
	"projects" boolean DEFAULT false NOT NULL,
	CONSTRAINT "communication_preferences_member_id_unique" UNIQUE("member_id")
);
--> statement-breakpoint
CREATE TABLE "community_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"member_id" uuid NOT NULL,
	"source" varchar(100),
	"old_group" varchar(200),
	"old_activity" text,
	"score" integer,
	"languages" text,
	"metadata" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "interests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(50) NOT NULL,
	"name" varchar(100) NOT NULL,
	CONSTRAINT "interests_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "member_interests" (
	"member_id" uuid NOT NULL,
	"interest_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "member_poles" (
	"member_id" uuid NOT NULL,
	"pole_id" uuid NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"level" "level" DEFAULT 'beginner' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "member_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"member_id" uuid NOT NULL,
	"occupation" "occupation",
	"bio" text,
	"linkedin_url" varchar(500),
	"time_available" integer,
	"work_preference" varchar(20),
	CONSTRAINT "member_profiles_member_id_unique" UNIQUE("member_id")
);
--> statement-breakpoint
CREATE TABLE "members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"first_name" varchar(100),
	"last_name" varchar(100),
	"age" integer,
	"phone" varchar(30),
	"city" varchar(100),
	"country" varchar(100),
	"status" "member_status" DEFAULT 'imported' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "members_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "poles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(50) NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	CONSTRAINT "poles_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "auth_tokens" ADD CONSTRAINT "auth_tokens_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "communication_preferences" ADD CONSTRAINT "communication_preferences_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_history" ADD CONSTRAINT "community_history_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_interests" ADD CONSTRAINT "member_interests_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_interests" ADD CONSTRAINT "member_interests_interest_id_interests_id_fk" FOREIGN KEY ("interest_id") REFERENCES "public"."interests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_poles" ADD CONSTRAINT "member_poles_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_poles" ADD CONSTRAINT "member_poles_pole_id_poles_id_fk" FOREIGN KEY ("pole_id") REFERENCES "public"."poles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_profiles" ADD CONSTRAINT "member_profiles_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "auth_tokens_member_idx" ON "auth_tokens" USING btree ("member_id");--> statement-breakpoint
CREATE INDEX "auth_tokens_type_idx" ON "auth_tokens" USING btree ("type");--> statement-breakpoint
CREATE INDEX "auth_tokens_expires_idx" ON "auth_tokens" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "community_history_member_idx" ON "community_history" USING btree ("member_id");--> statement-breakpoint
CREATE INDEX "member_interests_member_idx" ON "member_interests" USING btree ("member_id");--> statement-breakpoint
CREATE INDEX "member_interests_interest_idx" ON "member_interests" USING btree ("interest_id");--> statement-breakpoint
CREATE INDEX "member_poles_member_idx" ON "member_poles" USING btree ("member_id");--> statement-breakpoint
CREATE INDEX "member_poles_pole_idx" ON "member_poles" USING btree ("pole_id");--> statement-breakpoint
CREATE INDEX "members_status_idx" ON "members" USING btree ("status");--> statement-breakpoint
CREATE INDEX "members_age_idx" ON "members" USING btree ("age");--> statement-breakpoint
CREATE INDEX "members_city_idx" ON "members" USING btree ("city");--> statement-breakpoint
CREATE INDEX "members_country_idx" ON "members" USING btree ("country");