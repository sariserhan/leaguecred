import "server-only";

import { cache } from "react";

import { sqlClient } from "@/db";
import { MINIMUM_SETTLED_PICKS_FOR_RANK } from "@/lib/reputation";

export type SpecialistProfileData = {
  specialist: { id: string; name: string; initials: string; followers: number };
  totals: { wins: number; losses: number; settledPicks: number; bestWinStreak: number };
  leagues: Array<{
    id: string; slug: string; name: string; wins: number; losses: number; settledPicks: number;
    currentWinStreak: number; confidenceAdjustedAccuracy: number; followedByViewer: boolean;
  }>;
  recentLocks: Array<{
    id: string; leagueName: string; leagueSlug: string; team: string; result: "win" | "loss" | "void";
    fixture: string; submittedAt: string;
  }>;
  viewer: { authenticated: boolean; isSelf: boolean };
};

export const getSpecialistProfile = cache(async function getSpecialistProfile(
  specialistId: string,
  viewerId?: string,
): Promise<SpecialistProfileData | null> {
  const [specialist] = await sqlClient<Array<{ id: string; name: string; followers: number }>>`
    select u.id, u.name,
      (select count(*)::int from league_follows lf where lf.specialist_user_id = u.id) as followers
    from "user" u
    where u.id = ${specialistId}
      and exists(
        select 1 from user_league_records r
        where r.user_id = u.id and r.settled_picks >= ${MINIMUM_SETTLED_PICKS_FOR_RANK}
      )
    limit 1`;
  if (!specialist) return null;

  const currentViewerId = viewerId ?? "";
  const [leagueRows, recentLockRows] = await Promise.all([
    sqlClient<Array<{
      id: string; slug: string; name: string; wins: number; losses: number; settled_picks: number;
      current_win_streak: number; confidence_adjusted_accuracy: string; followed_by_viewer: boolean;
    }>>`
      select l.id, l.slug, l.name, r.wins, r.losses, r.settled_picks, r.current_win_streak,
        r.confidence_adjusted_accuracy,
        exists(select 1 from league_follows lf where lf.follower_user_id = ${currentViewerId} and lf.specialist_user_id = ${specialist.id} and lf.league_id = l.id) as followed_by_viewer
      from user_league_records r
      join leagues l on l.id = r.league_id
      where r.user_id = ${specialist.id} and r.settled_picks >= ${MINIMUM_SETTLED_PICKS_FOR_RANK}
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
  ]);

  const totals = leagueRows.reduce((summary, league) => ({
    wins: summary.wins + league.wins,
    losses: summary.losses + league.losses,
    settledPicks: summary.settledPicks + league.settled_picks,
    bestWinStreak: Math.max(summary.bestWinStreak, league.current_win_streak),
  }), { wins: 0, losses: 0, settledPicks: 0, bestWinStreak: 0 });

  return {
    specialist: {
      id: specialist.id,
      name: specialist.name,
      initials: specialist.name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase(),
      followers: specialist.followers,
    },
    totals,
    leagues: leagueRows.map((league) => ({
      id: league.id, slug: league.slug, name: league.name, wins: league.wins, losses: league.losses,
      settledPicks: league.settled_picks, currentWinStreak: league.current_win_streak,
      confidenceAdjustedAccuracy: Number(league.confidence_adjusted_accuracy), followedByViewer: league.followed_by_viewer,
    })),
    recentLocks: recentLockRows.map((lock) => ({
      id: lock.id, leagueName: lock.league_name, leagueSlug: lock.league_slug, team: lock.team,
      result: lock.result, fixture: `${lock.home} vs ${lock.away}`,
      submittedAt: new Date(lock.submitted_at).toISOString(),
    })),
    viewer: { authenticated: Boolean(viewerId), isSelf: viewerId === specialist.id },
  };
});
