import "server-only";

import { cache } from "react";

import { sqlClient } from "@/db";
import { toIsoTimestamp } from "@/lib/timestamps";
import { getRankThreshold } from "@/services/site-settings";

export type SpecialistDirectoryEntry = {
  id: string;
  name: string;
  /** The address this record is linked by. Null only for a member created
   * before handles existed and never migrated, which the backfill leaves none
   * of. */
  handle: string | null;
  initials: string;
  leagueId: string;
  leagueName: string;
  leagueSlug: string;
  wins: number;
  losses: number;
  settledPicks: number;
  currentWinStreak: number;
  confidenceAdjustedAccuracy: number;
  followers: number;
  provisional: boolean;
};

export async function getSpecialistDirectory(): Promise<SpecialistDirectoryEntry[]> {
  const rankThreshold = await getRankThreshold();
  const rows = await sqlClient<Array<{
    id: string; name: string; username: string | null; league_id: string; league_name: string; league_slug: string;
    wins: number; losses: number; settled_picks: number; current_win_streak: number;
    confidence_adjusted_accuracy: string; followers: number;
  }>>`
    select u.id, u.name, u.username, strongest.league_id, strongest.league_name, strongest.league_slug,
      strongest.wins, strongest.losses, strongest.settled_picks, strongest.current_win_streak,
      strongest.confidence_adjusted_accuracy,
      (select count(*)::int from league_follows lf where lf.specialist_user_id = u.id) as followers
    from "user" u
    join lateral (
      select r.league_id, l.name as league_name, l.slug as league_slug, r.wins, r.losses,
        r.settled_picks, r.current_win_streak, r.confidence_adjusted_accuracy
      from user_league_records r join leagues l on l.id = r.league_id
      where r.user_id = u.id and r.settled_picks > 0 and l.enabled = true
      order by (r.settled_picks >= ${rankThreshold}) desc,
        r.confidence_adjusted_accuracy desc nulls last, r.settled_picks desc limit 1
    ) strongest on true
    order by (strongest.settled_picks >= ${rankThreshold}) desc,
      strongest.confidence_adjusted_accuracy desc nulls last, strongest.settled_picks desc
    limit 100`;

  return rows.map((row) => ({
    id: row.id, name: row.name, handle: row.username,
    initials: row.name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase(),
    leagueId: row.league_id, leagueName: row.league_name, leagueSlug: row.league_slug,
    wins: row.wins, losses: row.losses, settledPicks: row.settled_picks,
    currentWinStreak: row.current_win_streak,
    confidenceAdjustedAccuracy: Number(row.confidence_adjusted_accuracy), followers: row.followers,
    provisional: row.settled_picks < rankThreshold,
  }));
}

export type SpecialistProfileData = {
  specialist: { id:string;name:string;handle:string|null;initials:string;followers:number;referrals:number;memberSince:string;bio:string|null;image:string|null;profileTheme:string;featuredLeague:string|null;pinnedMilestone:string|null;teamName:string|null;teamSlug:string|null;communityRole:"member"|"founding_member"|"captain";homeRegion:string|null };
  totals: { wins: number; losses: number; settledPicks: number; bestWinStreak: number };
  leagues: Array<{
    id: string; slug: string; name: string; wins: number; losses: number; settledPicks: number;
    currentWinStreak: number; confidenceAdjustedAccuracy: number; followedByViewer: boolean;
    tier: string; leagueFollowers: number; seasonRank: number | null;
    /** Following is only offered where the record already clears the rank threshold. */
    followable: boolean;
  }>;
  /** Spec section 22 keeps leagues known and leagues followed visibly apart. */
  followedLeagues: Array<{
    id: string; slug: string; name: string; specialistId: string; specialistHandle: string | null; specialistName: string;
  }>;
  recentLocks: Array<{
    id: string; leagueName: string; leagueSlug: string; team: string; result: "win" | "loss" | "void";
    fixture: string; submittedAt: string;
  }>;
  /**
   * Every settled independent lock, oldest first, for the accuracy trend.
   *
   * Separate from recentLocks, which is the twelve most recent across all
   * leagues and is a list rather than a series. Filtering that by league gave a
   * chart of whatever happened to fall inside those twelve, so a league with a
   * long record could show two points or none.
   */
  settledLocks: Array<{ leagueSlug: string; result: "win" | "loss" | "void" }>;
  /** Spec section 23: attributed, and never mixed into the independent record. */
  followedHistory: Array<{
    id: string; leagueName: string; leagueSlug: string; team: string;
    specialistId: string; specialistHandle: string | null; specialistName: string; result: "win" | "loss" | "void" | "pending"; followedAt: string;
  }>;
  viewer: { authenticated: boolean; isSelf: boolean; locksDue: number };
};

/**
 * A profile by handle or by id.
 *
 * The handle is what a profile is linked and shared by now, but ids are in
 * every link already sent, every share card and every crawler's index, so both
 * resolve here and the page redirects an id to the handle.
 */
export const getSpecialistProfile = cache(async function getSpecialistProfile(
  specialistId: string,
  viewerId?: string,
): Promise<SpecialistProfileData | null> {
  const rankThreshold = await getRankThreshold();
  const [specialist] = await sqlClient<Array<{
    id:string;name:string;username:string|null;followers:number;referrals:number;created_at:Date|string;bio:string|null;image:string|null;profile_theme:string;featured_league:string|null;pinned_milestone:string|null;team_name:string|null;team_slug:string|null;community_role:"member"|"founding_member"|"captain";home_region:string|null;
  }>>`
    select u.id,u.name,u.username,u.created_at,u.bio,u.image,u.profile_theme,u.pinned_milestone,l.name as featured_league,
      t.name team_name,t.slug team_slug,u.community_role,u.home_region,
      (select count(*)::int from league_follows lf where lf.specialist_user_id = u.id) as followers
      ,(select count(*)::int from referrals r where r.inviter_user_id=u.id) as referrals
    from "user" u left join leagues l on l.id=u.featured_league_id left join teams t on t.id=u.primary_team_id
    where u.id = ${specialistId} or lower(u.username) = lower(${specialistId})
    limit 1`;
  if (!specialist) return null;

  const currentViewerId = viewerId ?? "";
  const [leagueRows, recentLockRows, settledLockRows, followedLeagueRows, followedHistoryRows, locksDueRows] = await Promise.all([
    sqlClient<Array<{
      id: string; slug: string; name: string; wins: number; losses: number; settled_picks: number;
      current_win_streak: number; best_win_streak: number; confidence_adjusted_accuracy: string; followed_by_viewer: boolean;
      tier: string; league_followers: number; season_rank: number | null;
    }>>`
      select l.id, l.slug, l.name, r.wins, r.losses, r.settled_picks, r.current_win_streak, r.best_win_streak,
        r.confidence_adjusted_accuracy, r.tier,
        (select count(*)::int from league_follows lf
          where lf.specialist_user_id = r.user_id and lf.league_id = l.id) as league_followers,
        season_rank.rank as season_rank,
        exists(select 1 from league_follows lf where lf.follower_user_id = ${currentViewerId} and lf.specialist_user_id = ${specialist.id} and lf.league_id = l.id) as followed_by_viewer
      from user_league_records r
      join leagues l on l.id = r.league_id
      left join lateral (
        select ranked.rank from (
          select sr.user_id, rank() over (
            order by sr.confidence_adjusted_accuracy desc nulls last,
              sr.wins::numeric / nullif(sr.wins + sr.losses, 0) desc nulls last,
              sr.settled_picks desc, sr.last_settled_at asc nulls last
          ) as rank
          from user_league_season_records sr
          join seasons s on s.id = sr.season_id and s.is_current = true
          where sr.league_id = r.league_id
            and sr.settled_picks >= ${rankThreshold}
        ) ranked
        where ranked.user_id = r.user_id
      ) season_rank on true
      where r.user_id = ${specialist.id} and r.settled_picks > 0
      order by r.confidence_adjusted_accuracy desc nulls last, r.settled_picks desc, l.name
      limit 12`,
    sqlClient<Array<{ id: string; league_name: string; league_slug: string; team: string; result: "win" | "loss" | "void"; home: string; away: string; submitted_at: Date }>>`
      select p.id, l.name as league_name, l.slug as league_slug, t.name as team, p.result,
        h.name as home, a.name as away, p.submitted_at
      from picks p
      join leagues l on l.id = p.league_id
      join teams t on t.id = p.selected_team_id
      join fixtures f on f.id = p.fixture_id
      join teams h on h.id = f.home_team_id
      join teams a on a.id = f.away_team_id
      where p.user_id = ${specialist.id} and p.result in ('win', 'loss', 'void')
      order by p.settled_at desc nulls last, p.submitted_at desc
      limit 12`,
    // Oldest first, because the trend reads left to right. Capped high enough
    // that no real record reaches it, and low enough that a profile page never
    // pulls a season of rows it will not draw.
    sqlClient<Array<{ league_slug: string; result: "win" | "loss" | "void" }>>`
      select l.slug as league_slug, p.result
      from picks p
      join leagues l on l.id = p.league_id
      where p.user_id = ${specialist.id} and p.result in ('win', 'loss', 'void')
      order by p.settled_at asc nulls last, p.submitted_at asc
      limit 400`,
    sqlClient<Array<{ id: string; slug: string; name: string; specialist_id: string; specialist_handle: string | null; specialist_name: string }>>`
      select l.id, l.slug, l.name, u.id as specialist_id, u.username as specialist_handle, u.name as specialist_name
      from league_follows f
      join leagues l on l.id = f.league_id
      join "user" u on u.id = f.specialist_user_id
      where f.follower_user_id = ${specialist.id}
      order by l.name`,
    sqlClient<Array<{
      id: string; league_name: string; league_slug: string; team: string;
      specialist_id: string; specialist_handle: string | null; specialist_name: string; result: "win" | "loss" | "void" | "pending"; followed_at: Date;
    }>>`
      select fp.id, l.name as league_name, l.slug as league_slug, t.name as team,
        u.id as specialist_id, u.username as specialist_handle, u.name as specialist_name, fp.result, fp.followed_at
      from followed_picks fp
      join leagues l on l.id = fp.league_id
      join picks sp on sp.id = fp.source_pick_id
      join teams t on t.id = sp.selected_team_id
      join "user" u on u.id = sp.user_id
      where fp.follower_user_id = ${specialist.id}
      order by fp.followed_at desc
      limit 12`,
    sqlClient<Array<{ count: number }>>`
      select count(*)::int as count from matchweeks mw
      where mw.status = 'upcoming' and mw.lock_at > now()
        and (not exists(select 1 from user_league_preferences where user_id = ${specialist.id})
          or exists(select 1 from user_league_preferences p where p.user_id = ${specialist.id} and p.league_id = mw.league_id and p.kind = 'know'))
        and not exists(select 1 from matchweek_participation mp where mp.matchweek_id = mw.id and mp.user_id = ${specialist.id})`,
  ]);

  const totals = leagueRows.reduce((summary, league) => ({
    wins: summary.wins + league.wins,
    losses: summary.losses + league.losses,
    settledPicks: summary.settledPicks + league.settled_picks,
    // The best run they have had, not the one they are on. Settlement keeps
    // both; this used to read the current streak and call it the best.
    bestWinStreak: Math.max(summary.bestWinStreak, league.best_win_streak),
  }), { wins: 0, losses: 0, settledPicks: 0, bestWinStreak: 0 });

  return {
    specialist: {
      id: specialist.id,
      handle: specialist.username,
      name: specialist.name,
      initials: specialist.name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase(),
      followers: specialist.followers,
      referrals: specialist.referrals,
      memberSince: toIsoTimestamp(specialist.created_at),
      bio:specialist.bio,image:specialist.image,profileTheme:specialist.profile_theme,featuredLeague:specialist.featured_league,pinnedMilestone:specialist.pinned_milestone,
      teamName:specialist.team_name,teamSlug:specialist.team_slug,communityRole:specialist.community_role,homeRegion:specialist.home_region,
    },
    totals,
    leagues: leagueRows.map((league) => ({
      id: league.id, slug: league.slug, name: league.name, wins: league.wins, losses: league.losses,
      settledPicks: league.settled_picks, currentWinStreak: league.current_win_streak,
      confidenceAdjustedAccuracy: Number(league.confidence_adjusted_accuracy), followedByViewer: league.followed_by_viewer,
      tier: league.tier, leagueFollowers: league.league_followers,
      seasonRank: league.season_rank === null ? null : Number(league.season_rank),
      followable: league.settled_picks >= rankThreshold,
    })),
    followedLeagues: followedLeagueRows.map((league) => ({
      id: league.id, slug: league.slug, name: league.name,
      specialistId: league.specialist_id, specialistHandle: league.specialist_handle, specialistName: league.specialist_name,
    })),
    recentLocks: recentLockRows.map((lock) => ({
      id: lock.id, leagueName: lock.league_name, leagueSlug: lock.league_slug, team: lock.team,
      result: lock.result, fixture: `${lock.home} vs ${lock.away}`,
      submittedAt: new Date(lock.submitted_at).toISOString(),
    })),
    settledLocks: settledLockRows.map((lock) => ({
      leagueSlug: lock.league_slug, result: lock.result,
    })),
    followedHistory: followedHistoryRows.map((entry) => ({
      id: entry.id, leagueName: entry.league_name, leagueSlug: entry.league_slug, team: entry.team,
      specialistId: entry.specialist_id, specialistHandle: entry.specialist_handle, specialistName: entry.specialist_name, result: entry.result,
      followedAt: new Date(entry.followed_at).toISOString(),
    })),
    viewer: { authenticated: Boolean(viewerId), isSelf: viewerId === specialist.id, locksDue: locksDueRows[0]?.count ?? 0 },
  };
});
