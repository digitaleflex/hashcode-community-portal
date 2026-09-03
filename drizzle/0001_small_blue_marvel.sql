CREATE TYPE "public"."gender" AS ENUM('male', 'female', 'other', 'prefer_not_to_say');--> statement-breakpoint
CREATE TABLE "member_points" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"member_id" uuid NOT NULL,
	"points" integer DEFAULT 0 NOT NULL,
	"level" varchar(50) DEFAULT 'Novice' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "member_points_member_id_unique" UNIQUE("member_id")
);
--> statement-breakpoint
CREATE TABLE "member_verifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"member_id" uuid NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"linkedin_verified" boolean DEFAULT false NOT NULL,
	"identity_verified" boolean DEFAULT false NOT NULL,
	"contributor" boolean DEFAULT false NOT NULL,
	"verified_by" uuid,
	"verified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "member_verifications_member_id_unique" UNIQUE("member_id")
);
--> statement-breakpoint
CREATE TABLE "point_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"member_id" uuid NOT NULL,
	"delta" integer NOT NULL,
	"reason" text NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "members" ADD COLUMN "gender" "gender";--> statement-breakpoint
ALTER TABLE "member_points" ADD CONSTRAINT "member_points_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_verifications" ADD CONSTRAINT "member_verifications_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "point_events" ADD CONSTRAINT "point_events_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "member_points_member_idx" ON "member_points" USING btree ("member_id");--> statement-breakpoint
CREATE INDEX "member_points_points_idx" ON "member_points" USING btree ("points");--> statement-breakpoint
CREATE INDEX "member_verifications_member_idx" ON "member_verifications" USING btree ("member_id");--> statement-breakpoint
CREATE UNIQUE INDEX "member_verifications_member_id_unique" ON "member_verifications" USING btree ("member_id");--> statement-breakpoint
CREATE INDEX "point_events_member_idx" ON "point_events" USING btree ("member_id");--> statement-breakpoint
CREATE INDEX "point_events_created_at_idx" ON "point_events" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "members_gender_idx" ON "members" USING btree ("gender");