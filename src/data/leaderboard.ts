import "server-only";

import { cache } from "react";

import { sqlClient } from "@/db";
import { getRankThreshold } from "@/services/site-settings";

export type LeaderboardRow = {
  userId: string;
  handle: string | null;
  name: string;
  wins: number;
  losses: number;
  settledPicks: number;
  currentWinStreak: number;
  /** Accuracy weighted by how much evidence stands behind it. Null before a
   * record has been settled at all. */
  adjustedAccuracy: number;
  /** For a global row, the league this member's record is strongest in. */
  strongestLeague: { name: string; slug: string } | null;
};

export type LeagueLeaderboard = {
  league: { id: string; name: string; slug: string };
  rows: LeaderboardRow[];
};

export type LeaderboardData = {
  rankThreshold: number;
  global: LeaderboardRow[];
  leagues: LeagueLeaderboard[];
};

type Row = {
  user_id: string; handle: string | null; name: string;
  wins: number; losses: number; settled_picks: number; current_win_streak: number;
  adjusted: string | null; league_name: string | null; league_slug: string | null;
};

function toRow(row: Row): LeaderboardRow {
  return {
    userId: row.user_id,
    handle: row.handle,
    name: row.name,
    wins: row.wins,
    losses: row.losses,
    settledPicks: row.settled_picks,
    currentWinStreak: row.current_win_streak,
    adjustedAccuracy: Number(row.adjusted ?? 0),
    strongestLeague: row.league_name && row.league_slug ? { name: row.league_name, slug: row.league_slug } : null,
  };
}

/**
 * Every league's table, and one across all of them.
 *
 * The global table is not a fourth league: a member's standing there is their
 * whole independent record, and the league shown beside it is the one they are
 * strongest in, so a reader can tell what the number is made of. Followed calls
 * are absent from both, as they are absent from every record in this product.
 *
 * The same rank threshold gates both. A member who has not settled enough locks
 * to be ranked in a league has not earned a place on a table that spans them
 * either.
 */
export const getLeaderboards = cache(async function getLeaderboards(): Promise<LeaderboardData> {
  const rankThreshold = await getRankThreshold();

  const [globalRows, leagueRows] = await Promise.all([
    sqlClient<Row[]>`
      with totals as (
        select record.user_id,
          sum(record.wins)::int as wins,
          sum(record.losses)::int as losses,
          sum(record.settled_picks)::int as settled_picks,
          max(record.current_win_streak)::int as current_win_streak,
          -- Weighted by evidence, so a league carrying most of a member's
          -- record counts for most of their standing.
          sum(coalesce(record.confidence_adjusted_accuracy, 0) * record.settled_picks)
            / nullif(sum(record.settled_picks), 0) as adjusted
        from user_league_records record
        join leagues l on l.id = record.league_id and l.enabled = true
        group by record.user_id
        having sum(record.settled_picks) >= ${rankThreshold}
      ),
      strongest as (
        select distinct on (record.user_id) record.user_id, l.name, l.slug
        from user_league_records record
        join leagues l on l.id = record.league_id and l.enabled = true
        order by record.user_id, record.settled_picks desc, record.confidence_adjusted_accuracy desc nulls last, l.priority
      )
      select t.user_id, u.username as handle, u.name, t.wins, t.losses, t.settled_picks,
        t.current_win_streak, t.adjusted::text as adjusted, strongest.name as league_name, strongest.slug as league_slug
      from totals t
      join "user" u on u.id = t.user_id
      left join strongest on strongest.user_id = t.user_id
      order by t.adjusted desc nulls last, t.wins::numeric / nullif(t.wins + t.losses, 0) desc nulls last, t.settled_picks desc
      limit 50`,
    sqlClient<Array<Row & { league_id: string }>>`
      select record.league_id, l.name as league_name, l.slug as league_slug,
        record.user_id, u.username as handle, u.name,
        record.wins, record.losses, record.settled_picks, record.current_win_streak,
        record.confidence_adjusted_accuracy::text as adjusted
      from user_league_records record
      join leagues l on l.id = record.league_id and l.enabled = true
      join "user" u on u.id = record.user_id
      where record.settled_picks >= ${rankThreshold}
      order by l.priority, record.confidence_adjusted_accuracy desc nulls last,
        record.wins::numeric / nullif(record.wins + record.losses, 0) desc nulls last, record.settled_picks desc`,
  ]);

  const byLeague = new Map<string, LeagueLeaderboard>();
  for (const row of leagueRows) {
    const league = byLeague.get(row.league_id) ?? {
      league: { id: row.league_id, name: row.league_name!, slug: row.league_slug! },
      rows: [],
    };
    // The page shows a league's top ten; the whole table lives on the league's
    // own page, where the season and career split also lives.
    if (league.rows.length < 10) league.rows.push(toRow(row));
    byLeague.set(row.league_id, league);
  }

  return { rankThreshold, global: globalRows.map(toRow), leagues: [...byLeague.values()] };
});
