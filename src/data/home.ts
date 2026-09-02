import "server-only";

import { sqlClient } from "@/db";

export type HomeLeague = {
  name: string;
  shortName: string;
  slug: string;
  logoUrl: string | null;
  homeTeam: string | null;
  awayTeam: string | null;
};

export type HomeSpecialist = {
  userId: string;
  handle: string | null;
  name: string;
  league: string;
  leagueSlug: string;
  wins: number;
  settledPicks: number;
  accuracy: number;
  streak: number;
};

export type HomeResult = {
  specialist: string;
  league: string;
  team: string;
  result: "win" | "loss" | "void";
  settledAt: Date | null;
};

export type HomeData = {
  stats: { members: number; leagues: number; settledLocks: number; activeLocks: number };
  leagues: HomeLeague[];
  specialists: HomeSpecialist[];
  recentResults: HomeResult[];
  nextDeadline: { league: string; matchweek: string; lockAt: Date } | null;
};

export type MemberHomeData = {
  club: { name: string; slug: string; logoUrl: string | null } | null;
  activeLock: { team: string; opponent: string; league: string; kickoffAt: string } | null;
  nextDeadline: { league: string; slug: string; lockAt: string } | null;
  followedSpecialists: number;
};

export async function getMemberHome(userId: string): Promise<MemberHomeData> {
  const [clubRows, lockRows, deadlineRows, followRows] = await Promise.all([
    sqlClient<Array<{ name: string; slug: string; logo_url: string | null }>>`select t.name,t.slug,t.logo_url from "user" u join teams t on t.id=u.primary_team_id where u.id=${userId}`,
    sqlClient<Array<{ team: string; opponent: string; league: string; kickoff_at: string }>>`select st.name team,case when st.id=f.home_team_id then at.name else ht.name end opponent,l.name league,f.kickoff_at::text from picks p join fixtures f on f.id=p.fixture_id join teams st on st.id=p.selected_team_id join teams ht on ht.id=f.home_team_id join teams at on at.id=f.away_team_id join leagues l on l.id=p.league_id where p.user_id=${userId} and p.result='pending' order by f.kickoff_at limit 1`,
    sqlClient<Array<{ league: string; slug: string; lock_at: string }>>`select l.name league,l.slug,m.lock_at::text from user_league_preferences pref join leagues l on l.id=pref.league_id join matchweeks m on m.league_id=l.id where pref.user_id=${userId} and pref.kind='know' and m.status='upcoming' and m.lock_at>now() order by m.lock_at limit 1`,
    sqlClient<Array<{ count: number }>>`select count(*)::int count from league_follows where follower_user_id=${userId}`,
  ]);
  const club=clubRows[0],lock=lockRows[0],deadline=deadlineRows[0];
  return {club:club?{name:club.name,slug:club.slug,logoUrl:club.logo_url}:null,activeLock:lock?{team:lock.team,opponent:lock.opponent,league:lock.league,kickoffAt:lock.kickoff_at}:null,nextDeadline:deadline?{league:deadline.league,slug:deadline.slug,lockAt:deadline.lock_at}:null,followedSpecialists:followRows[0]?.count??0};
}

export async function getHomeData(): Promise<HomeData> {
  const [statsRows, leagueRows, specialistRows, resultRows, deadlineRows] = await Promise.all([
    sqlClient<Array<{ members: number; leagues: number; settled_locks: number; active_locks: number }>>`
      select
        (select count(*)::int from "user") as members,
        (select count(*)::int from leagues where enabled = true) as leagues,
        (select count(*)::int from picks where result <> 'pending') as settled_locks,
        (select count(*)::int from picks where result = 'pending') as active_locks
    `,
    sqlClient<Array<HomeLeague & { home_team: string | null; away_team: string | null; logo_url: string | null; short_name: string }>>`
      select l.name, l.short_name, l.slug, l.logo_url,
        fixture.home_team, fixture.away_team
      from leagues l
      left join lateral (
        select ht.name as home_team, at.name as away_team
        from fixtures f
        join teams ht on ht.id = f.home_team_id
        join teams at on at.id = f.away_team_id
        where f.league_id = l.id and f.status = 'scheduled' and f.kickoff_at > now()
        order by f.kickoff_at asc limit 1
      ) fixture on true
      where l.enabled = true
      order by l.priority desc, l.name asc
    `,
    sqlClient<Array<{ user_id: string; handle: string | null; name: string; league: string; league_slug: string; wins: number; settled_picks: number; current_win_streak: number }>>`
      select r.user_id, u.username as handle, u.name, l.name as league, l.slug as league_slug,
        r.wins, r.settled_picks, r.current_win_streak
      from user_league_records r
      join "user" u on u.id = r.user_id
      join leagues l on l.id = r.league_id
      where r.settled_picks > 0
      order by (r.wins::numeric / nullif(r.settled_picks, 0)) desc, r.settled_picks desc
      limit 4
    `,
    sqlClient<Array<{ specialist: string; league: string; team: string; result: "win" | "loss" | "void"; settled_at: Date | null }>>`
      select u.name as specialist, l.short_name as league, t.name as team, p.result, p.settled_at
      from picks p
      join "user" u on u.id = p.user_id
      join leagues l on l.id = p.league_id
      join teams t on t.id = p.selected_team_id
      where p.result <> 'pending'
      order by p.settled_at desc nulls last limit 6
    `,
    sqlClient<Array<{ league: string; matchweek: string; lock_at: Date }>>`
      select l.name as league, m.display_name as matchweek, m.lock_at
      from matchweeks m join leagues l on l.id = m.league_id
      where l.enabled = true and m.status = 'upcoming' and m.lock_at > now()
      order by m.lock_at asc limit 1
    `,
  ]);

  const stats = statsRows[0] ?? { members: 0, leagues: 0, settled_locks: 0, active_locks: 0 };
  return {
    stats: {
      members: stats.members,
      leagues: stats.leagues,
      settledLocks: stats.settled_locks,
      activeLocks: stats.active_locks,
    },
    leagues: leagueRows.map((row) => ({
      name: row.name,
      shortName: row.short_name,
      slug: row.slug,
      logoUrl: row.logo_url,
      homeTeam: row.home_team,
      awayTeam: row.away_team,
    })),
    specialists: specialistRows.map((row) => ({
      userId: row.user_id,
      handle: row.handle,
      name: row.name,
      league: row.league,
      leagueSlug: row.league_slug,
      wins: row.wins,
      settledPicks: row.settled_picks,
      accuracy: Math.round((row.wins / row.settled_picks) * 1000) / 10,
      streak: row.current_win_streak,
    })),
    recentResults: resultRows.map((row) => ({
      specialist: row.specialist,
      league: row.league,
      team: row.team,
      result: row.result,
      settledAt: row.settled_at,
    })),
    nextDeadline: deadlineRows[0]
      ? {
          league: deadlineRows[0].league,
          matchweek: deadlineRows[0].matchweek.includes(":") ? "Current matchweek" : deadlineRows[0].matchweek,
          lockAt: new Date(deadlineRows[0].lock_at),
        }
      : null,
  };
}
