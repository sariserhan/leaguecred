import type postgres from "postgres";

import { sqlClient } from "@/db";
import type { PickResult } from "@/db/schema";
import { calculateRecordSummary } from "@/services/record-summary";

type SettleablePick = {
  id: string;
  user_id: string;
  league_id: string;
  season_id: string;
  selected_team_id: string;
  fixture_status: string;
  winner_team_id: string | null;
};

function resultFor(pick: SettleablePick): Exclude<PickResult, "pending"> {
  if (["cancelled", "abandoned"].includes(pick.fixture_status)) return "void";
  return pick.winner_team_id === pick.selected_team_id ? "win" : "loss";
}

function isTerminalFixtureStatus(status: string) {
  return ["finished", "cancelled", "abandoned"].includes(status);
}

export async function settlePendingPicks() {
  const candidates = await sqlClient<Array<{ id: string }>>`
    select p.id from picks p join fixtures f on f.id = p.fixture_id
    where p.result = 'pending' and f.status in ('finished', 'cancelled', 'abandoned')
    order by f.kickoff_at, p.id`;
  let settled = 0;
  for (const candidate of candidates) {
    settled += await settlePick(candidate.id) ? 1 : 0;
  }
  return { candidates: candidates.length, settled };
}

export async function settlePick(pickId: string) {
  return sqlClient.begin(async (sql) => {
    const [pick] = await sql<SettleablePick[]>`
      select p.id, p.user_id, p.league_id, p.season_id, p.selected_team_id,
        f.status as fixture_status, f.winner_team_id
      from picks p
      join fixtures f on f.id = p.fixture_id
      where p.id = ${pickId}
      for update of p, f`;
    if (!pick || !isTerminalFixtureStatus(pick.fixture_status)) return false;
    const [active] = await sql<Array<{ pick_id: string }>>`
      select pick_id from active_settlement_effects
      where pick_id = ${pick.id}
      for update`;
    if (active) return false;

    const result = resultFor(pick);
    const [event] = await sql<Array<{ id: string }>>`
      insert into settlement_events (user_id, league_id, season_id, pick_id, event_type, result)
      values (${pick.user_id}, ${pick.league_id}, ${pick.season_id}, ${pick.id}, 'initial_settlement', ${result})
      returning id`;
    if (!event) throw new Error("Settlement event was not created.");
    await sql`insert into active_settlement_effects (pick_id, event_id, result) values (${pick.id}, ${event.id}, ${result})`;
    await applyResult(sql, pick, result);
    return true;
  });
}

export async function correctSettlement(pickId: string, reason: string) {
  if (!reason.trim()) throw new Error("A correction reason is required.");
  return sqlClient.begin(async (sql) => {
    const [pick] = await sql<SettleablePick[]>`
      select p.id, p.user_id, p.league_id, p.season_id, p.selected_team_id,
        f.status as fixture_status, f.winner_team_id
      from picks p
      join fixtures f on f.id = p.fixture_id
      where p.id = ${pickId}
      for update of p, f`;
    if (!pick) throw new Error("Pick not found.");
    if (!isTerminalFixtureStatus(pick.fixture_status)) {
      throw new Error("A settlement can only be corrected after a terminal fixture result.");
    }
    const [active] = await sql<Array<{
      event_id: string;
      result: Exclude<PickResult, "pending">;
    }>>`
      select event_id, result from active_settlement_effects
      where pick_id = ${pick.id}
      for update`;
    if (!active) throw new Error("Pick has no active settlement to correct.");
    const correctedResult = resultFor(pick);
    if (correctedResult === active.result) return false;

    const [reversal] = await sql<Array<{ id: string }>>`
      insert into settlement_events (user_id, league_id, season_id, pick_id, event_type, result, supersedes_event_id, reason)
      values (${pick.user_id}, ${pick.league_id}, ${pick.season_id}, ${pick.id}, 'reversal', ${active.result}, ${active.event_id}, ${reason.trim()})
      returning id`;
    const [correction] = await sql<Array<{ id: string }>>`
      insert into settlement_events (user_id, league_id, season_id, pick_id, event_type, result, supersedes_event_id, reason)
      values (${pick.user_id}, ${pick.league_id}, ${pick.season_id}, ${pick.id}, 'correction', ${correctedResult}, ${reversal!.id}, ${reason.trim()})
      returning id`;
    await sql`
      update active_settlement_effects
      set event_id = ${correction!.id}, result = ${correctedResult}, updated_at = now()
      where pick_id = ${pick.id}`;
    await applyResult(sql, pick, correctedResult);
    return true;
  });
}

async function applyResult(
  sql: postgres.TransactionSql,
  pick: SettleablePick,
  result: Exclude<PickResult, "pending">,
) {
  await sql`
    update picks
    set result = ${result}, settled_at = now(), updated_at = now()
    where id = ${pick.id}`;
  await sql`
    update followed_picks
    set result = ${result}, settled_at = now()
    where source_pick_id = ${pick.id}`;
  await rebuildRecord(sql, pick.user_id, pick.league_id, null);
  await rebuildRecord(sql, pick.user_id, pick.league_id, pick.season_id);
}

async function rebuildRecord(
  sql: postgres.TransactionSql,
  userId: string,
  leagueId: string,
  seasonId: string | null,
) {
  const events = seasonId
    ? await sql<Array<{ result: Exclude<PickResult, "pending">; settled_at: Date }>>`
        select effect.result, p.settled_at from active_settlement_effects effect join picks p on p.id = effect.pick_id
        where p.user_id = ${userId} and p.league_id = ${leagueId} and p.season_id = ${seasonId} order by p.settled_at, p.id`
    : await sql<Array<{ result: Exclude<PickResult, "pending">; settled_at: Date }>>`
        select effect.result, p.settled_at from active_settlement_effects effect join picks p on p.id = effect.pick_id
        where p.user_id = ${userId} and p.league_id = ${leagueId} order by p.settled_at, p.id`;
  const summary = calculateRecordSummary(events.map((event) => event.result));
  const lastSettledAt = events.at(-1)?.settled_at ?? new Date();

  if (seasonId) {
    await sql`insert into user_league_season_records (user_id, league_id, season_id, wins, losses, voids, settled_picks, current_win_streak, best_win_streak, tier, confidence_adjusted_accuracy, last_settled_at)
      values (${userId}, ${leagueId}, ${seasonId}, ${summary.wins}, ${summary.losses}, ${summary.voids}, ${summary.settledPicks}, ${summary.currentWinStreak}, ${summary.bestWinStreak}, ${summary.tier}, ${summary.confidenceAdjustedAccuracy}, ${new Date(lastSettledAt).toISOString()})
      on conflict (user_id, league_id, season_id) do update set wins = excluded.wins, losses = excluded.losses, voids = excluded.voids, settled_picks = excluded.settled_picks, current_win_streak = excluded.current_win_streak, best_win_streak = excluded.best_win_streak, tier = excluded.tier, confidence_adjusted_accuracy = excluded.confidence_adjusted_accuracy, last_settled_at = excluded.last_settled_at, updated_at = now()`;
  } else {
    await sql`insert into user_league_records (user_id, league_id, wins, losses, voids, settled_picks, current_win_streak, best_win_streak, tier, confidence_adjusted_accuracy, last_settled_at)
      values (${userId}, ${leagueId}, ${summary.wins}, ${summary.losses}, ${summary.voids}, ${summary.settledPicks}, ${summary.currentWinStreak}, ${summary.bestWinStreak}, ${summary.tier}, ${summary.confidenceAdjustedAccuracy}, ${new Date(lastSettledAt).toISOString()})
      on conflict (user_id, league_id) do update set wins = excluded.wins, losses = excluded.losses, voids = excluded.voids, settled_picks = excluded.settled_picks, current_win_streak = excluded.current_win_streak, best_win_streak = excluded.best_win_streak, tier = excluded.tier, confidence_adjusted_accuracy = excluded.confidence_adjusted_accuracy, last_settled_at = excluded.last_settled_at, updated_at = now()`;
  }
}
