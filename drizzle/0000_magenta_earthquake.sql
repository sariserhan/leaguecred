CREATE TYPE "public"."fixture_status" AS ENUM('scheduled', 'live', 'finished', 'postponed', 'cancelled', 'abandoned', 'suspended', 'unknown');--> statement-breakpoint
CREATE TYPE "public"."matchweek_status" AS ENUM('upcoming', 'locked', 'settling', 'settled');--> statement-breakpoint
CREATE TYPE "public"."participation_mode" AS ENUM('independent', 'follow');--> statement-breakpoint
CREATE TYPE "public"."pick_result" AS ENUM('pending', 'win', 'loss', 'void');--> statement-breakpoint
CREATE TYPE "public"."settlement_event_type" AS ENUM('initial_settlement', 'reversal', 'correction');--> statement-breakpoint
CREATE TYPE "public"."sync_status" AS ENUM('running', 'succeeded', 'failed');--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"password" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "api_sync_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider" text NOT NULL,
	"kind" text NOT NULL,
	"status" "sync_status" DEFAULT 'running' NOT NULL,
	"request_count" integer DEFAULT 0 NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone,
	"error" text
);
--> statement-breakpoint
CREATE TABLE "countries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"code" text NOT NULL,
	"flag_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "countries_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "fixtures" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider" text NOT NULL,
	"provider_external_id" text NOT NULL,
	"league_id" uuid NOT NULL,
	"season_id" uuid NOT NULL,
	"matchweek_id" uuid NOT NULL,
	"home_team_id" uuid NOT NULL,
	"away_team_id" uuid NOT NULL,
	"kickoff_at" timestamp with time zone NOT NULL,
	"status" "fixture_status" DEFAULT 'scheduled' NOT NULL,
	"home_score" integer,
	"away_score" integer,
	"winner_team_id" uuid,
	"last_synced_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "fixtures_distinct_teams_check" CHECK ("fixtures"."home_team_id" <> "fixtures"."away_team_id")
);
--> statement-breakpoint
CREATE TABLE "followed_picks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"follower_user_id" text NOT NULL,
	"source_pick_id" uuid NOT NULL,
	"league_id" uuid NOT NULL,
	"season_id" uuid NOT NULL,
	"matchweek_id" uuid NOT NULL,
	"result" "pick_result" DEFAULT 'pending' NOT NULL,
	"followed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"settled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "league_follows" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"follower_user_id" text NOT NULL,
	"specialist_user_id" text NOT NULL,
	"league_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "league_follows_not_self_check" CHECK ("league_follows"."follower_user_id" <> "league_follows"."specialist_user_id")
);
--> statement-breakpoint
CREATE TABLE "leagues" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider" text NOT NULL,
	"provider_external_id" text NOT NULL,
	"country_id" uuid NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"short_name" text NOT NULL,
	"region" text NOT NULL,
	"logo_url" text,
	"enabled" boolean DEFAULT true NOT NULL,
	"priority" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "leagues_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "matchweek_participation" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"league_id" uuid NOT NULL,
	"matchweek_id" uuid NOT NULL,
	"mode" "participation_mode" NOT NULL,
	"expert_picks_revealed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "matchweeks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"league_id" uuid NOT NULL,
	"season_id" uuid NOT NULL,
	"provider_round_name" text NOT NULL,
	"display_name" text NOT NULL,
	"start_at" timestamp with time zone NOT NULL,
	"lock_at" timestamp with time zone NOT NULL,
	"end_at" timestamp with time zone NOT NULL,
	"status" "matchweek_status" DEFAULT 'upcoming' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "picks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"league_id" uuid NOT NULL,
	"season_id" uuid NOT NULL,
	"matchweek_id" uuid NOT NULL,
	"fixture_id" uuid NOT NULL,
	"selected_team_id" uuid NOT NULL,
	"result" "pick_result" DEFAULT 'pending' NOT NULL,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"locked_at" timestamp with time zone DEFAULT now() NOT NULL,
	"settled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "seasons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"league_id" uuid NOT NULL,
	"provider_season" text NOT NULL,
	"name" text NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"is_current" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"token" text NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "settlement_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"league_id" uuid NOT NULL,
	"season_id" uuid NOT NULL,
	"pick_id" uuid NOT NULL,
	"event_type" "settlement_event_type" NOT NULL,
	"result" "pick_result" NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"supersedes_event_id" uuid,
	"reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "settlement_events_not_pending_check" CHECK ("settlement_events"."result" <> 'pending')
);
--> statement-breakpoint
CREATE TABLE "teams" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider" text NOT NULL,
	"provider_external_id" text NOT NULL,
	"name" text NOT NULL,
	"short_name" text NOT NULL,
	"logo_url" text,
	"country_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"username" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "user_league_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"league_id" uuid NOT NULL,
	"wins" integer DEFAULT 0 NOT NULL,
	"losses" integer DEFAULT 0 NOT NULL,
	"voids" integer DEFAULT 0 NOT NULL,
	"settled_picks" integer DEFAULT 0 NOT NULL,
	"current_win_streak" integer DEFAULT 0 NOT NULL,
	"best_win_streak" integer DEFAULT 0 NOT NULL,
	"tier" text DEFAULT 'Provisional' NOT NULL,
	"confidence_adjusted_accuracy" numeric(7, 6),
	"last_settled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_league_season_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"league_id" uuid NOT NULL,
	"season_id" uuid NOT NULL,
	"wins" integer DEFAULT 0 NOT NULL,
	"losses" integer DEFAULT 0 NOT NULL,
	"voids" integer DEFAULT 0 NOT NULL,
	"settled_picks" integer DEFAULT 0 NOT NULL,
	"current_win_streak" integer DEFAULT 0 NOT NULL,
	"best_win_streak" integer DEFAULT 0 NOT NULL,
	"tier" text DEFAULT 'Provisional' NOT NULL,
	"confidence_adjusted_accuracy" numeric(7, 6),
	"last_settled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fixtures" ADD CONSTRAINT "fixtures_league_id_leagues_id_fk" FOREIGN KEY ("league_id") REFERENCES "public"."leagues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fixtures" ADD CONSTRAINT "fixtures_season_id_seasons_id_fk" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fixtures" ADD CONSTRAINT "fixtures_matchweek_id_matchweeks_id_fk" FOREIGN KEY ("matchweek_id") REFERENCES "public"."matchweeks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fixtures" ADD CONSTRAINT "fixtures_home_team_id_teams_id_fk" FOREIGN KEY ("home_team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fixtures" ADD CONSTRAINT "fixtures_away_team_id_teams_id_fk" FOREIGN KEY ("away_team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fixtures" ADD CONSTRAINT "fixtures_winner_team_id_teams_id_fk" FOREIGN KEY ("winner_team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "followed_picks" ADD CONSTRAINT "followed_picks_follower_user_id_user_id_fk" FOREIGN KEY ("follower_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "followed_picks" ADD CONSTRAINT "followed_picks_source_pick_id_picks_id_fk" FOREIGN KEY ("source_pick_id") REFERENCES "public"."picks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "followed_picks" ADD CONSTRAINT "followed_picks_league_id_leagues_id_fk" FOREIGN KEY ("league_id") REFERENCES "public"."leagues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "followed_picks" ADD CONSTRAINT "followed_picks_season_id_seasons_id_fk" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "followed_picks" ADD CONSTRAINT "followed_picks_matchweek_id_matchweeks_id_fk" FOREIGN KEY ("matchweek_id") REFERENCES "public"."matchweeks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "league_follows" ADD CONSTRAINT "league_follows_follower_user_id_user_id_fk" FOREIGN KEY ("follower_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "league_follows" ADD CONSTRAINT "league_follows_specialist_user_id_user_id_fk" FOREIGN KEY ("specialist_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "league_follows" ADD CONSTRAINT "league_follows_league_id_leagues_id_fk" FOREIGN KEY ("league_id") REFERENCES "public"."leagues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leagues" ADD CONSTRAINT "leagues_country_id_countries_id_fk" FOREIGN KEY ("country_id") REFERENCES "public"."countries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matchweek_participation" ADD CONSTRAINT "matchweek_participation_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matchweek_participation" ADD CONSTRAINT "matchweek_participation_league_id_leagues_id_fk" FOREIGN KEY ("league_id") REFERENCES "public"."leagues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matchweek_participation" ADD CONSTRAINT "matchweek_participation_matchweek_id_matchweeks_id_fk" FOREIGN KEY ("matchweek_id") REFERENCES "public"."matchweeks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matchweeks" ADD CONSTRAINT "matchweeks_league_id_leagues_id_fk" FOREIGN KEY ("league_id") REFERENCES "public"."leagues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matchweeks" ADD CONSTRAINT "matchweeks_season_id_seasons_id_fk" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "picks" ADD CONSTRAINT "picks_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "picks" ADD CONSTRAINT "picks_league_id_leagues_id_fk" FOREIGN KEY ("league_id") REFERENCES "public"."leagues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "picks" ADD CONSTRAINT "picks_season_id_seasons_id_fk" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "picks" ADD CONSTRAINT "picks_matchweek_id_matchweeks_id_fk" FOREIGN KEY ("matchweek_id") REFERENCES "public"."matchweeks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "picks" ADD CONSTRAINT "picks_fixture_id_fixtures_id_fk" FOREIGN KEY ("fixture_id") REFERENCES "public"."fixtures"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "picks" ADD CONSTRAINT "picks_selected_team_id_teams_id_fk" FOREIGN KEY ("selected_team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seasons" ADD CONSTRAINT "seasons_league_id_leagues_id_fk" FOREIGN KEY ("league_id") REFERENCES "public"."leagues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settlement_events" ADD CONSTRAINT "settlement_events_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settlement_events" ADD CONSTRAINT "settlement_events_league_id_leagues_id_fk" FOREIGN KEY ("league_id") REFERENCES "public"."leagues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settlement_events" ADD CONSTRAINT "settlement_events_season_id_seasons_id_fk" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settlement_events" ADD CONSTRAINT "settlement_events_pick_id_picks_id_fk" FOREIGN KEY ("pick_id") REFERENCES "public"."picks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settlement_events" ADD CONSTRAINT "settlement_events_supersedes_event_id_settlement_events_id_fk" FOREIGN KEY ("supersedes_event_id") REFERENCES "public"."settlement_events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teams" ADD CONSTRAINT "teams_country_id_countries_id_fk" FOREIGN KEY ("country_id") REFERENCES "public"."countries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_league_records" ADD CONSTRAINT "user_league_records_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_league_records" ADD CONSTRAINT "user_league_records_league_id_leagues_id_fk" FOREIGN KEY ("league_id") REFERENCES "public"."leagues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_league_season_records" ADD CONSTRAINT "user_league_season_records_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_league_season_records" ADD CONSTRAINT "user_league_season_records_league_id_leagues_id_fk" FOREIGN KEY ("league_id") REFERENCES "public"."leagues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_league_season_records" ADD CONSTRAINT "user_league_season_records_season_id_seasons_id_fk" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_user_id_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "account_provider_account_unique" ON "account" USING btree ("provider_id","account_id");--> statement-breakpoint
CREATE INDEX "api_sync_runs_provider_started_idx" ON "api_sync_runs" USING btree ("provider","started_at");--> statement-breakpoint
CREATE UNIQUE INDEX "fixtures_provider_external_unique" ON "fixtures" USING btree ("provider","provider_external_id");--> statement-breakpoint
CREATE INDEX "fixtures_matchweek_kickoff_idx" ON "fixtures" USING btree ("matchweek_id","kickoff_at");--> statement-breakpoint
CREATE INDEX "fixtures_league_status_kickoff_idx" ON "fixtures" USING btree ("league_id","status","kickoff_at");--> statement-breakpoint
CREATE INDEX "fixtures_season_id_idx" ON "fixtures" USING btree ("season_id");--> statement-breakpoint
CREATE INDEX "fixtures_home_team_id_idx" ON "fixtures" USING btree ("home_team_id");--> statement-breakpoint
CREATE INDEX "fixtures_away_team_id_idx" ON "fixtures" USING btree ("away_team_id");--> statement-breakpoint
CREATE INDEX "fixtures_winner_team_id_idx" ON "fixtures" USING btree ("winner_team_id");--> statement-breakpoint
CREATE UNIQUE INDEX "followed_picks_follower_league_matchweek_unique" ON "followed_picks" USING btree ("follower_user_id","league_id","matchweek_id");--> statement-breakpoint
CREATE INDEX "followed_picks_source_pick_id_idx" ON "followed_picks" USING btree ("source_pick_id");--> statement-breakpoint
CREATE INDEX "followed_picks_matchweek_result_idx" ON "followed_picks" USING btree ("matchweek_id","result");--> statement-breakpoint
CREATE INDEX "followed_picks_season_id_idx" ON "followed_picks" USING btree ("season_id");--> statement-breakpoint
CREATE UNIQUE INDEX "league_follows_follower_specialist_league_unique" ON "league_follows" USING btree ("follower_user_id","specialist_user_id","league_id");--> statement-breakpoint
CREATE INDEX "league_follows_specialist_league_idx" ON "league_follows" USING btree ("specialist_user_id","league_id");--> statement-breakpoint
CREATE INDEX "league_follows_league_id_idx" ON "league_follows" USING btree ("league_id");--> statement-breakpoint
CREATE UNIQUE INDEX "leagues_provider_external_unique" ON "leagues" USING btree ("provider","provider_external_id");--> statement-breakpoint
CREATE INDEX "leagues_country_id_idx" ON "leagues" USING btree ("country_id");--> statement-breakpoint
CREATE INDEX "leagues_enabled_priority_idx" ON "leagues" USING btree ("enabled","priority");--> statement-breakpoint
CREATE UNIQUE INDEX "participation_user_league_matchweek_unique" ON "matchweek_participation" USING btree ("user_id","league_id","matchweek_id");--> statement-breakpoint
CREATE INDEX "participation_matchweek_mode_idx" ON "matchweek_participation" USING btree ("matchweek_id","mode");--> statement-breakpoint
CREATE INDEX "participation_league_id_idx" ON "matchweek_participation" USING btree ("league_id");--> statement-breakpoint
CREATE UNIQUE INDEX "matchweeks_league_round_unique" ON "matchweeks" USING btree ("league_id","provider_round_name");--> statement-breakpoint
CREATE INDEX "matchweeks_league_status_lock_idx" ON "matchweeks" USING btree ("league_id","status","lock_at");--> statement-breakpoint
CREATE INDEX "matchweeks_season_id_idx" ON "matchweeks" USING btree ("season_id");--> statement-breakpoint
CREATE UNIQUE INDEX "picks_user_league_matchweek_unique" ON "picks" USING btree ("user_id","league_id","matchweek_id");--> statement-breakpoint
CREATE INDEX "picks_matchweek_result_idx" ON "picks" USING btree ("matchweek_id","result");--> statement-breakpoint
CREATE INDEX "picks_fixture_result_idx" ON "picks" USING btree ("fixture_id","result");--> statement-breakpoint
CREATE INDEX "picks_selected_team_id_idx" ON "picks" USING btree ("selected_team_id");--> statement-breakpoint
CREATE INDEX "picks_season_id_idx" ON "picks" USING btree ("season_id");--> statement-breakpoint
CREATE UNIQUE INDEX "seasons_league_provider_unique" ON "seasons" USING btree ("league_id","provider_season");--> statement-breakpoint
CREATE INDEX "seasons_league_id_idx" ON "seasons" USING btree ("league_id");--> statement-breakpoint
CREATE INDEX "session_user_id_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "settlement_events_one_active_per_pick_unique" ON "settlement_events" USING btree ("pick_id") WHERE "settlement_events"."is_active" = true;--> statement-breakpoint
CREATE INDEX "settlement_events_pick_created_idx" ON "settlement_events" USING btree ("pick_id","created_at");--> statement-breakpoint
CREATE INDEX "settlement_events_user_league_idx" ON "settlement_events" USING btree ("user_id","league_id");--> statement-breakpoint
CREATE INDEX "settlement_events_season_id_idx" ON "settlement_events" USING btree ("season_id");--> statement-breakpoint
CREATE INDEX "settlement_events_supersedes_id_idx" ON "settlement_events" USING btree ("supersedes_event_id");--> statement-breakpoint
CREATE UNIQUE INDEX "teams_provider_external_unique" ON "teams" USING btree ("provider","provider_external_id");--> statement-breakpoint
CREATE INDEX "teams_country_id_idx" ON "teams" USING btree ("country_id");--> statement-breakpoint
CREATE UNIQUE INDEX "user_username_unique" ON "user" USING btree (lower("username")) WHERE "user"."username" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "user_league_records_user_league_unique" ON "user_league_records" USING btree ("user_id","league_id");--> statement-breakpoint
CREATE INDEX "user_league_records_leaderboard_idx" ON "user_league_records" USING btree ("league_id","confidence_adjusted_accuracy","settled_picks");--> statement-breakpoint
CREATE UNIQUE INDEX "user_league_season_records_unique" ON "user_league_season_records" USING btree ("user_id","league_id","season_id");--> statement-breakpoint
CREATE INDEX "user_league_season_records_leaderboard_idx" ON "user_league_season_records" USING btree ("league_id","season_id","confidence_adjusted_accuracy");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");