import "server-only";

import { cache } from "react";

import { sqlClient } from "@/db";
import type { FixtureStatus } from "@/db/schema";
import type { League, Region } from "@/lib/league-data";
import { MINIMUM_SETTLED_PICKS_FOR_RANK } from "@/lib/reputation";

const flags: Record<string, string> = {
  AR: "🇦🇷", BR: "🇧🇷", CA: "🇨🇦", DE: "🇩🇪", ES: "🇪🇸", GB: "🏴",
  GR: "🇬🇷", IT: "🇮🇹", JP: "🇯🇵", MX: "🇲🇽", NL: "🇳🇱", PT: "🇵🇹",
  TR: "🇹🇷", US: "🇺🇸",
};

type DirectoryRow = {
  slug: string;
  country: string;
  country_code: string;
  flag_url: string | null;
  name: string;
  short_name: string;
  logo_url: string | null;
  region: Region;
  specialist_count: number;
  wins: number | null;
  losses: number | null;
  followed_count: number;
  has_experience: boolean;
  has_team_catalog: boolean;
  lock_due: boolean;
};

export async function getLeagueDirectory(userId?: string): Promise<League[]> {
  const currentUserId = userId ?? "";
  const rows = await sqlClient<DirectoryRow[]>`
    select l.slug, c.name as country, c.code as country_code, c.flag_url, l.name, l.short_name, l.logo_url, l.region,
      (select count(*)::int from user_league_records r where r.league_id = l.id and r.settled_picks >= ${MINIMUM_SETTLED_PICKS_FOR_RANK}) as specialist_count,
      own.wins, own.losses,
      exists(select 1 from matchweeks mw where mw.league_id = l.id) as has_experience,
      exists(
        select 1 from league_team_memberships ltm
        join seasons cs on cs.id = ltm.season_id and cs.is_current = true
        where ltm.league_id = l.id
      ) as has_team_catalog,
      (select count(*)::int from league_follows f where f.follower_user_id = ${currentUserId} and f.league_id = l.id) as followed_count,
      exists(
        select 1 from matchweeks mw
        where mw.league_id = l.id and mw.status = 'upcoming'
          and not exists(
            select 1 from matchweek_participation mp
            where mp.matchweek_id = mw.id and mp.user_id = ${currentUserId} and mp.mode = 'independent'
          )
      ) as lock_due
    from leagues l
    join countries c on c.id = l.country_id
    left join user_league_records own on own.league_id = l.id and own.user_id = ${currentUserId}
    where l.enabled = true
    order by l.priority asc, l.name asc`;

  return rows.map((row) => {
    const decisions = (row.wins ?? 0) + (row.losses ?? 0);
    const status = decisions > 0
      ? `Your record ${(((row.wins ?? 0) / decisions) * 100).toFixed(1)}%`
      : row.followed_count > 0
        ? `${row.followed_count} specialist${row.followed_count === 1 ? "" : "s"} followed`
        : "No record yet";

    return {
      slug: row.slug,
      country: row.country,
      countryCode: row.country_code,
      flag: flags[row.country_code] ?? "⚽",
      flagUrl: row.flag_url,
      logoUrl: row.logo_url,
      name: row.name,
      shortName: row.short_name,
      region: row.region,
      specialistCount: row.specialist_count,
      status,
      action: row.has_experience ? "Open league" : "View teams",
      available: row.has_experience || row.has_team_catalog,
      hasExperience: row.has_experience,
      hasTeamCatalog: row.has_team_catalog,
      hasRecord: decisions > 0,
      isFollowed: row.followed_count > 0,
      lockDue: row.lock_due,
    };
  });
}

export type LeagueTeamCatalog = {
  teams: Array<{ id: string; name: string; slug: string; shortName: string; logoUrl: string | null }>;
  isComplete: boolean;
  sources: string[];
};

export async function getLeagueTeamCatalog(slug: string): Promise<LeagueTeamCatalog> {
  const [teams, imports] = await Promise.all([
    sqlClient<Array<{ id: string; name: string; slug: string; short_name: string; logo_url: string | null }>>`
      select distinct t.id, t.name, t.slug, t.short_name, t.logo_url
      from teams t
      join league_team_memberships ltm on ltm.team_id = t.id
      join leagues l on l.id = ltm.league_id
      join seasons s on s.id = ltm.season_id and s.is_current = true
      where l.slug = ${slug} and l.enabled = true
      order by t.name`,
    sqlClient<Array<{ provider: string; is_complete: boolean }>>`
      select distinct lti.provider, lti.is_complete
      from league_team_imports lti
      join leagues l on l.id = lti.league_id
      join seasons s on s.id = lti.season_id and s.is_current = true
      where l.slug = ${slug} and l.enabled = true`,
  ]);

  return {
    teams: teams.map((team) => ({
      id: team.id,
      name: team.name,
      slug: team.slug,
      shortName: team.short_name,
      logoUrl: team.logo_url,
    })),
    isComplete: imports.some((entry) => entry.is_complete),
    sources: imports.map((entry) => entry.provider),
  };
}

type LeagueRow = {
  id: string; slug: string; name: string; short_name: string; country: string; country_code: string;
};
type MatchweekRow = {
  id: string; season_id: string; display_name: string; lock_at: Date; status: "upcoming" | "locked" | "settling" | "settled";
};

export type DatabaseFixture = {
  id: string;
  home: string;
  homeCode: string;
  homeLogoUrl: string | null;
  homeTeamId: string;
  away: string;
  awayCode: string;
  awayLogoUrl: string | null;
  awayTeamId: string;
  kickoffDate: string;
  kickoff: string;
};

export type PastMatchweek = {
  id: string;
  displayName: string;
  fixtures: Array<{
    id: string;
    home: string;
    homeCode: string;
    homeLogoUrl: string | null;
    homeScore: number | null;
    away: string;
    awayCode: string;
    awayLogoUrl: string | null;
    awayScore: number | null;
    status: FixtureStatus;
  }>;
};

export type MatchweekHistoryData = {
  league: { slug: string; name: string; country: string };
  matchweek: { id: string; displayName: string };
  fixtures: Array<{
    id: string;
    home: string;
    homeLogoUrl: string | null;
    homeScore: number | null;
    away: string;
    awayLogoUrl: string | null;
    awayScore: number | null;
    status: FixtureStatus;
  }>;
  summary: {
    totalLocks: number;
    contributors: number;
    correctLocks: number;
    settledLocks: number;
    followedCalls: number;
  };
  teamVotes: Array<{
    id: string;
    name: string;
    logoUrl: string | null;
    votes: number;
    wins: number;
  }>;
  locks: Array<{
    id: string;
    specialistId: string;
    specialist: string;
    initials: string;
    team: string;
    teamLogoUrl: string | null;
    fixture: string;
    result: "win" | "loss" | "void" | "pending";
  }>;
};

export type DatabaseSpecialist = {
  id: string;
  name: string;
  initials: string;
  accuracy: number;
  record: string;
  picks: number;
  followers: number;
  lock: string;
  sourcePickId: string;
};

export type LeagueLeaderboardEntry = {
  id: string;
  name: string;
  wins: number;
  losses: number;
  settledPicks: number;
  currentWinStreak: number;
  confidenceAdjustedAccuracy: number;
};

export type LeagueExperienceData = {
  league: { id: string; slug: string; name: string; shortName: string; country: string; countryCode: string };
  matchweek: { id: string; seasonId: string; displayName: string; lockAt: string; status: MatchweekRow["status"] };
  fixtures: DatabaseFixture[];
  pastMatchweeks: PastMatchweek[];
  specialists: DatabaseSpecialist[];
  leaderboard: {
    currentSeason: LeagueLeaderboardEntry[];
    career: LeagueLeaderboardEntry[];
  };
  viewer: {
    authenticated: boolean;
    mode: "independent" | "follow" | null;
    picksRevealed: boolean;
    lockedTeam: string | null;
    followedSourcePickId: string | null;
    wins: number;
    losses: number;
    tier: string;
  };
};

export async function getLeagueExperience(slug: string, userId?: string): Promise<LeagueExperienceData | null> {
  const [league] = await sqlClient<LeagueRow[]>`
    select l.id, l.slug, l.name, l.short_name, c.name as country, c.code as country_code
    from leagues l join countries c on c.id = l.country_id
    where l.slug = ${slug} and l.enabled = true limit 1`;
  if (!league) return null;

  const [matchweek] = await sqlClient<MatchweekRow[]>`
    select id, season_id, display_name, lock_at, status from matchweeks
    where league_id = ${league.id}
      and status = 'upcoming'
      and exists(
        select 1 from fixtures f
        where f.matchweek_id = matchweeks.id
          and f.kickoff_at >= now()
          and f.status = 'scheduled'
      )
    order by (
      select min(f.kickoff_at) from fixtures f
      where f.matchweek_id = matchweeks.id
        and f.kickoff_at >= now()
        and f.status = 'scheduled'
    ) asc
    limit 1`;
  if (!matchweek) return null;

  const viewerId = userId ?? "";
  const [fixtureRows, pastFixtureRows, specialistRows, participationRows, pickRows, recordRows, followedRows, currentSeasonLeaderboardRows, careerLeaderboardRows] = await Promise.all([
    sqlClient<Array<{ id: string; kickoff_at: Date; home_id: string; home: string; home_code: string; home_logo_url: string | null; away_id: string; away: string; away_code: string; away_logo_url: string | null }>>`
      select f.id, f.kickoff_at, h.id as home_id, h.name as home, h.short_name as home_code, h.logo_url as home_logo_url,
        a.id as away_id, a.name as away, a.short_name as away_code, a.logo_url as away_logo_url
      from fixtures f join teams h on h.id = f.home_team_id join teams a on a.id = f.away_team_id
      where f.matchweek_id = ${matchweek.id}
        and f.kickoff_at >= now()
        and f.status = 'scheduled'
      order by f.kickoff_at`,
    sqlClient<Array<{ matchweek_id: string; display_name: string; kickoff_at: Date; id: string; status: PastMatchweek["fixtures"][number]["status"]; home: string; home_code: string; home_logo_url: string | null; home_score: number | null; away: string; away_code: string; away_logo_url: string | null; away_score: number | null }>>`
      with recent_matchweeks as (
        select mw.id
        from matchweeks mw
        where mw.league_id = ${league.id}
          and mw.season_id = ${matchweek.season_id}
          and exists(select 1 from fixtures f where f.matchweek_id = mw.id and f.kickoff_at < now())
          and not exists(select 1 from fixtures f where f.matchweek_id = mw.id and f.kickoff_at >= now())
        order by mw.start_at desc
        limit 8
      )
      select mw.id as matchweek_id, mw.display_name, f.kickoff_at, f.id, f.status,
        h.name as home, h.short_name as home_code, h.logo_url as home_logo_url, f.home_score,
        a.name as away, a.short_name as away_code, a.logo_url as away_logo_url, f.away_score
      from matchweeks mw
      join fixtures f on f.matchweek_id = mw.id
      join teams h on h.id = f.home_team_id
      join teams a on a.id = f.away_team_id
      where mw.id in (select id from recent_matchweeks)
      order by mw.start_at desc, f.kickoff_at`,
    sqlClient<Array<{ id: string; name: string; wins: number; losses: number; settled_picks: number; followers: number; lock: string; source_pick_id: string }>>`
      select u.id, u.name, r.wins, r.losses, r.settled_picks,
        (select count(*)::int from league_follows lf where lf.specialist_user_id = u.id and lf.league_id = ${league.id}) as followers,
        t.name as lock, p.id as source_pick_id
      from user_league_records r
      join "user" u on u.id = r.user_id
      join picks p on p.user_id = r.user_id and p.league_id = r.league_id and p.matchweek_id = ${matchweek.id}
      join teams t on t.id = p.selected_team_id
      where r.league_id = ${league.id} and r.settled_picks >= ${MINIMUM_SETTLED_PICKS_FOR_RANK} and u.id <> ${viewerId}
      order by r.confidence_adjusted_accuracy desc nulls last, r.settled_picks desc limit 10`,
    sqlClient<Array<{ mode: "independent" | "follow"; expert_picks_revealed_at: Date | null }>>`
      select mode, expert_picks_revealed_at from matchweek_participation
      where user_id = ${viewerId} and league_id = ${league.id} and matchweek_id = ${matchweek.id} limit 1`,
    sqlClient<Array<{ team: string }>>`
      select t.name as team from picks p join teams t on t.id = p.selected_team_id
      where p.user_id = ${viewerId} and p.league_id = ${league.id} and p.matchweek_id = ${matchweek.id} limit 1`,
    sqlClient<Array<{ wins: number; losses: number; tier: string }>>`
      select wins, losses, tier from user_league_records where user_id = ${viewerId} and league_id = ${league.id} limit 1`,
    sqlClient<Array<{ source_pick_id: string }>>`
      select source_pick_id from followed_picks where follower_user_id = ${viewerId} and league_id = ${league.id} and matchweek_id = ${matchweek.id} limit 1`,
    sqlClient<Array<{ id: string; name: string; wins: number; losses: number; settled_picks: number; current_win_streak: number; confidence_adjusted_accuracy: string }>>`
      select u.id, u.name, record.wins, record.losses, record.settled_picks, record.current_win_streak, record.confidence_adjusted_accuracy
      from user_league_season_records record
      join "user" u on u.id = record.user_id
      where record.league_id = ${league.id} and record.season_id = ${matchweek.season_id} and record.settled_picks >= ${MINIMUM_SETTLED_PICKS_FOR_RANK}
      order by record.confidence_adjusted_accuracy desc nulls last, record.wins::numeric / nullif(record.wins + record.losses, 0) desc nulls last, record.settled_picks desc, record.last_settled_at asc nulls last, u.name asc
      limit 50`,
    sqlClient<Array<{ id: string; name: string; wins: number; losses: number; settled_picks: number; current_win_streak: number; confidence_adjusted_accuracy: string }>>`
      select u.id, u.name, record.wins, record.losses, record.settled_picks, record.current_win_streak, record.confidence_adjusted_accuracy
      from user_league_records record
      join "user" u on u.id = record.user_id
      where record.league_id = ${league.id} and record.settled_picks >= ${MINIMUM_SETTLED_PICKS_FOR_RANK}
      order by record.confidence_adjusted_accuracy desc nulls last, record.wins::numeric / nullif(record.wins + record.losses, 0) desc nulls last, record.settled_picks desc, record.last_settled_at asc nulls last, u.name asc
      limit 50`,
  ]);

  const participation = participationRows[0];
  const record = recordRows[0];
  const lockedByTime = matchweek.status !== "upcoming" || new Date(matchweek.lock_at) <= new Date();
  const pastMatchweeks = new Map<string, PastMatchweek>();
  for (const fixture of pastFixtureRows) {
    const matchweekHistory = pastMatchweeks.get(fixture.matchweek_id) ?? {
      id: fixture.matchweek_id,
      displayName: fixture.display_name,
      fixtures: [],
    };
    matchweekHistory.fixtures.push({
      id: fixture.id,
      home: fixture.home,
      homeCode: fixture.home_code,
      homeLogoUrl: fixture.home_logo_url,
      homeScore: fixture.home_score,
      away: fixture.away,
      awayCode: fixture.away_code,
      awayLogoUrl: fixture.away_logo_url,
      awayScore: fixture.away_score,
      status: fixture.status,
    });
    pastMatchweeks.set(fixture.matchweek_id, matchweekHistory);
  }

  return {
    league: { id: league.id, slug: league.slug, name: league.name, shortName: league.short_name, country: league.country, countryCode: league.country_code },
    matchweek: { id: matchweek.id, seasonId: matchweek.season_id, displayName: matchweek.display_name, lockAt: new Date(matchweek.lock_at).toISOString(), status: matchweek.status },
    fixtures: fixtureRows.map((fixture) => ({
      id: fixture.id, home: fixture.home, homeCode: fixture.home_code, homeLogoUrl: fixture.home_logo_url, homeTeamId: fixture.home_id,
      away: fixture.away, awayCode: fixture.away_code, awayLogoUrl: fixture.away_logo_url, awayTeamId: fixture.away_id,
      kickoffDate: new Intl.DateTimeFormat("en", { weekday: "long", month: "long", day: "numeric", timeZone: "UTC" }).format(new Date(fixture.kickoff_at)),
      kickoff: new Intl.DateTimeFormat("en", { hour: "2-digit", minute: "2-digit", timeZone: "UTC", timeZoneName: "short" }).format(new Date(fixture.kickoff_at)),
    })),
    pastMatchweeks: [...pastMatchweeks.values()],
    specialists: specialistRows.map((specialist) => ({
      id: specialist.id,
      name: specialist.name,
      initials: specialist.name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase(),
      accuracy: Number(((specialist.wins / (specialist.wins + specialist.losses)) * 100).toFixed(1)),
      record: `${specialist.wins}–${specialist.losses}`,
      picks: specialist.settled_picks,
      followers: specialist.followers,
      lock: specialist.lock,
      sourcePickId: specialist.source_pick_id,
    })),
    leaderboard: {
      currentSeason: currentSeasonLeaderboardRows.map((entry) => ({
        id: entry.id, name: entry.name, wins: entry.wins, losses: entry.losses,
        settledPicks: entry.settled_picks, currentWinStreak: entry.current_win_streak,
        confidenceAdjustedAccuracy: Number(entry.confidence_adjusted_accuracy),
      })),
      career: careerLeaderboardRows.map((entry) => ({
        id: entry.id, name: entry.name, wins: entry.wins, losses: entry.losses,
        settledPicks: entry.settled_picks, currentWinStreak: entry.current_win_streak,
        confidenceAdjustedAccuracy: Number(entry.confidence_adjusted_accuracy),
      })),
    },
    viewer: {
      authenticated: Boolean(userId),
      mode: participation?.mode ?? null,
      picksRevealed: lockedByTime || Boolean(participation?.expert_picks_revealed_at),
      lockedTeam: pickRows[0]?.team ?? null,
      followedSourcePickId: followedRows[0]?.source_pick_id ?? null,
      wins: record?.wins ?? 0,
      losses: record?.losses ?? 0,
      tier: record?.tier ?? "Provisional",
    },
  };
}

export const getMatchweekHistory = cache(async function getMatchweekHistory(
  slug: string,
  matchweekId: string,
): Promise<MatchweekHistoryData | null> {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(matchweekId)) {
    return null;
  }

  const [matchweek] = await sqlClient<Array<{
    id: string;
    display_name: string;
    league_slug: string;
    league_name: string;
    country: string;
  }>>`
    select mw.id, mw.display_name, l.slug as league_slug, l.name as league_name, c.name as country
    from matchweeks mw
    join leagues l on l.id = mw.league_id
    join countries c on c.id = l.country_id
    where mw.id = ${matchweekId}
      and l.slug = ${slug}
      and l.enabled = true
      and mw.end_at < now()
    limit 1`;
  if (!matchweek) return null;

  const [fixtureRows, summaryRows, teamVoteRows, lockRows] = await Promise.all([
    sqlClient<Array<{
      id: string;
      status: MatchweekHistoryData["fixtures"][number]["status"];
      home: string;
      home_logo_url: string | null;
      home_score: number | null;
      away: string;
      away_logo_url: string | null;
      away_score: number | null;
    }>>`
      select f.id, f.status, h.name as home, h.logo_url as home_logo_url, f.home_score,
        a.name as away, a.logo_url as away_logo_url, f.away_score
      from fixtures f
      join teams h on h.id = f.home_team_id
      join teams a on a.id = f.away_team_id
      where f.matchweek_id = ${matchweek.id}
      order by f.kickoff_at`,
    sqlClient<Array<{
      total_locks: number;
      contributors: number;
      correct_locks: number;
      settled_locks: number;
      followed_calls: number;
    }>>`
      select count(p.id)::int as total_locks,
        count(distinct p.user_id)::int as contributors,
        count(p.id) filter (where p.result = 'win')::int as correct_locks,
        count(p.id) filter (where p.result in ('win', 'loss'))::int as settled_locks,
        (select count(*)::int from followed_picks fp where fp.matchweek_id = ${matchweek.id}) as followed_calls
      from picks p
      where p.matchweek_id = ${matchweek.id}`,
    sqlClient<Array<{ id: string; name: string; logo_url: string | null; votes: number; wins: number }>>`
      select t.id, t.name, t.logo_url, count(p.id)::int as votes,
        count(p.id) filter (where p.result = 'win')::int as wins
      from picks p
      join teams t on t.id = p.selected_team_id
      where p.matchweek_id = ${matchweek.id}
      group by t.id, t.name, t.logo_url
      order by votes desc, t.name`,
    sqlClient<Array<{
      id: string;
      specialist_id: string;
      specialist: string;
      team: string;
      team_logo_url: string | null;
      home: string;
      away: string;
      result: MatchweekHistoryData["locks"][number]["result"];
    }>>`
      select p.id, u.id as specialist_id, u.name as specialist, t.name as team, t.logo_url as team_logo_url,
        h.name as home, a.name as away, p.result
      from picks p
      join "user" u on u.id = p.user_id
      join teams t on t.id = p.selected_team_id
      join fixtures f on f.id = p.fixture_id
      join teams h on h.id = f.home_team_id
      join teams a on a.id = f.away_team_id
      where p.matchweek_id = ${matchweek.id}
      order by case p.result when 'win' then 0 when 'pending' then 1 when 'void' then 2 else 3 end, p.submitted_at asc`,
  ]);

  const summary = summaryRows[0] ?? {
    total_locks: 0,
    contributors: 0,
    correct_locks: 0,
    settled_locks: 0,
    followed_calls: 0,
  };

  return {
    league: { slug: matchweek.league_slug, name: matchweek.league_name, country: matchweek.country },
    matchweek: { id: matchweek.id, displayName: matchweek.display_name },
    fixtures: fixtureRows.map((fixture) => ({
      id: fixture.id,
      status: fixture.status,
      home: fixture.home,
      homeLogoUrl: fixture.home_logo_url,
      homeScore: fixture.home_score,
      away: fixture.away,
      awayLogoUrl: fixture.away_logo_url,
      awayScore: fixture.away_score,
    })),
    summary: {
      totalLocks: summary.total_locks,
      contributors: summary.contributors,
      correctLocks: summary.correct_locks,
      settledLocks: summary.settled_locks,
      followedCalls: summary.followed_calls,
    },
    teamVotes: teamVoteRows.map((team) => ({
      id: team.id,
      name: team.name,
      logoUrl: team.logo_url,
      votes: team.votes,
      wins: team.wins,
    })),
    locks: lockRows.map((lock) => ({
      id: lock.id,
      specialistId: lock.specialist_id,
      specialist: lock.specialist,
      initials: lock.specialist.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase(),
      team: lock.team,
      teamLogoUrl: lock.team_logo_url,
      fixture: `${lock.home} vs ${lock.away}`,
      result: lock.result,
    })),
  };
});


export type LeagueStanding = { position: number; team: string; teamSlug: string; logoUrl: string | null; played: number; wins: number; draws: number; losses: number; goalsFor: number; goalsAgainst: number; goalDifference: number; points: number };

export async function getLeagueStandings(slug: string): Promise<{ league: { name: string; slug: string; logoUrl: string | null }; standings: LeagueStanding[] } | null> {
  const [league] = await sqlClient<Array<{ id: string; name: string; slug: string; logo_url: string | null }>>`
    select l.id, l.name, l.slug, l.logo_url
    from leagues l
    where l.slug =  and l.enabled = true
    limit 1`;
  if (!league) return null;

  const rows = await sqlClient<Array<{ team: string; team_slug: string; logo_url: string | null; played: number; wins: number; draws: number; losses: number; goals_for: number; goals_against: number }>>`
    select t.name as team, t.slug as team_slug, t.logo_url,
      count(f.id)::int as played,
      count(*) filter (where f.winner_team_id = t.id)::int as wins,
      count(*) filter (where f.winner_team_id is null)::int as draws,
      count(*) filter (where f.winner_team_id is not null and f.winner_team_id <> t.id)::int as losses,
      coalesce(sum(case when f.home_team_id = t.id then f.home_score else f.away_score end), 0)::int as goals_for,
      coalesce(sum(case when f.home_team_id = t.id then f.away_score else f.home_score end), 0)::int as goals_against
    from league_team_memberships membership
    join seasons s on s.id = membership.season_id and s.is_current = true
    join teams t on t.id = membership.team_id
    left join fixtures f on f.season_id = s.id and f.league_id = 
      and f.status = 'finished' and (f.home_team_id = t.id or f.away_team_id = t.id)
    where membership.league_id = 
    group by t.id, t.name, t.slug, t.logo_url
    order by (count(*) filter (where f.winner_team_id = t.id) * 3 + count(*) filter (where f.winner_team_id is null)) desc,
      (coalesce(sum(case when f.home_team_id = t.id then f.home_score else f.away_score end), 0) - coalesce(sum(case when f.home_team_id = t.id then f.away_score else f.home_score end), 0)) desc,
      coalesce(sum(case when f.home_team_id = t.id then f.home_score else f.away_score end), 0) desc, t.name`;

  return {
    league: { name: league.name, slug: league.slug, logoUrl: league.logo_url },
    standings: rows.map((row, index) => ({
      position: index + 1, team: row.team, teamSlug: row.team_slug, logoUrl: row.logo_url, played: row.played,
      wins: row.wins, draws: row.draws, losses: row.losses, goalsFor: row.goals_for, goalsAgainst: row.goals_against,
      goalDifference: row.goals_for - row.goals_against, points: row.wins * 3 + row.draws,
    })),
  };
}