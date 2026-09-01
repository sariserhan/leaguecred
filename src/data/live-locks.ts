import "server-only";

import { sqlClient } from "@/db";

export type LockOpinion = { id: string; pickId: string; userId: string; username: string; body: string; parentId: string | null; createdAt: string; score: number; viewerVote: number };
export type GlobalActiveLock = {
  id: string; userId: string; username: string; userImage: string | null; message: string | null; lockedAt: string; kickoffAt: string;
  /** The match itself, so a reader can take it into their own slip. */
  fixtureId: string;
  /** Agreement with the call, summed. Positive is agreement. */
  score: number;
  viewerVote: number;
  viewerFollows: boolean;
  /** Already set aside by the viewer, so the board offers no second copy. */
  inViewerSlip: boolean;
  /** Still callable: the match has not kicked off. */
  open: boolean;
  /** The viewer already spent this league's call for that day, whichever match
   * they spent it on. */
  viewerLockedThatDay: boolean;
  league: { id: string; name: string; slug: string };
  selected: { id: string; name: string; slug: string; logoUrl: string | null };
  opponent: { id: string; name: string; slug: string; logoUrl: string | null };
  home: { name: string; logoUrl: string | null };
  away: { name: string; logoUrl: string | null };
  opinions: LockOpinion[];
};

export async function getGlobalActiveLocks(viewerId?: string): Promise<GlobalActiveLock[]> {
  const locks = await sqlClient<Array<Omit<GlobalActiveLock, "league" | "selected" | "opponent" | "home" | "away" | "opinions"> & {
    league_id: string; league_name: string; league_slug: string;
    selected_id: string; selected_name: string; selected_slug: string; selected_logo: string | null;
    opponent_id: string; opponent_name: string; opponent_slug: string; opponent_logo: string | null;
    home_name: string; home_logo: string | null; away_name: string; away_logo: string | null;
  }>>`
    select p.id, p.user_id "userId", u.name username, u.image "userImage", p.decision_reason message,
      p.locked_at::text "lockedAt", f.kickoff_at::text "kickoffAt", f.id "fixtureId",
      l.id league_id, l.name league_name, l.slug league_slug,
      st.id selected_id, st.name selected_name, st.slug selected_slug, st.logo_url selected_logo,
      case when st.id=f.home_team_id then at.id else ht.id end opponent_id,
      case when st.id=f.home_team_id then at.name else ht.name end opponent_name,
      case when st.id=f.home_team_id then at.slug else ht.slug end opponent_slug,
      case when st.id=f.home_team_id then at.logo_url else ht.logo_url end opponent_logo,
      ht.name home_name, ht.logo_url home_logo, at.name away_name, at.logo_url away_logo,
      coalesce((select sum(pv.value) from pick_votes pv where pv.pick_id=p.id),0)::int score,
      coalesce((select pv.value from pick_votes pv where pv.pick_id=p.id and pv.user_id=${viewerId ?? null}),0)::int "viewerVote",
      exists(select 1 from league_follows lf
        where lf.follower_user_id=${viewerId ?? null} and lf.specialist_user_id=p.user_id and lf.league_id=p.league_id) "viewerFollows",
      exists(select 1 from slip_candidates sc
        where sc.user_id=${viewerId ?? null} and sc.fixture_id=f.id) "inViewerSlip",
      (f.status='scheduled' and f.kickoff_at>now()) "open",
      exists(select 1 from picks mine
        where mine.user_id=${viewerId ?? null} and mine.league_id=p.league_id
          and mine.match_date=(f.kickoff_at at time zone 'UTC')::date) "viewerLockedThatDay"
    from picks p join "user" u on u.id=p.user_id join fixtures f on f.id=p.fixture_id
    join leagues l on l.id=p.league_id join teams st on st.id=p.selected_team_id
    join teams ht on ht.id=f.home_team_id join teams at on at.id=f.away_team_id
    where p.result='pending' and f.status in ('scheduled','live') and f.kickoff_at > now()-interval '8 hours'
    order by p.locked_at desc limit 60`;
  if (!locks.length) return [];
  const ids = locks.map((lock) => lock.id);
  const opinions = await sqlClient<LockOpinion[]>`
    select o.id, o.pick_id "pickId", o.user_id "userId", u.name username, o.body, o.parent_id "parentId", o.created_at::text "createdAt",
      coalesce(sum(v.value),0)::int score, coalesce(max(v.value) filter (where v.user_id=${viewerId ?? null}),0)::int "viewerVote"
    from pick_opinions o join "user" u on u.id=o.user_id left join pick_opinion_votes v on v.opinion_id=o.id
    where o.pick_id=any(${ids}::uuid[]) group by o.id,u.name order by o.created_at asc`;
  const byPick = Map.groupBy(opinions, (opinion) => opinion.pickId);
  return locks.map((lock) => ({
    id: lock.id, userId: lock.userId, username: lock.username, userImage: lock.userImage, message: lock.message, lockedAt: lock.lockedAt, kickoffAt: lock.kickoffAt,
    fixtureId: lock.fixtureId, score: lock.score, viewerVote: lock.viewerVote,
    viewerFollows: lock.viewerFollows, inViewerSlip: lock.inViewerSlip,
    open: lock.open, viewerLockedThatDay: lock.viewerLockedThatDay,
    league: { id: lock.league_id, name: lock.league_name, slug: lock.league_slug },
    selected: { id: lock.selected_id, name: lock.selected_name, slug: lock.selected_slug, logoUrl: lock.selected_logo },
    opponent: { id: lock.opponent_id, name: lock.opponent_name, slug: lock.opponent_slug, logoUrl: lock.opponent_logo },
    home: { name: lock.home_name, logoUrl: lock.home_logo }, away: { name: lock.away_name, logoUrl: lock.away_logo }, opinions: byPick.get(lock.id) ?? [],
  }));
}

export type CommunityDirectoryEntry = { id: string; name: string; slug: string; logoUrl: string | null; league: string; leagueSlug: string; members: number; active: number; locks: number; accuracy: number };
export async function getCommunityDirectory(): Promise<CommunityDirectoryEntry[]> {
  return sqlClient<CommunityDirectoryEntry[]>`
    select distinct on (t.id) t.id,t.name,t.slug,t.logo_url "logoUrl",l.name league,l.slug "leagueSlug",
      count(distinct u.id)::int members,
      count(distinct u.id) filter (where exists(select 1 from picks recent where recent.user_id=u.id and recent.submitted_at>=current_date-interval '7 days'))::int active,
      count(distinct p.id)::int locks,
      coalesce(round(100.0*count(distinct p.id) filter(where p.result='win')/nullif(count(distinct p.id) filter(where p.result in ('win','loss')),0)),0)::int accuracy
    from teams t join league_team_memberships ltm on ltm.team_id=t.id join leagues l on l.id=ltm.league_id and l.enabled=true
    left join "user" u on u.primary_team_id=t.id left join picks p on p.user_id=u.id
    group by t.id,t.name,t.slug,t.logo_url,l.id,l.name,l.slug,l.priority
    order by t.id,l.priority desc`;
}
