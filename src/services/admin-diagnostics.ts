import { sqlClient } from "@/db";
import type { PickResult } from "@/db/schema";
import { toEpochMilliseconds, toIsoTimestamp } from "@/lib/timestamps";

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
