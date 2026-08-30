import { sql } from "drizzle-orm";
import {
  AnyPgColumn,
  boolean,
  check,
  date,
  index,
  integer,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

const createdAt = timestamp("created_at", { withTimezone: true }).defaultNow().notNull();
const updatedAt = timestamp("updated_at", { withTimezone: true })
  .defaultNow()
  .$onUpdate(() => new Date())
  .notNull();

export const fixtureStatusEnum = pgEnum("fixture_status", [
  "scheduled", "live", "finished", "postponed", "cancelled", "abandoned", "suspended", "unknown",
]);
export const matchweekStatusEnum = pgEnum("matchweek_status", [
  "upcoming", "locked", "settling", "settled",
]);
export const participationModeEnum = pgEnum("participation_mode", ["independent", "follow"]);
export const pickResultEnum = pgEnum("pick_result", ["pending", "win", "loss", "void"]);
export const settlementEventTypeEnum = pgEnum("settlement_event_type", [
  "initial_settlement", "reversal", "correction",
]);
export const syncStatusEnum = pgEnum("sync_status", ["running", "succeeded", "failed"]);

// Better Auth core tables. Property names intentionally match its Drizzle adapter.
export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  username: text("username"),
  createdAt,
  updatedAt,
}, (table) => [
  uniqueIndex("user_username_unique").on(sql`lower(${table.username})`).where(sql`${table.username} is not null`),
]);

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  token: text("token").notNull().unique(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  createdAt,
  updatedAt,
}, (table) => [index("session_user_id_idx").on(table.userId)]);

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  issuer: text("issuer").notNull(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
  scope: text("scope"),
  password: text("password"),
  createdAt,
  updatedAt,
}, (table) => [
  index("account_user_id_idx").on(table.userId),
  uniqueIndex("account_issuer_account_unique").on(table.issuer, table.accountId),
]);

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt,
  updatedAt,
}, (table) => [index("verification_identifier_idx").on(table.identifier)]);

export const countries = pgTable("countries", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  code: text("code").notNull().unique(),
  flagUrl: text("flag_url"),
  createdAt,
});

export const leagues = pgTable("leagues", {
  id: uuid("id").defaultRandom().primaryKey(),
  provider: text("provider").notNull(),
  providerExternalId: text("provider_external_id").notNull(),
  countryId: uuid("country_id").notNull().references(() => countries.id),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  shortName: text("short_name").notNull(),
  region: text("region").notNull(),
  logoUrl: text("logo_url"),
  enabled: boolean("enabled").default(true).notNull(),
  priority: integer("priority").default(0).notNull(),
  createdAt,
  updatedAt,
}, (table) => [
  uniqueIndex("leagues_provider_external_unique").on(table.provider, table.providerExternalId),
  index("leagues_country_id_idx").on(table.countryId),
  index("leagues_enabled_priority_idx").on(table.enabled, table.priority),
]);

export const seasons = pgTable("seasons", {
  id: uuid("id").defaultRandom().primaryKey(),
  leagueId: uuid("league_id").notNull().references(() => leagues.id, { onDelete: "cascade" }),
  providerSeason: text("provider_season").notNull(),
  name: text("name").notNull(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  isCurrent: boolean("is_current").default(false).notNull(),
  createdAt,
  updatedAt,
}, (table) => [
  uniqueIndex("seasons_league_provider_unique").on(table.leagueId, table.providerSeason),
  index("seasons_league_id_idx").on(table.leagueId),
]);

export const teams = pgTable("teams", {
  id: uuid("id").defaultRandom().primaryKey(),
  provider: text("provider").notNull(),
  providerExternalId: text("provider_external_id").notNull(),
  name: text("name").notNull(),
  shortName: text("short_name").notNull(),
  logoUrl: text("logo_url"),
  logoProvider: text("logo_provider"),
  sportsDbExternalId: text("sports_db_external_id"),
  countryId: uuid("country_id").references(() => countries.id),
  createdAt,
  updatedAt,
}, (table) => [
  uniqueIndex("teams_provider_external_unique").on(table.provider, table.providerExternalId),
  uniqueIndex("teams_sports_db_external_unique").on(table.sportsDbExternalId)
    .where(sql`${table.sportsDbExternalId} is not null`),
  index("teams_country_id_idx").on(table.countryId),
]);

export const leagueTeamMemberships = pgTable("league_team_memberships", {
  id: uuid("id").defaultRandom().primaryKey(),
  leagueId: uuid("league_id").notNull().references(() => leagues.id, { onDelete: "cascade" }),
  seasonId: uuid("season_id").notNull().references(() => seasons.id, { onDelete: "cascade" }),
  teamId: uuid("team_id").notNull().references(() => teams.id, { onDelete: "cascade" }),
  sourceProvider: text("source_provider").notNull(),
  sourceScope: text("source_scope").notNull(),
  createdAt,
  updatedAt,
}, (table) => [
  uniqueIndex("league_team_memberships_unique").on(table.leagueId, table.seasonId, table.teamId),
  index("league_team_memberships_league_season_idx").on(table.leagueId, table.seasonId),
  index("league_team_memberships_team_id_idx").on(table.teamId),
  index("league_team_memberships_season_id_idx").on(table.seasonId),
]);

export const leagueTeamImports = pgTable("league_team_imports", {
  id: uuid("id").defaultRandom().primaryKey(),
  leagueId: uuid("league_id").notNull().references(() => leagues.id, { onDelete: "cascade" }),
  seasonId: uuid("season_id").notNull().references(() => seasons.id, { onDelete: "cascade" }),
  provider: text("provider").notNull(),
  isComplete: boolean("is_complete").default(false).notNull(),
  teamCount: integer("team_count").default(0).notNull(),
  note: text("note"),
  fetchedAt: timestamp("fetched_at", { withTimezone: true }).defaultNow().notNull(),
  createdAt,
  updatedAt,
}, (table) => [
  uniqueIndex("league_team_imports_unique").on(table.leagueId, table.seasonId, table.provider),
  index("league_team_imports_league_season_idx").on(table.leagueId, table.seasonId),
  index("league_team_imports_season_id_idx").on(table.seasonId),
]);

export const matchweeks = pgTable("matchweeks", {
  id: uuid("id").defaultRandom().primaryKey(),
  leagueId: uuid("league_id").notNull().references(() => leagues.id, { onDelete: "cascade" }),
  seasonId: uuid("season_id").notNull().references(() => seasons.id, { onDelete: "cascade" }),
  providerRoundName: text("provider_round_name").notNull(),
  displayName: text("display_name").notNull(),
  startAt: timestamp("start_at", { withTimezone: true }).notNull(),
  lockAt: timestamp("lock_at", { withTimezone: true }).notNull(),
  endAt: timestamp("end_at", { withTimezone: true }).notNull(),
  status: matchweekStatusEnum("status").default("upcoming").notNull(),
  createdAt,
  updatedAt,
}, (table) => [
  uniqueIndex("matchweeks_league_round_unique").on(table.leagueId, table.providerRoundName),
  index("matchweeks_league_status_lock_idx").on(table.leagueId, table.status, table.lockAt),
  index("matchweeks_season_id_idx").on(table.seasonId),
]);

export const fixtures = pgTable("fixtures", {
  id: uuid("id").defaultRandom().primaryKey(),
  provider: text("provider").notNull(),
  providerExternalId: text("provider_external_id").notNull(),
  leagueId: uuid("league_id").notNull().references(() => leagues.id, { onDelete: "cascade" }),
  seasonId: uuid("season_id").notNull().references(() => seasons.id, { onDelete: "cascade" }),
  matchweekId: uuid("matchweek_id").notNull().references(() => matchweeks.id, { onDelete: "cascade" }),
  homeTeamId: uuid("home_team_id").notNull().references(() => teams.id),
  awayTeamId: uuid("away_team_id").notNull().references(() => teams.id),
  kickoffAt: timestamp("kickoff_at", { withTimezone: true }).notNull(),
  status: fixtureStatusEnum("status").default("scheduled").notNull(),
  homeScore: integer("home_score"),
  awayScore: integer("away_score"),
  winnerTeamId: uuid("winner_team_id").references(() => teams.id),
  lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }).notNull(),
  createdAt,
  updatedAt,
}, (table) => [
  uniqueIndex("fixtures_provider_external_unique").on(table.provider, table.providerExternalId),
  index("fixtures_matchweek_kickoff_idx").on(table.matchweekId, table.kickoffAt),
  index("fixtures_league_status_kickoff_idx").on(table.leagueId, table.status, table.kickoffAt),
  index("fixtures_season_id_idx").on(table.seasonId),
  index("fixtures_home_team_id_idx").on(table.homeTeamId),
  index("fixtures_away_team_id_idx").on(table.awayTeamId),
  index("fixtures_winner_team_id_idx").on(table.winnerTeamId),
  check("fixtures_distinct_teams_check", sql`${table.homeTeamId} <> ${table.awayTeamId}`),
]);

export const matchweekParticipation = pgTable("matchweek_participation", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  leagueId: uuid("league_id").notNull().references(() => leagues.id, { onDelete: "cascade" }),
  matchweekId: uuid("matchweek_id").notNull().references(() => matchweeks.id, { onDelete: "cascade" }),
  mode: participationModeEnum("mode").notNull(),
  expertPicksRevealedAt: timestamp("expert_picks_revealed_at", { withTimezone: true }),
  createdAt,
}, (table) => [
  uniqueIndex("participation_user_league_matchweek_unique").on(table.userId, table.leagueId, table.matchweekId),
  index("participation_matchweek_mode_idx").on(table.matchweekId, table.mode),
  index("participation_league_id_idx").on(table.leagueId),
]);

export const picks = pgTable("picks", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  leagueId: uuid("league_id").notNull().references(() => leagues.id, { onDelete: "cascade" }),
  seasonId: uuid("season_id").notNull().references(() => seasons.id, { onDelete: "cascade" }),
  matchweekId: uuid("matchweek_id").notNull().references(() => matchweeks.id, { onDelete: "cascade" }),
  fixtureId: uuid("fixture_id").notNull().references(() => fixtures.id),
  selectedTeamId: uuid("selected_team_id").notNull().references(() => teams.id),
  result: pickResultEnum("result").default("pending").notNull(),
  submittedAt: timestamp("submitted_at", { withTimezone: true }).defaultNow().notNull(),
  lockedAt: timestamp("locked_at", { withTimezone: true }).defaultNow().notNull(),
  settledAt: timestamp("settled_at", { withTimezone: true }),
  createdAt,
  updatedAt,
}, (table) => [
  uniqueIndex("picks_user_league_matchweek_unique").on(table.userId, table.leagueId, table.matchweekId),
  index("picks_matchweek_result_idx").on(table.matchweekId, table.result),
  index("picks_fixture_result_idx").on(table.fixtureId, table.result),
  index("picks_selected_team_id_idx").on(table.selectedTeamId),
  index("picks_season_id_idx").on(table.seasonId),
]);

export const leagueFollows = pgTable("league_follows", {
  id: uuid("id").defaultRandom().primaryKey(),
  followerUserId: text("follower_user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  specialistUserId: text("specialist_user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  leagueId: uuid("league_id").notNull().references(() => leagues.id, { onDelete: "cascade" }),
  createdAt,
}, (table) => [
  uniqueIndex("league_follows_follower_specialist_league_unique").on(table.followerUserId, table.specialistUserId, table.leagueId),
  index("league_follows_specialist_league_idx").on(table.specialistUserId, table.leagueId),
  index("league_follows_league_id_idx").on(table.leagueId),
  check("league_follows_not_self_check", sql`${table.followerUserId} <> ${table.specialistUserId}`),
]);

export const followedPicks = pgTable("followed_picks", {
  id: uuid("id").defaultRandom().primaryKey(),
  followerUserId: text("follower_user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  sourcePickId: uuid("source_pick_id").notNull().references(() => picks.id),
  leagueId: uuid("league_id").notNull().references(() => leagues.id, { onDelete: "cascade" }),
  seasonId: uuid("season_id").notNull().references(() => seasons.id, { onDelete: "cascade" }),
  matchweekId: uuid("matchweek_id").notNull().references(() => matchweeks.id, { onDelete: "cascade" }),
  result: pickResultEnum("result").default("pending").notNull(),
  followedAt: timestamp("followed_at", { withTimezone: true }).defaultNow().notNull(),
  settledAt: timestamp("settled_at", { withTimezone: true }),
  createdAt,
}, (table) => [
  uniqueIndex("followed_picks_follower_league_matchweek_unique").on(table.followerUserId, table.leagueId, table.matchweekId),
  index("followed_picks_source_pick_id_idx").on(table.sourcePickId),
  index("followed_picks_matchweek_result_idx").on(table.matchweekId, table.result),
  index("followed_picks_season_id_idx").on(table.seasonId),
]);

const recordColumns = {
  wins: integer("wins").default(0).notNull(),
  losses: integer("losses").default(0).notNull(),
  voids: integer("voids").default(0).notNull(),
  settledPicks: integer("settled_picks").default(0).notNull(),
  currentWinStreak: integer("current_win_streak").default(0).notNull(),
  bestWinStreak: integer("best_win_streak").default(0).notNull(),
  tier: text("tier").default("Provisional").notNull(),
  confidenceAdjustedAccuracy: numeric("confidence_adjusted_accuracy", { precision: 7, scale: 6 }),
  lastSettledAt: timestamp("last_settled_at", { withTimezone: true }),
  createdAt,
  updatedAt,
};

export const userLeagueRecords = pgTable("user_league_records", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  leagueId: uuid("league_id").notNull().references(() => leagues.id, { onDelete: "cascade" }),
  ...recordColumns,
}, (table) => [
  uniqueIndex("user_league_records_user_league_unique").on(table.userId, table.leagueId),
  index("user_league_records_leaderboard_idx").on(table.leagueId, table.confidenceAdjustedAccuracy, table.settledPicks),
]);

export const userLeagueSeasonRecords = pgTable("user_league_season_records", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  leagueId: uuid("league_id").notNull().references(() => leagues.id, { onDelete: "cascade" }),
  seasonId: uuid("season_id").notNull().references(() => seasons.id, { onDelete: "cascade" }),
  ...recordColumns,
}, (table) => [
  uniqueIndex("user_league_season_records_unique").on(table.userId, table.leagueId, table.seasonId),
  index("user_league_season_records_leaderboard_idx").on(table.leagueId, table.seasonId, table.confidenceAdjustedAccuracy),
]);

export const settlementEvents = pgTable("settlement_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  leagueId: uuid("league_id").notNull().references(() => leagues.id, { onDelete: "cascade" }),
  seasonId: uuid("season_id").notNull().references(() => seasons.id, { onDelete: "cascade" }),
  pickId: uuid("pick_id").notNull().references(() => picks.id),
  eventType: settlementEventTypeEnum("event_type").notNull(),
  result: pickResultEnum("result").notNull(),
  supersedesEventId: uuid("supersedes_event_id").references((): AnyPgColumn => settlementEvents.id),
  reason: text("reason"),
  createdAt,
}, (table) => [
  index("settlement_events_pick_created_idx").on(table.pickId, table.createdAt),
  index("settlement_events_user_league_idx").on(table.userId, table.leagueId),
  index("settlement_events_season_id_idx").on(table.seasonId),
  index("settlement_events_supersedes_id_idx").on(table.supersedesEventId),
  check("settlement_events_not_pending_check", sql`${table.result} <> 'pending'`),
]);

export const activeSettlementEffects = pgTable("active_settlement_effects", {
  pickId: uuid("pick_id").primaryKey().references(() => picks.id, { onDelete: "cascade" }),
  eventId: uuid("event_id").notNull().unique().references(() => settlementEvents.id),
  result: pickResultEnum("result").notNull(),
  updatedAt,
}, (table) => [
  check("active_settlement_effects_not_pending_check", sql`${table.result} <> 'pending'`),
]);

export const apiSyncRuns = pgTable("api_sync_runs", {
  id: uuid("id").defaultRandom().primaryKey(),
  provider: text("provider").notNull(),
  kind: text("kind").notNull(),
  status: syncStatusEnum("status").default("running").notNull(),
  requestCount: integer("request_count").default(0).notNull(),
  startedAt: timestamp("started_at", { withTimezone: true }).defaultNow().notNull(),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
  error: text("error"),
}, (table) => [index("api_sync_runs_provider_started_idx").on(table.provider, table.startedAt)]);

export type PickResult = (typeof pickResultEnum.enumValues)[number];
export type ParticipationMode = (typeof participationModeEnum.enumValues)[number];
export type FixtureStatus = (typeof fixtureStatusEnum.enumValues)[number];
