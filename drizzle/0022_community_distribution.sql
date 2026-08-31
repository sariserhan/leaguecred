CREATE TYPE "public"."community_role" AS ENUM('member', 'founding_member', 'captain');

ALTER TABLE "user" ADD COLUMN "primary_team_id" uuid;
ALTER TABLE "user" ADD COLUMN "home_region" text;
ALTER TABLE "user" ADD COLUMN "community_role" "community_role" DEFAULT 'member' NOT NULL;
ALTER TABLE "user" ADD COLUMN "referral_code" text;
ALTER TABLE "user" ADD COLUMN "referred_by_user_id" text;
ALTER TABLE "user" ADD COLUMN "acquisition_source" text DEFAULT 'direct' NOT NULL;

ALTER TABLE "user" ADD CONSTRAINT "user_primary_team_id_teams_id_fk" FOREIGN KEY ("primary_team_id") REFERENCES "public"."teams"("id") ON DELETE set null;
ALTER TABLE "user" ADD CONSTRAINT "user_referred_by_user_id_user_id_fk" FOREIGN KEY ("referred_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null;

CREATE UNIQUE INDEX "user_referral_code_unique" ON "user" USING btree (lower("referral_code")) WHERE "referral_code" IS NOT NULL;
CREATE INDEX "user_primary_team_id_idx" ON "user" USING btree ("primary_team_id");
CREATE INDEX "user_referred_by_user_id_idx" ON "user" USING btree ("referred_by_user_id");

CREATE TABLE "referrals" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "inviter_user_id" text NOT NULL,
  "invited_user_id" text NOT NULL,
  "code" text NOT NULL,
  "source" text DEFAULT 'member_invite' NOT NULL,
  "activated_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "referrals" ADD CONSTRAINT "referrals_inviter_user_id_user_id_fk" FOREIGN KEY ("inviter_user_id") REFERENCES "public"."user"("id") ON DELETE cascade;
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_invited_user_id_user_id_fk" FOREIGN KEY ("invited_user_id") REFERENCES "public"."user"("id") ON DELETE cascade;
CREATE UNIQUE INDEX "referrals_invited_user_unique" ON "referrals" USING btree ("invited_user_id");
CREATE INDEX "referrals_inviter_created_idx" ON "referrals" USING btree ("inviter_user_id", "created_at");
CREATE INDEX "referrals_activated_at_idx" ON "referrals" USING btree ("activated_at");
