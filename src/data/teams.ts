import "server-only";

import { cache } from "react";

import { sqlClient } from "@/db";
import type { FixtureStatus } from "@/db/schema";

export type TeamProfileData = {
  team: { id: string; name: string; slug: string; shortName: string; logoUrl: string | null; country: string | null };
  leagues: Array<{ slug: string; name: string }>;
  record: { played: number; wins: number; draws: number; losses: number; goalsFor: number; goalsAgainst: number };
  upcoming: TeamFixture[];
  recent: TeamFixture[];
};

export type TeamFixture = {
  id: string;
  leagueName: string;
  leagueSlug: string;
  opponent: string;
  opponentLogoUrl: string | null;
  home: boolean;
  kickoff: string;
  status: FixtureStatus;
  teamScore: number | null;
  opponentScore: number | null;
};

export type TeamNavTeam = { slug: string; name: string; logoUrl: string | null };
export type TeamNavLeague = { slug: string; name: string; country: string | null; logoUrl: string | null; teams: TeamNavTeam[] };

type FixtureRow = {
  id: string;
  league_name: string;
  league_slug: string;
  opponent: string;
  opponent_logo_url: string | null;
  home: boolean;
  kickoff_at: Date;
  status: FixtureStatus;
  team_score: number | null;
  opponent_score: number | null;
};

export const getTeamProfile = cache(async function getTeamProfile(teamSlug: string): Promise<TeamProfileData | null> {
  const [team] = await sqlClient<Array<{ id: string; name: string; slug: string; short_name: string; logo_url: string | null; country: string | null }>>`
    select t.id, t.name, t.slug, t.short_name, t.logo_url, c.name as country
    from teams t left join countries c on c.id = t.country_id
    where t.slug = ${teamSlug}
    limit 1`;
  if (!team) return null;

  const [leagueRows, recordRows, upcomingRows, recentRows] = await Promise.all([
    sqlClient<Array<{ slug: string; name: string }>>`
      select distinct l.slug, l.name
      from league_team_memberships membership
      join leagues l on l.id = membership.league_id and l.enabled = true
      join seasons s on s.id = membership.season_id and s.is_current = true
      where membership.team_id = ${team.id}
      order by l.name`,
    sqlClient<Array<{ played: number; wins: number; draws: number; losses: number; goals_for: number; goals_against: number }>>`
      select count(*) filter (where f.status = 'finished')::int as played,
        count(*) filter (where f.status = 'finished' and f.winner_team_id = ${team.id})::int as wins,
        count(*) filter (where f.status = 'finished' and f.winner_team_id is null)::int as draws,
        count(*) filter (where f.status = 'finished' and f.winner_team_id is not null and f.winner_team_id <> ${team.id})::int as losses,
        coalesce(sum(case when f.home_team_id = ${team.id} then f.home_score else f.away_score end) filter (where f.status = 'finished'), 0)::int as goals_for,
        coalesce(sum(case when f.home_team_id = ${team.id} then f.away_score else f.home_score end) filter (where f.status = 'finished'), 0)::int as goals_against
      from fixtures f
      join seasons s on s.id = f.season_id and s.is_current = true
      where f.home_team_id = ${team.id} or f.away_team_id = ${team.id}`,
    sqlClient<FixtureRow[]>`
      select f.id, l.name as league_name, l.slug as league_slug,
        case when f.home_team_id = ${team.id} then a.name else h.name end as opponent,
        case when f.home_team_id = ${team.id} then a.logo_url else h.logo_url end as opponent_logo_url,
        (f.home_team_id = ${team.id}) as home, f.kickoff_at, f.status,
        case when f.home_team_id = ${team.id} then f.home_score else f.away_score end as team_score,
        case when f.home_team_id = ${team.id} then f.away_score else f.home_score end as opponent_score
      from fixtures f
      join leagues l on l.id = f.league_id
      join teams h on h.id = f.home_team_id
      join teams a on a.id = f.away_team_id
      where (f.home_team_id = ${team.id} or f.away_team_id = ${team.id})
        and f.status = 'scheduled' and f.kickoff_at >= now()
      order by f.kickoff_at
      limit 12`,
    sqlClient<FixtureRow[]>`
      select f.id, l.name as league_name, l.slug as league_slug,
        case when f.home_team_id = ${team.id} then a.name else h.name end as opponent,
        case when f.home_team_id = ${team.id} then a.logo_url else h.logo_url end as opponent_logo_url,
        (f.home_team_id = ${team.id}) as home, f.kickoff_at, f.status,
        case when f.home_team_id = ${team.id} then f.home_score else f.away_score end as team_score,
        case when f.home_team_id = ${team.id} then f.away_score else f.home_score end as opponent_score
      from fixtures f
      join leagues l on l.id = f.league_id
      join teams h on h.id = f.home_team_id
      join teams a on a.id = f.away_team_id
      where (f.home_team_id = ${team.id} or f.away_team_id = ${team.id})
        and f.kickoff_at < now() and f.status in ('finished', 'cancelled', 'abandoned', 'postponed')
      order by f.kickoff_at desc
      limit 12`,
  ]);

  const record = recordRows[0] ?? { played: 0, wins: 0, draws: 0, losses: 0, goals_for: 0, goals_against: 0 };
  const mapFixture = (fixture: FixtureRow): TeamFixture => ({
    id: fixture.id,
    leagueName: fixture.league_name,
    leagueSlug: fixture.league_slug,
    opponent: fixture.opponent,
    opponentLogoUrl: fixture.opponent_logo_url,
    home: fixture.home,
    kickoff: new Date(fixture.kickoff_at).toISOString(),
    status: fixture.status,
    teamScore: fixture.team_score,
    opponentScore: fixture.opponent_score,
  });
  return {
    team: { id: team.id, name: team.name, slug: team.slug, shortName: team.short_name, logoUrl: team.logo_url, country: team.country },
    leagues: leagueRows,
    record: { played: record.played, wins: record.wins, draws: record.draws, losses: record.losses, goalsFor: record.goals_for, goalsAgainst: record.goals_against },
    upcoming: upcomingRows.map(mapFixture),
    recent: recentRows.map(mapFixture),
  };
});

export const getTeamNavOptions = cache(async function getTeamNavOptions(): Promise<TeamNavLeague[]> {
  const rows = await sqlClient<Array<{ league_slug: string; league_name: string; league_country: string | null; league_logo_url: string | null; team_slug: string; team_name: string; team_logo_url: string | null }>>`
    select l.slug as league_slug, l.name as league_name, c.name as league_country, l.logo_url as league_logo_url,
      t.slug as team_slug, t.name as team_name, t.logo_url as team_logo_url
    from leagues l
    join countries c on c.id = l.country_id
    join league_team_memberships membership on membership.league_id = l.id
    join seasons s on s.id = membership.season_id and s.is_current = true
    join teams t on t.id = membership.team_id
    where l.enabled = true
    order by l.priority, l.name, t.name`;

  const leagues = new Map<string, TeamNavLeague>();
  for (const row of rows) {
    const league = leagues.get(row.league_slug) ?? { slug: row.league_slug, name: row.league_name, country: row.league_country, logoUrl: row.league_logo_url, teams: [] };
    league.teams.push({ slug: row.team_slug, name: row.team_name, logoUrl: row.team_logo_url });
    leagues.set(row.league_slug, league);
  }
  return [...leagues.values()];
});
