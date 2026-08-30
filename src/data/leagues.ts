import "server-only";

import { sqlClient } from "@/db";
import type { League, Region } from "@/lib/league-data";

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
};

export async function getLeagueDirectory(userId?: string): Promise<League[]> {
  const currentUserId = userId ?? "";
  const rows = await sqlClient<DirectoryRow[]>`
    select l.slug, c.name as country, c.code as country_code, c.flag_url, l.name, l.short_name, l.logo_url, l.region,
      (select count(*)::int from user_league_records r where r.league_id = l.id and r.settled_picks >= 10) as specialist_count,
      own.wins, own.losses,
      exists(select 1 from matchweeks mw where mw.league_id = l.id) as has_experience,
      (select count(*)::int from league_follows f where f.follower_user_id = ${currentUserId} and f.league_id = l.id) as followed_count
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
      action: row.slug === "super-lig" ? "Open league" : "Explore league",
      available: row.has_experience,
    };
  });
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
  homeTeamId: string;
  away: string;
  awayCode: string;
  awayTeamId: string;
  kickoff: string;
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

export type LeagueExperienceData = {
  league: { id: string; slug: string; name: string; shortName: string; country: string; countryCode: string };
  matchweek: { id: string; seasonId: string; displayName: string; lockAt: string; status: MatchweekRow["status"] };
  fixtures: DatabaseFixture[];
  specialists: DatabaseSpecialist[];
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
    order by case when status = 'upcoming' then 0 else 1 end, lock_at desc limit 1`;
  if (!matchweek) return null;

  const viewerId = userId ?? "";
  const [fixtureRows, specialistRows, participationRows, pickRows, recordRows, followedRows] = await Promise.all([
    sqlClient<Array<{ id: string; kickoff_at: Date; home_id: string; home: string; home_code: string; away_id: string; away: string; away_code: string }>>`
      select f.id, f.kickoff_at, h.id as home_id, h.name as home, h.short_name as home_code,
        a.id as away_id, a.name as away, a.short_name as away_code
      from fixtures f join teams h on h.id = f.home_team_id join teams a on a.id = f.away_team_id
      where f.matchweek_id = ${matchweek.id} order by f.kickoff_at`,
    sqlClient<Array<{ id: string; name: string; wins: number; losses: number; settled_picks: number; followers: number; lock: string; source_pick_id: string }>>`
      select u.id, u.name, r.wins, r.losses, r.settled_picks,
        (select count(*)::int from league_follows lf where lf.specialist_user_id = u.id and lf.league_id = ${league.id}) as followers,
        t.name as lock, p.id as source_pick_id
      from user_league_records r
      join "user" u on u.id = r.user_id
      join picks p on p.user_id = r.user_id and p.league_id = r.league_id and p.matchweek_id = ${matchweek.id}
      join teams t on t.id = p.selected_team_id
      where r.league_id = ${league.id} and r.settled_picks >= 10 and u.id <> ${viewerId}
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
  ]);

  const participation = participationRows[0];
  const record = recordRows[0];
  const lockedByTime = matchweek.status !== "upcoming" || new Date(matchweek.lock_at) <= new Date();

  return {
    league: { id: league.id, slug: league.slug, name: league.name, shortName: league.short_name, country: league.country, countryCode: league.country_code },
    matchweek: { id: matchweek.id, seasonId: matchweek.season_id, displayName: matchweek.display_name, lockAt: new Date(matchweek.lock_at).toISOString(), status: matchweek.status },
    fixtures: fixtureRows.map((fixture) => ({
      id: fixture.id, home: fixture.home, homeCode: fixture.home_code, homeTeamId: fixture.home_id,
      away: fixture.away, awayCode: fixture.away_code, awayTeamId: fixture.away_id,
      kickoff: new Intl.DateTimeFormat("en", { weekday: "long", hour: "2-digit", minute: "2-digit", timeZone: "UTC" }).format(new Date(fixture.kickoff_at)),
    })),
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
