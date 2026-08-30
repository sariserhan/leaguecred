import "server-only";

import { cache } from "react";

import { sqlClient } from "@/db";
import type { FixtureStatus, PickResult } from "@/db/schema";

export type WeeklySlipEntry = {
  id: string;
  path: "independent" | "followed";
  league: { name: string; slug: string };
  matchweek: string;
  selectedTeam: { name: string; logoUrl: string | null };
  fixture: { home: string; away: string; homeScore: number | null; awayScore: number | null; status: FixtureStatus };
  kickoff: string;
  result: PickResult;
  specialist: { id: string; name: string } | null;
};

export type WeeklySlipData = {
  active: WeeklySlipEntry[];
  completed: WeeklySlipEntry[];
  summary: {
    activeLocks: number;
    independentLocks: number;
    followedCalls: number;
    independentWins: number;
    independentDecisions: number;
  };
};

type SlipRow = {
  id: string;
  path: "independent" | "followed";
  league_name: string;
  league_slug: string;
  matchweek: string;
  team: string;
  team_logo_url: string | null;
  home: string;
  away: string;
  home_score: number | null;
  away_score: number | null;
  fixture_status: FixtureStatus;
  kickoff_at: Date;
  result: PickResult;
  specialist_id: string | null;
  specialist: string | null;
};

function toEntry(row: SlipRow): WeeklySlipEntry {
  return {
    id: row.id,
    path: row.path,
    league: { name: row.league_name, slug: row.league_slug },
    matchweek: row.matchweek,
    selectedTeam: { name: row.team, logoUrl: row.team_logo_url },
    fixture: {
      home: row.home,
      away: row.away,
      homeScore: row.home_score,
      awayScore: row.away_score,
      status: row.fixture_status,
    },
    kickoff: new Date(row.kickoff_at).toISOString(),
    result: row.result,
    specialist: row.specialist_id && row.specialist ? { id: row.specialist_id, name: row.specialist } : null,
  };
}

export const getWeeklySlip = cache(async function getWeeklySlip(userId: string): Promise<WeeklySlipData> {
  const [independentRows, followedRows] = await Promise.all([
    sqlClient<SlipRow[]>`
      select p.id, 'independent'::text as path, l.name as league_name, l.slug as league_slug,
        mw.display_name as matchweek, t.name as team, t.logo_url as team_logo_url,
        h.name as home, a.name as away, f.home_score, f.away_score, f.status as fixture_status,
        f.kickoff_at, p.result, null::text as specialist_id, null::text as specialist
      from picks p
      join leagues l on l.id = p.league_id
      join matchweeks mw on mw.id = p.matchweek_id
      join teams t on t.id = p.selected_team_id
      join fixtures f on f.id = p.fixture_id
      join teams h on h.id = f.home_team_id
      join teams a on a.id = f.away_team_id
      where p.user_id = ${userId}
      order by f.kickoff_at desc
      limit 40`,
    sqlClient<SlipRow[]>`
      select fp.id, 'followed'::text as path, l.name as league_name, l.slug as league_slug,
        mw.display_name as matchweek, t.name as team, t.logo_url as team_logo_url,
        h.name as home, a.name as away, f.home_score, f.away_score, f.status as fixture_status,
        f.kickoff_at, fp.result, source_user.id as specialist_id, source_user.name as specialist
      from followed_picks fp
      join picks source_pick on source_pick.id = fp.source_pick_id
      join "user" source_user on source_user.id = source_pick.user_id
      join leagues l on l.id = fp.league_id
      join matchweeks mw on mw.id = fp.matchweek_id
      join teams t on t.id = source_pick.selected_team_id
      join fixtures f on f.id = source_pick.fixture_id
      join teams h on h.id = f.home_team_id
      join teams a on a.id = f.away_team_id
      where fp.follower_user_id = ${userId}
      order by f.kickoff_at desc
      limit 40`,
  ]);

  const entries = [...independentRows, ...followedRows].map(toEntry)
    .toSorted((left, right) => Date.parse(right.kickoff) - Date.parse(left.kickoff));
  const active = entries.filter((entry) => entry.result === "pending")
    .toSorted((left, right) => Date.parse(left.kickoff) - Date.parse(right.kickoff));
  const completed = entries.filter((entry) => entry.result !== "pending").slice(0, 16);
  const independent = entries.filter((entry) => entry.path === "independent");
  const independentDecisions = independent.filter((entry) => entry.result === "win" || entry.result === "loss").length;

  return {
    active,
    completed,
    summary: {
      activeLocks: active.length,
      independentLocks: independent.length,
      followedCalls: entries.filter((entry) => entry.path === "followed").length,
      independentWins: independent.filter((entry) => entry.result === "win").length,
      independentDecisions,
    },
  };
});
