import "server-only";
import { cache } from "react";
import { sqlClient } from "@/db";
import { toIsoTimestamp } from "@/lib/timestamps";

export const getSeasonArchive = cache(async (userId: string) => {
  const rows = await sqlClient<Array<{ id: string; season: string; league: string; slug: string; wins: number; losses: number; voids: number; settled_picks: number; adjusted: string; current: boolean }>>`
    select r.id, s.name as season, l.name as league, l.slug, r.wins, r.losses, r.voids, r.settled_picks,
      coalesce(r.confidence_adjusted_accuracy,0)::text as adjusted, s.is_current as current
    from user_league_season_records r join seasons s on s.id=r.season_id join leagues l on l.id=r.league_id
    where r.user_id=${userId} order by s.start_date desc,l.name`;
  return rows.map((row) => ({ ...row, adjusted: Number(row.adjusted) }));
});

export const getMatchweekCalendar = cache(async (userId: string) => {
  const rows = await sqlClient<Array<{ id: string; league: string; slug: string; name: string; lock_at: Date | string; start_at: Date | string; end_at: Date | string; status: string; fixtures: number; own_pick: boolean; followed_pick: boolean }>>`
    select mw.id,l.name as league,l.slug,mw.display_name as name,mw.lock_at,mw.start_at,mw.end_at,mw.status,
      (select count(*)::int from fixtures f where f.matchweek_id=mw.id) as fixtures,
      exists(select 1 from picks p where p.matchweek_id=mw.id and p.user_id=${userId}) as own_pick,
      exists(select 1 from followed_picks fp where fp.matchweek_id=mw.id and fp.follower_user_id=${userId}) as followed_pick
    from matchweeks mw join leagues l on l.id=mw.league_id
    where mw.end_at > now()-interval '30 days' and mw.start_at < now()+interval '90 days' and l.enabled=true
    order by mw.lock_at asc limit 80`;
  return rows.map((row) => ({ id: row.id, league: row.league, slug: row.slug, name: row.name, lockAt: toIsoTimestamp(row.lock_at), startAt: toIsoTimestamp(row.start_at), endAt: toIsoTimestamp(row.end_at), status: row.status, fixtures: row.fixtures, ownPick: row.own_pick, followedPick: row.followed_pick }));
});
