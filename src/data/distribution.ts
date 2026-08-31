import "server-only";

import { randomBytes } from "node:crypto";
import { cache } from "react";

import { sqlClient } from "@/db";

export type CommunityIdentity = {
  teamId: string | null;
  teamName: string | null;
  teamSlug: string | null;
  teamLogoUrl: string | null;
  region: string | null;
  role: "member" | "founding_member" | "captain";
};

export type IdentityTeam = {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  leagueName: string;
  leagueSlug: string;
  country: string;
};

export const getCommunityIdentity = cache(async (userId: string): Promise<CommunityIdentity> => {
  const [row] = await sqlClient<Array<{
    primary_team_id: string | null; team_name: string | null; team_slug: string | null;
    team_logo_url: string | null; home_region: string | null; community_role: CommunityIdentity["role"];
  }>>`
    select u.primary_team_id, t.name team_name, t.slug team_slug, t.logo_url team_logo_url,
      u.home_region, u.community_role
    from "user" u left join teams t on t.id = u.primary_team_id
    where u.id = ${userId}`;
  return {
    teamId: row?.primary_team_id ?? null,
    teamName: row?.team_name ?? null,
    teamSlug: row?.team_slug ?? null,
    teamLogoUrl: row?.team_logo_url ?? null,
    region: row?.home_region ?? null,
    role: row?.community_role ?? "member",
  };
});

export const getIdentityTeams = cache(async (): Promise<IdentityTeam[]> => {
  return sqlClient<IdentityTeam[]>`
    select distinct on (t.id) t.id, t.name, t.slug, t.logo_url "logoUrl",
      l.name "leagueName", l.slug "leagueSlug", c.name country
    from teams t
    join league_team_memberships ltm on ltm.team_id = t.id
    join leagues l on l.id = ltm.league_id and l.enabled = true
    join countries c on c.id = l.country_id
    order by t.id, l.priority, l.name, t.name`;
});

export async function ensureReferralCode(userId: string) {
  const [existing] = await sqlClient<Array<{ referral_code: string | null }>>`
    select referral_code from "user" where id = ${userId}`;
  if (existing?.referral_code) return existing.referral_code;

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const code = `LC${randomBytes(5).toString("hex").toUpperCase()}`;
    const [created] = await sqlClient<Array<{ referral_code: string }>>`
      update "user" set referral_code = ${code}, updated_at = now()
      where id = ${userId} and referral_code is null
      returning referral_code`;
    if (created) return created.referral_code;
    const [current] = await sqlClient<Array<{ referral_code: string | null }>>`
      select referral_code from "user" where id = ${userId}`;
    if (current?.referral_code) return current.referral_code;
  }
  throw new Error("Could not create a referral code.");
}

export type ReferralDashboard = {
  code: string;
  total: number;
  activated: number;
  members: Array<{ id: string; name: string; joinedAt: string; activatedAt: string | null; locks: number; teamName: string | null }>;
};

export async function getReferralDashboard(userId: string): Promise<ReferralDashboard> {
  const code = await ensureReferralCode(userId);
  const members = await sqlClient<ReferralDashboard["members"]>`
    select u.id, u.name, r.created_at::text "joinedAt", r.activated_at::text "activatedAt",
      count(p.id)::int locks, t.name "teamName"
    from referrals r
    join "user" u on u.id = r.invited_user_id
    left join teams t on t.id = u.primary_team_id
    left join picks p on p.user_id = u.id
    where r.inviter_user_id = ${userId}
    group by u.id, u.name, r.created_at, r.activated_at, t.name
    order by r.created_at desc`;
  return { code, total: members.length, activated: members.filter((member) => member.activatedAt).length, members };
}

export type CommunityChallenge = {
  id: string;
  league: { name: string; slug: string };
  kickoffAt: string;
  status: string;
  home: ChallengeSide;
  away: ChallengeSide;
  recentCalls: Array<{ id: string; supporter: string; team: string; result: string; reason: string | null; settledAt: string | null }>;
};

type ChallengeSide = {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  supporters: number;
  locks: number;
  wins: number;
  losses: number;
};

export async function getCommunityChallenge(fixtureId?: string): Promise<CommunityChallenge | null> {
  const rows = await sqlClient<Array<{
    id: string; kickoff_at: string; status: string; league_name: string; league_slug: string;
    home_id: string; home_name: string; home_slug: string; home_logo: string | null;
    away_id: string; away_name: string; away_slug: string; away_logo: string | null;
  }>>`
    select f.id, f.kickoff_at::text, f.status, l.name league_name, l.slug league_slug,
      h.id home_id, h.name home_name, h.slug home_slug, h.logo_url home_logo,
      a.id away_id, a.name away_name, a.slug away_slug, a.logo_url away_logo
    from fixtures f join leagues l on l.id = f.league_id
    join teams h on h.id = f.home_team_id join teams a on a.id = f.away_team_id
    where l.enabled = true and (${fixtureId ?? null}::uuid is null or f.id = ${fixtureId ?? null}::uuid)
      and (${fixtureId ?? null}::uuid is not null or (f.status = 'scheduled' and f.kickoff_at > now()))
    order by f.kickoff_at asc limit 1`;
  const fixture = rows[0];
  if (!fixture) return null;

  const sideRows = await sqlClient<Array<{ team_id: string; supporters: number; locks: number; wins: number; losses: number }>>`
    select side.team_id,
      count(distinct u.id)::int supporters,
      count(distinct p.id)::int locks,
      count(distinct p.id) filter (where p.result = 'win')::int wins,
      count(distinct p.id) filter (where p.result = 'loss')::int losses
    from (values (${fixture.home_id}::uuid), (${fixture.away_id}::uuid)) side(team_id)
    left join "user" u on u.primary_team_id = side.team_id
    left join picks p on p.user_id = u.id
    group by side.team_id`;
  const stats = new Map(sideRows.map((row) => [row.team_id, row]));
  const makeSide = (prefix: "home" | "away"): ChallengeSide => {
    const id = fixture[`${prefix}_id`];
    const row = stats.get(id);
    return {
      id, name: fixture[`${prefix}_name`], slug: fixture[`${prefix}_slug`], logoUrl: fixture[`${prefix}_logo`],
      supporters: row?.supporters ?? 0, locks: row?.locks ?? 0, wins: row?.wins ?? 0, losses: row?.losses ?? 0,
    };
  };
  const recentCalls = await sqlClient<CommunityChallenge["recentCalls"]>`
    select p.id, u.name supporter, st.name team, p.result, p.decision_reason reason, p.settled_at::text "settledAt"
    from picks p join "user" u on u.id = p.user_id join teams st on st.id = p.selected_team_id
    where u.primary_team_id in (${fixture.home_id}, ${fixture.away_id}) and p.result <> 'pending'
    order by p.settled_at desc nulls last limit 12`;
  return {
    id: fixture.id, league: { name: fixture.league_name, slug: fixture.league_slug }, kickoffAt: fixture.kickoff_at,
    status: fixture.status, home: makeSide("home"), away: makeSide("away"), recentCalls,
  };
}

export type WeeklyRecap = {
  from: string;
  to: string;
  totals: { locks: number; wins: number; losses: number; specialists: number };
  leagues: Array<{ name: string; slug: string; locks: number; wins: number; losses: number; accuracy: number }>;
  calls: Array<{ id: string; supporter: string; league: string; leagueSlug: string; team: string; result: string; reason: string | null }>;
};

export async function getWeeklyRecap(): Promise<WeeklyRecap> {
  const [range] = await sqlClient<Array<{ from_date: string; to_date: string }>>`
    select (current_date - interval '7 days')::date::text from_date, current_date::text to_date`;
  const [totals] = await sqlClient<Array<{ locks: number; wins: number; losses: number; specialists: number }>>`
    select count(*)::int locks, count(*) filter (where result='win')::int wins,
      count(*) filter (where result='loss')::int losses, count(distinct user_id)::int specialists
    from picks where submitted_at >= current_date - interval '7 days'`;
  const leagues = await sqlClient<WeeklyRecap["leagues"]>`
    select l.name, l.slug, count(*)::int locks,
      count(*) filter (where p.result='win')::int wins,
      count(*) filter (where p.result='loss')::int losses,
      coalesce(round(100.0 * count(*) filter (where p.result='win') / nullif(count(*) filter (where p.result in ('win','loss')),0)),0)::int accuracy
    from picks p join leagues l on l.id=p.league_id
    where p.submitted_at >= current_date - interval '7 days'
    group by l.id, l.name, l.slug order by accuracy desc, locks desc limit 10`;
  const calls = await sqlClient<WeeklyRecap["calls"]>`
    select p.id, u.name supporter, l.name league, l.slug "leagueSlug", t.name team, p.result, p.decision_reason reason
    from picks p join "user" u on u.id=p.user_id join leagues l on l.id=p.league_id join teams t on t.id=p.selected_team_id
    where p.submitted_at >= current_date - interval '7 days' and p.result <> 'pending'
    order by p.settled_at desc nulls last limit 20`;
  return { from: range.from_date, to: range.to_date, totals: totals ?? { locks: 0, wins: 0, losses: 0, specialists: 0 }, leagues, calls };
}

export type DistributionAnalytics = {
  funnel: { visits: null; joins: number; activated: number; returned: number };
  sources: Array<{ source: string; joins: number; activated: number; returned: number; activationRate: number }>;
  communities: Array<{ name: string; slug: string; members: number; active: number; locks: number }>;
};

export async function getDistributionAnalytics(): Promise<DistributionAnalytics> {
  const [funnel] = await sqlClient<Array<{ joins: number; activated: number; returned: number }>>`
    select count(*)::int joins,
      count(*) filter (where exists(select 1 from picks p where p.user_id=u.id))::int activated,
      count(*) filter (where (select count(distinct p.match_date) from picks p where p.user_id=u.id) >= 2)::int returned
    from "user" u where u.role='member'`;
  const sources = await sqlClient<DistributionAnalytics["sources"]>`
    select coalesce(nullif(u.acquisition_source,''),'direct') source, count(*)::int joins,
      count(*) filter (where exists(select 1 from picks p where p.user_id=u.id))::int activated,
      count(*) filter (where (select count(distinct p.match_date) from picks p where p.user_id=u.id) >= 2)::int returned,
      coalesce(round(100.0 * count(*) filter (where exists(select 1 from picks p where p.user_id=u.id)) / nullif(count(*),0)),0)::int "activationRate"
    from "user" u where u.role='member' group by source order by joins desc`;
  const communities = await sqlClient<DistributionAnalytics["communities"]>`
    select t.name, t.slug, count(distinct u.id)::int members,
      count(distinct u.id) filter (where exists(select 1 from picks px where px.user_id=u.id and px.submitted_at >= current_date-interval '7 days'))::int active,
      count(distinct p.id)::int locks
    from teams t join "user" u on u.primary_team_id=t.id left join picks p on p.user_id=u.id
    group by t.id,t.name,t.slug order by active desc,members desc limit 12`;
  return { funnel: { visits: null, joins: funnel?.joins ?? 0, activated: funnel?.activated ?? 0, returned: funnel?.returned ?? 0 }, sources, communities };
}

export type LeagueCommunitySummary = {
  members: number;
  active: number;
  captains: number;
  locks: number;
  teams: Array<{ name: string; slug: string; members: number }>;
};

export async function getLeagueCommunitySummary(leagueSlug: string): Promise<LeagueCommunitySummary> {
  const [totals] = await sqlClient<Array<{ members: number; active: number; captains: number; locks: number }>>`
    select count(distinct u.id)::int members,
      count(distinct u.id) filter (where exists(select 1 from picks p where p.user_id=u.id and p.submitted_at>=current_date-interval '7 days'))::int active,
      count(distinct u.id) filter (where u.community_role='captain')::int captains,
      count(distinct p.id)::int locks
    from leagues l join league_team_memberships ltm on ltm.league_id=l.id
    left join "user" u on u.primary_team_id=ltm.team_id
    left join picks p on p.user_id=u.id
    where l.slug=${leagueSlug}`;
  const teams = await sqlClient<LeagueCommunitySummary["teams"]>`
    select t.name,t.slug,count(distinct u.id)::int members
    from leagues l join league_team_memberships ltm on ltm.league_id=l.id join teams t on t.id=ltm.team_id
    left join "user" u on u.primary_team_id=t.id where l.slug=${leagueSlug}
    group by t.id,t.name,t.slug having count(distinct u.id)>0 order by members desc,t.name limit 6`;
  return { members: totals?.members ?? 0, active: totals?.active ?? 0, captains: totals?.captains ?? 0, locks: totals?.locks ?? 0, teams };
}
