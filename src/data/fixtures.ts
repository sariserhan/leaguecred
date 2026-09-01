import { cache } from "react";

import { sqlClient } from "@/db";
import type { GameDiscussion } from "@/data/leagues";
import { readVoterId } from "@/lib/voter-id";

/**
 * Every match still open to call, across every league, grouped by the day it is
 * played.
 *
 * The league pages ask "what is on in this competition"; this asks "what is on
 * today", which is the question someone who follows more than one league
 * actually has. A call is still one per league per day, so a Saturday can hold a
 * Serie A call and a Premier League call at once but never two of either.
 *
 * Limited to the fortnight ahead. Beyond that a board is a fixture list rather
 * than something anyone is deciding on, and most leagues have months loaded.
 */

export type BoardFixture = {
  id: string;
  leagueId: string;
  leagueName: string;
  leagueSlug: string;
  matchDate: string;
  kickoff: string;
  home: string;
  homeCode: string;
  homeLogoUrl: string | null;
  homeTeamId: string;
  away: string;
  awayCode: string;
  awayLogoUrl: string | null;
  awayTeamId: string;
  /** The team already locked for this league on this day, if any. */
  lockedTeam: string | null;
  /** True when the viewer is following a specialist in this league's matchweek,
   * which rules an independent call out for the whole week. */
  following: boolean;
  /** Already set aside by the viewer, so the button says so rather than
   * offering a second copy. */
  inSlip: boolean;
  homeVotes: number;
  awayVotes: number;
  viewerVote: "home" | "away" | null;
  discussion: GameDiscussion[];
};

export type FixtureBoardDay = { date: string; fixtures: BoardFixture[] };

export type FixtureBoard = {
  days: FixtureBoardDay[];
  /** How many days still hold something the viewer could call. */
  openDays: number;
};

// A fortnight of fixtures is a board; a season of them is a fixture list, and
// every match on it carries its own votes and conversation to load.
const DAYS_AHEAD = 14;

export const getFixtureBoard = cache(async function getFixtureBoard(userId?: string): Promise<FixtureBoard> {
  const viewerId = userId ?? "";
  const voterId = await readVoterId() ?? "";
  const rows = await sqlClient<Array<{
    id: string; league_id: string; league_name: string; league_slug: string;
    match_date: string; kickoff_at: Date;
    home: string; home_code: string; home_logo_url: string | null; home_team_id: string;
    away: string; away_code: string; away_logo_url: string | null; away_team_id: string;
    locked_team: string | null; following: boolean; in_slip: boolean;
    home_votes: number; away_votes: number; viewer_vote: "home" | "away" | null;
  }>>`
    select f.id, l.id as league_id, l.name as league_name, l.slug as league_slug,
      (f.kickoff_at at time zone 'UTC')::date::text as match_date, f.kickoff_at,
      h.name as home, h.short_name as home_code, h.logo_url as home_logo_url, h.id as home_team_id,
      a.name as away, a.short_name as away_code, a.logo_url as away_logo_url, a.id as away_team_id,
      (select t.name from picks p join teams t on t.id = p.selected_team_id
        where p.user_id = ${viewerId} and p.league_id = f.league_id
          and p.match_date = (f.kickoff_at at time zone 'UTC')::date
        limit 1) as locked_team,
      exists(select 1 from matchweek_participation mp
        where mp.user_id = ${viewerId} and mp.matchweek_id = f.matchweek_id and mp.mode = 'follow') as following,
      exists(select 1 from slip_candidates sc
        where sc.user_id = ${viewerId ?? null} and sc.fixture_id = f.id) as in_slip,
      coalesce(votes.home_votes, 0) as home_votes, coalesce(votes.away_votes, 0) as away_votes,
      viewer_vote.choice as viewer_vote
    from fixtures f
    join leagues l on l.id = f.league_id and l.enabled = true
    join seasons s on s.id = f.season_id and s.is_current = true
    join teams h on h.id = f.home_team_id
    join teams a on a.id = f.away_team_id
    left join lateral (
      select count(*) filter (where fv.choice = 'home')::int as home_votes,
        count(*) filter (where fv.choice = 'away')::int as away_votes
      from fixture_votes fv where fv.fixture_id = f.id
    ) votes on true
    left join fixture_votes viewer_vote on viewer_vote.fixture_id = f.id and viewer_vote.voter_id = ${voterId}
    where f.status = 'scheduled'
      and f.kickoff_at > now()
      and f.kickoff_at < now() + ${`${DAYS_AHEAD} days`}::interval
    order by f.kickoff_at, l.name`;

  const discussionRows = rows.length === 0 ? [] : await sqlClient<Array<{
    id: string; fixture_id: string; body: string; guest_name: string | null;
    user_name: string | null; created_at: Date;
  }>>`
    select d.id, d.fixture_id, d.body, d.guest_name, u.name as user_name, d.created_at
    from game_discussions d left join "user" u on u.id = d.user_id
    where d.fixture_id = any(${rows.map((row) => row.id)}::uuid[])
    order by d.created_at asc`;
  const discussionsByFixture = new Map<string, GameDiscussion[]>();
  for (const row of discussionRows) {
    const comment: GameDiscussion = {
      id: row.id,
      author: row.user_name ?? row.guest_name ?? "Guest",
      body: row.body,
      createdAt: new Date(row.created_at).toISOString(),
    };
    discussionsByFixture.set(row.fixture_id, [...(discussionsByFixture.get(row.fixture_id) ?? []), comment]);
  }

  const byDate = new Map<string, BoardFixture[]>();
  for (const row of rows) {
    const fixture: BoardFixture = {
      id: row.id,
      leagueId: row.league_id,
      leagueName: row.league_name,
      leagueSlug: row.league_slug,
      matchDate: row.match_date,
      kickoff: new Date(row.kickoff_at).toISOString(),
      home: row.home,
      homeCode: row.home_code,
      homeLogoUrl: row.home_logo_url,
      homeTeamId: row.home_team_id,
      away: row.away,
      awayCode: row.away_code,
      awayLogoUrl: row.away_logo_url,
      awayTeamId: row.away_team_id,
      lockedTeam: row.locked_team,
      following: row.following,
      inSlip: row.in_slip,
      homeVotes: row.home_votes,
      awayVotes: row.away_votes,
      viewerVote: row.viewer_vote,
      discussion: discussionsByFixture.get(row.id) ?? [],
    };
    byDate.set(row.match_date, [...(byDate.get(row.match_date) ?? []), fixture]);
  }

  const days = [...byDate.entries()].map(([date, fixtures]) => ({ date, fixtures }));
  const openDays = days.filter((day) =>
    day.fixtures.some((fixture) => !fixture.lockedTeam && !fixture.following)).length;

  return { days, openDays };
});
