/**
 * League tables straight from ESPN.
 *
 * Standings used to be counted from our own fixtures, which made the table only
 * as good as the fixture list: while every match was stored twice, Galatasaray
 * read five played for eleven points. It also cannot express things a fixture
 * list does not contain, above all points deductions.
 *
 * ESPN publishes the table already computed, with the same team ids the fixture
 * feed uses, so rows map onto our clubs by id rather than by name.
 */

import { assertUnderstood } from "@/providers/upstream-shape";

const STANDINGS_ENDPOINT = "https://site.api.espn.com/apis/v2/sports/soccer";

type EspnStat = { name?: string; value?: number };

type EspnEntry = {
  team?: { id?: string; displayName?: string; logos?: Array<{ href?: string }> };
  stats?: EspnStat[];
};

type EspnStandingsResponse = {
  standings?: { entries?: EspnEntry[] };
  children?: Array<{ standings?: { entries?: EspnEntry[] } }>;
};

export type EspnStandingRow = {
  teamExternalId: string;
  name: string;
  logoUrl: string | null;
  rank: number;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  points: number;
  /** Points removed by the competition, already reflected in `points`. */
  deductions: number;
};

function stat(entry: EspnEntry, name: string) {
  const found = entry.stats?.find((candidate) => candidate.name === name);
  return typeof found?.value === "number" ? found.value : 0;
}

/**
 * A cup competition nests its tables under `children`, one per group; a league
 * puts a single table at the top level.
 */
export function parseEspnStandings(payload: EspnStandingsResponse): EspnStandingRow[] {
  const entries = payload.children?.length
    ? payload.children.flatMap((child) => child.standings?.entries ?? [])
    : payload.standings?.entries ?? [];

  return entries.flatMap((entry) => {
    const externalId = entry.team?.id;
    const name = entry.team?.displayName;
    if (!externalId || !name) return [];

    return [{
      teamExternalId: externalId,
      name,
      logoUrl: entry.team?.logos?.[0]?.href ?? null,
      rank: stat(entry, "rank"),
      played: stat(entry, "gamesPlayed"),
      wins: stat(entry, "wins"),
      // ESPN calls a draw a tie.
      draws: stat(entry, "ties"),
      losses: stat(entry, "losses"),
      goalsFor: stat(entry, "pointsFor"),
      goalsAgainst: stat(entry, "pointsAgainst"),
      points: stat(entry, "points"),
      deductions: stat(entry, "deductions"),
    }];
  }).sort((left, right) => (left.rank || Infinity) - (right.rank || Infinity));
}

export async function fetchEspnStandings(input: {
  leagueExternalId: string;
  season: string;
  /** Seconds the table may be served from cache. A table changes only as
   * matches finish, so it does not need to be fetched on every page view. */
  revalidate?: number;
}): Promise<EspnStandingRow[]> {
  const url = `${STANDINGS_ENDPOINT}/${input.leagueExternalId}/standings?season=${input.season}`;
  const response = await fetch(url, { next: { revalidate: input.revalidate ?? 300 } });
  if (!response.ok) throw new Error(`ESPN standings responded ${response.status}.`);

  const payload = (await response.json()) as EspnStandingsResponse;
  const rows = parseEspnStandings(payload);
  // A table ESPN does not carry comes back with no entries at all, which is a
  // different thing from entries it sent that we could not read.
  const entries = payload.children?.length
    ? payload.children.reduce((total, child) => total + (child.standings?.entries?.length ?? 0), 0)
    : payload.standings?.entries?.length ?? 0;
  assertUnderstood(`ESPN standings for ${input.leagueExternalId}`, entries, rows.length);
  return rows;
}
