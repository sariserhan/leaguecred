import "server-only";

import { sqlClient } from "@/db";

export type ProfileLeagueRecord = {
  leagueSlug: string;
  leagueName: string;
  wins: number;
  losses: number;
  settledPicks: number;
  tier: string;
  followerCount: number;
};

export type ProfileFollow = {
  leagueSlug: string;
  leagueName: string;
  specialistId: string;
  specialistName: string;
};

export type UserProfile = {
  id: string;
  name: string;
  memberSince: string;
  totals: { wins: number; losses: number };
  leagueRecords: ProfileLeagueRecord[];
  following: ProfileFollow[];
};

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const [user] = await sqlClient<Array<{ id: string; name: string; created_at: Date }>>`
    select id, name, created_at from "user" where id = ${userId} limit 1`;
  if (!user) return null;

  const [records, following] = await Promise.all([
    sqlClient<Array<{
      league_slug: string; league_name: string; wins: number; losses: number;
      settled_picks: number; tier: string; follower_count: number;
    }>>`
      select l.slug as league_slug, l.name as league_name, r.wins, r.losses, r.settled_picks, r.tier,
        (select count(*)::int from league_follows f where f.specialist_user_id = r.user_id and f.league_id = r.league_id) as follower_count
      from user_league_records r
      join leagues l on l.id = r.league_id
      where r.user_id = ${userId} and r.settled_picks > 0
      order by r.settled_picks desc`,
    sqlClient<Array<{ league_slug: string; league_name: string; specialist_id: string; specialist_name: string }>>`
      select l.slug as league_slug, l.name as league_name, u.id as specialist_id, u.name as specialist_name
      from league_follows lf
      join leagues l on l.id = lf.league_id
      join "user" u on u.id = lf.specialist_user_id
      where lf.follower_user_id = ${userId}
      order by l.name`,
  ]);

  const totals = records.reduce(
    (acc, record) => ({ wins: acc.wins + record.wins, losses: acc.losses + record.losses }),
    { wins: 0, losses: 0 },
  );

  return {
    id: user.id,
    name: user.name,
    memberSince: new Date(user.created_at).toISOString(),
    totals,
    leagueRecords: records.map((record) => ({
      leagueSlug: record.league_slug,
      leagueName: record.league_name,
      wins: record.wins,
      losses: record.losses,
      settledPicks: record.settled_picks,
      tier: record.tier,
      followerCount: record.follower_count,
    })),
    following: following.map((follow) => ({
      leagueSlug: follow.league_slug,
      leagueName: follow.league_name,
      specialistId: follow.specialist_id,
      specialistName: follow.specialist_name,
    })),
  };
}
