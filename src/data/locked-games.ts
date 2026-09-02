import "server-only";

import { cache } from "react";

import { sqlClient } from "@/db";

export type LockedGame = {
  pickId: string;
  kickoff: string;
  league: { name: string; slug: string };
  selected: { name: string; slug: string; logoUrl: string | null };
  opponent: { name: string; slug: string };
  /** Under way, so the call is being answered right now. */
  live: boolean;
};

/** The handle a member's own profile lives at, for the links the layout draws. */
export const getViewerHandle = cache(async (userId: string) => {
  const [row] = await sqlClient<Array<{ username: string | null }>>`
    select username from "user" where id = ${userId}`;
  return row?.username ?? null;
});

/**
 * The calls a member has made and cannot take back.
 *
 * Only the ones still awaiting a result: a lock that has settled belongs to the
 * record on the Weekly Slip, while these are the ones still riding.
 */
export async function getLockedGames(userId: string): Promise<LockedGame[]> {
  const rows = await sqlClient<Array<{
    pick_id: string; kickoff_at: Date; league_name: string; league_slug: string;
    selected_name: string; selected_slug: string; selected_logo: string | null;
    opponent_name: string; opponent_slug: string; live: boolean;
  }>>`
    select p.id as pick_id, f.kickoff_at, l.name as league_name, l.slug as league_slug,
      st.name as selected_name, st.slug as selected_slug, st.logo_url as selected_logo,
      case when st.id = f.home_team_id then away.name else home.name end as opponent_name,
      case when st.id = f.home_team_id then away.slug else home.slug end as opponent_slug,
      (f.status = 'live' or (f.status = 'scheduled' and f.kickoff_at <= now())) as live
    from picks p
    join fixtures f on f.id = p.fixture_id
    join leagues l on l.id = p.league_id
    join teams st on st.id = p.selected_team_id
    join teams home on home.id = f.home_team_id
    join teams away on away.id = f.away_team_id
    where p.user_id = ${userId} and p.result = 'pending'
    order by f.kickoff_at`;

  return rows.map((row) => ({
    pickId: row.pick_id,
    kickoff: new Date(row.kickoff_at).toISOString(),
    league: { name: row.league_name, slug: row.league_slug },
    selected: { name: row.selected_name, slug: row.selected_slug, logoUrl: row.selected_logo },
    opponent: { name: row.opponent_name, slug: row.opponent_slug },
    live: row.live,
  }));
}
