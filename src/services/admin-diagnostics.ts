import { sqlClient } from "@/db";
import type { PickResult } from "@/db/schema";
import { toEpochMilliseconds, toIsoTimestamp } from "@/lib/timestamps";
import { getRankThreshold } from "@/services/site-settings";

export type SyncRunDiagnostic = {
  id: string;
  provider: string;
  kind: string;
  status: "running" | "succeeded" | "failed";
  requestCount: number;
  startedAt: string;
  finishedAt: string | null;
  durationSeconds: number | null;
  error: string | null;
};

export type SettlementCorrectionDiagnostic = {
  id: string;
  pickId: string;
  eventType: "reversal" | "correction";
  result: Exclude<PickResult, "pending">;
  reason: string | null;
  createdAt: string;
  userName: string;
  leagueName: string;
  leagueSlug: string;
};

export type OperationalSummary = {
  pendingPicks: number;
  settledPicks: number;
  failedSyncRuns: number;
  lastSuccessfulSyncAt: string | null;
};

export type AdminManagementSummary = {
  counts: { users: number; enabledLeagues: number; upcomingFixtures: number; provisionalRecords: number };
  upcoming: Array<{ id: string; league: string; fixture: string; kickoffAt: string; matchweek: string }>;
  accounts: Array<{ id: string; name: string; email: string; createdAt: string; independentPicks: number; follows: number }>;
};

export async function getAdminManagementSummary(): Promise<AdminManagementSummary> {
  const rankThreshold = await getRankThreshold();
  const [countRows, upcomingRows, accountRows] = await Promise.all([
    sqlClient<Array<{ users: number; leagues: number; fixtures: number; provisional: number }>>`
      select (select count(*)::int from "user") users,
        (select count(*)::int from leagues where enabled = true) leagues,
        (select count(*)::int from fixtures where status = 'scheduled' and kickoff_at > now()) fixtures,
        (select count(*)::int from user_league_records where settled_picks > 0 and settled_picks < ${rankThreshold}) provisional`,
    sqlClient<Array<{ id: string; league: string; home: string; away: string; kickoff_at: Date | string; matchweek: string }>>`
      select f.id, l.name league, h.name home, a.name away, f.kickoff_at, mw.display_name matchweek
      from fixtures f join leagues l on l.id=f.league_id join teams h on h.id=f.home_team_id
      join teams a on a.id=f.away_team_id join matchweeks mw on mw.id=f.matchweek_id
      where f.status='scheduled' and f.kickoff_at > now() order by f.kickoff_at limit 8`,
    sqlClient<Array<{ id: string; name: string; email: string; created_at: Date | string; picks: number; follows: number }>>`
      select u.id,u.name,u.email,u.created_at,
        (select count(*)::int from picks p where p.user_id=u.id) picks,
        (select count(*)::int from league_follows f where f.follower_user_id=u.id) follows
      from "user" u order by u.created_at desc limit 8`,
  ]);
  const counts = countRows[0];
  return {
    counts: { users: counts?.users ?? 0, enabledLeagues: counts?.leagues ?? 0, upcomingFixtures: counts?.fixtures ?? 0, provisionalRecords: counts?.provisional ?? 0 },
    upcoming: upcomingRows.map((row) => ({ id: row.id, league: row.league, fixture: `${row.home} vs ${row.away}`, kickoffAt: toIsoTimestamp(row.kickoff_at), matchweek: row.matchweek })),
    accounts: accountRows.map((row) => ({ id: row.id, name: row.name, email: row.email, createdAt: toIsoTimestamp(row.created_at), independentPicks: row.picks, follows: row.follows })),
  };
}

export async function getSyncRunDiagnostics(limit = 15): Promise<SyncRunDiagnostic[]> {
  const rows = await sqlClient<Array<{
    id: string; provider: string; kind: string;
    status: SyncRunDiagnostic["status"]; request_count: number;
    started_at: Date | string; finished_at: Date | string | null; error: string | null;
  }>>`
    select id, provider, kind, status, request_count, started_at, finished_at, error
    from api_sync_runs
    order by started_at desc
    limit ${limit}`;

  return rows.map((row) => ({
    id: row.id,
    provider: row.provider,
    kind: row.kind,
    status: row.status,
    requestCount: row.request_count,
    startedAt: toIsoTimestamp(row.started_at),
    finishedAt: row.finished_at ? toIsoTimestamp(row.finished_at) : null,
    durationSeconds: row.finished_at
      ? Math.max(
          0,
          Math.round(
            (toEpochMilliseconds(row.finished_at) - toEpochMilliseconds(row.started_at)) / 1000,
          ),
        )
      : null,
    error: row.error,
  }));
}

export async function getSettlementCorrections(limit = 15): Promise<SettlementCorrectionDiagnostic[]> {
  const rows = await sqlClient<Array<{
    id: string; pick_id: string; event_type: "reversal" | "correction";
    result: Exclude<PickResult, "pending">; reason: string | null; created_at: Date | string;
    user_name: string; league_name: string; league_slug: string;
  }>>`
    select event.id, event.pick_id, event.event_type, event.result, event.reason, event.created_at,
      account.name as user_name, league.name as league_name, league.slug as league_slug
    from settlement_events event
    join "user" account on account.id = event.user_id
    join leagues league on league.id = event.league_id
    where event.event_type in ('reversal', 'correction')
    order by event.created_at desc
    limit ${limit}`;

  return rows.map((row) => ({
    id: row.id,
    pickId: row.pick_id,
    eventType: row.event_type,
    result: row.result,
    reason: row.reason,
    createdAt: toIsoTimestamp(row.created_at),
    userName: row.user_name,
    leagueName: row.league_name,
    leagueSlug: row.league_slug,
  }));
}

export async function getOperationalSummary(): Promise<OperationalSummary> {
  const [[picks], [failures], [lastSuccess]] = await Promise.all([
    sqlClient<Array<{ pending: string; settled: string }>>`
      select
        count(*) filter (where result = 'pending') as pending,
        count(*) filter (where result <> 'pending') as settled
      from picks`,
    sqlClient<Array<{ total: string }>>`
      select count(*) as total from api_sync_runs
      where status = 'failed' and started_at > now() - interval '24 hours'`,
    sqlClient<Array<{ started_at: Date | string }>>`
      select started_at from api_sync_runs
      where status = 'succeeded' order by started_at desc limit 1`,
  ]);

  return {
    pendingPicks: Number(picks?.pending ?? 0),
    settledPicks: Number(picks?.settled ?? 0),
    failedSyncRuns: Number(failures?.total ?? 0),
    lastSuccessfulSyncAt: lastSuccess ? toIsoTimestamp(lastSuccess.started_at) : null,
  };
}
