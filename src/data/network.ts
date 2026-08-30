import "server-only";

import { cache } from "react";

import { sqlClient } from "@/db";
import { MINIMUM_SETTLED_PICKS_FOR_RANK } from "@/lib/reputation";

export type NetworkSpecialist = {
  id: string;
  name: string;
  initials: string;
  wins: number;
  losses: number;
  settledPicks: number;
  adjustedAccuracy: number;
  followers: number;
  rankable: boolean;
};

export type NetworkLeague = {
  id: string;
  name: string;
  slug: string;
  kind: "know" | "help" | "followed";
  enabled: boolean;
  followed: NetworkSpecialist[];
  alternatives: NetworkSpecialist[];
};

export type NetworkHubData = {
  leagues: NetworkLeague[];
  summary: { known: number; help: number; followed: number; attention: number };
};

type LeagueRow = { id: string; name: string; slug: string; enabled: boolean; kind: "know" | "help" | null };
type SpecialistRow = {
  league_id: string;
  id: string;
  name: string;
  wins: number;
  losses: number;
  settled_picks: number;
  adjusted_accuracy: string | null;
  followers: number;
};

function mapSpecialist(row: SpecialistRow): NetworkSpecialist {
  return {
    id: row.id,
    name: row.name,
    initials: row.name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase(),
    wins: row.wins,
    losses: row.losses,
    settledPicks: row.settled_picks,
    adjustedAccuracy: Number(row.adjusted_accuracy ?? 0),
    followers: row.followers,
    rankable: row.settled_picks >= MINIMUM_SETTLED_PICKS_FOR_RANK,
  };
}

export const getNetworkHub = cache(async (userId: string): Promise<NetworkHubData> => {
  const [leagueRows, followRows, alternativeRows] = await Promise.all([
    sqlClient<LeagueRow[]>`
      select distinct l.id, l.name, l.slug, l.enabled, p.kind
      from leagues l
      left join user_league_preferences p on p.league_id = l.id and p.user_id = ${userId}
      left join league_follows f on f.league_id = l.id and f.follower_user_id = ${userId}
      where p.user_id is not null or f.follower_user_id is not null
      order by l.name`,
    sqlClient<SpecialistRow[]>`
      select f.league_id, u.id, u.name, coalesce(r.wins, 0)::int wins,
        coalesce(r.losses, 0)::int losses, coalesce(r.settled_picks, 0)::int settled_picks,
        r.confidence_adjusted_accuracy::text adjusted_accuracy,
        (select count(*)::int from league_follows all_follows where all_follows.specialist_user_id = u.id and all_follows.league_id = f.league_id) followers
      from league_follows f
      join "user" u on u.id = f.specialist_user_id
      left join user_league_records r on r.user_id = u.id and r.league_id = f.league_id
      where f.follower_user_id = ${userId}
      order by u.name`,
    sqlClient<(SpecialistRow & { rank: number })[]>`
      with candidates as (
        select l.id league_id, u.id, u.name, r.wins, r.losses, r.settled_picks,
          r.confidence_adjusted_accuracy::text adjusted_accuracy,
          (select count(*)::int from league_follows f where f.specialist_user_id = u.id and f.league_id = l.id) followers,
          row_number() over (partition by l.id order by r.confidence_adjusted_accuracy desc nulls last, r.settled_picks desc, r.last_settled_at asc) rank
        from leagues l
        join user_league_records r on r.league_id = l.id
        join "user" u on u.id = r.user_id
        where l.enabled = true and r.user_id <> ${userId}
          and r.settled_picks >= ${MINIMUM_SETTLED_PICKS_FOR_RANK}
          and (exists(select 1 from user_league_preferences p where p.user_id = ${userId} and p.league_id = l.id)
            or exists(select 1 from league_follows f where f.follower_user_id = ${userId} and f.league_id = l.id))
          and not exists(select 1 from league_follows f where f.follower_user_id = ${userId} and f.specialist_user_id = u.id and f.league_id = l.id)
      ) select * from candidates where rank <= 3 order by league_id, rank`,
  ]);

  const followsByLeague = Map.groupBy(followRows, (row) => row.league_id);
  const alternativesByLeague = Map.groupBy(alternativeRows, (row) => row.league_id);
  const leagues: NetworkLeague[] = leagueRows.map((league) => ({
    id: league.id,
    name: league.name,
    slug: league.slug,
    enabled: league.enabled,
    kind: league.kind ?? ("followed" as const),
    followed: (followsByLeague.get(league.id) ?? []).map(mapSpecialist),
    alternatives: (alternativesByLeague.get(league.id) ?? []).map(mapSpecialist),
  }));
  const followed = leagues.reduce((total, league) => total + league.followed.length, 0);
  const attention = leagues.reduce((total, league) => total + league.followed.filter((specialist) => !league.enabled || !specialist.rankable).length, 0);
  return {
    leagues,
    summary: {
      known: leagues.filter((league) => league.kind === "know").length,
      help: leagues.filter((league) => league.kind === "help").length,
      followed,
      attention,
    },
  };
});
