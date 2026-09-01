import "server-only";

import { sqlClient } from "@/db";

export type SlipCandidate = {
  fixtureId: string;
  kickoff: string;
  addedAt: string;
  league: { id: string; name: string; slug: string };
  home: { id: string; name: string; logoUrl: string | null };
  away: { id: string; name: string; logoUrl: string | null };
  /** True once the match is under way: it can still be removed, never locked. */
  started: boolean;
  /** One lock a day per league, so a day already spoken for closes this one. */
  dayAlreadyLocked: boolean;
};

/**
 * The matches on a member's slip that they have not locked.
 *
 * A locked match leaves the slip on its own, so this never shows a decision
 * already made — the slip is the thinking, the Weekly Slip below it is the
 * record.
 */
export async function getSlipCandidates(userId: string): Promise<SlipCandidate[]> {
  const rows = await sqlClient<Array<{
    fixture_id: string; kickoff_at: Date; added_at: Date;
    league_id: string; league_name: string; league_slug: string;
    home_id: string; home_name: string; home_logo: string | null;
    away_id: string; away_name: string; away_logo: string | null;
    started: boolean; day_already_locked: boolean;
  }>>`
    select c.fixture_id, f.kickoff_at, c.created_at as added_at,
      l.id as league_id, l.name as league_name, l.slug as league_slug,
      home.id as home_id, home.name as home_name, home.logo_url as home_logo,
      away.id as away_id, away.name as away_name, away.logo_url as away_logo,
      (f.status <> 'scheduled' or f.kickoff_at <= now()) as started,
      exists (
        select 1 from picks p
        where p.user_id = c.user_id and p.league_id = f.league_id
          and p.match_date = (f.kickoff_at at time zone 'UTC')::date
      ) as day_already_locked
    from slip_candidates c
    join fixtures f on f.id = c.fixture_id
    join leagues l on l.id = f.league_id
    join teams home on home.id = f.home_team_id
    join teams away on away.id = f.away_team_id
    where c.user_id = ${userId}
    order by f.kickoff_at`;

  return rows.map((row) => ({
    fixtureId: row.fixture_id,
    kickoff: new Date(row.kickoff_at).toISOString(),
    addedAt: new Date(row.added_at).toISOString(),
    league: { id: row.league_id, name: row.league_name, slug: row.league_slug },
    home: { id: row.home_id, name: row.home_name, logoUrl: row.home_logo },
    away: { id: row.away_id, name: row.away_name, logoUrl: row.away_logo },
    started: row.started,
    dayAlreadyLocked: row.day_already_locked,
  }));
}
