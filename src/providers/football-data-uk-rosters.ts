import { strFromU8, unzipSync } from "fflate";

import {
  footballDataUkShortName,
  footballDataUkTeamId,
  parseCsv,
} from "@/providers/football-data-uk";

type CsvRow = Record<string, string>;

export type RosterTeam = {
  externalId: string;
  name: string;
  shortName: string;
};

export type RosterBatch = {
  leagueSlug: string;
  provider: string;
  sourceCode: string;
  expectedTeamCount: number;
  sourceUrl: string;
  teams: RosterTeam[];
};

type MainCompetition = {
  kind: "main";
  leagueSlug: string;
  sourceCode: string;
  expectedTeamCount: number;
};

type ExtraCompetition = {
  kind: "extra";
  leagueSlug: string;
  sourceCode: string;
  expectedTeamCount: number;
  seasonStyle: "calendar" | "split";
};

export const FOOTBALL_DATA_UK_ROSTER_COMPETITIONS = [
  { kind: "main", leagueSlug: "premier-league", sourceCode: "E0", expectedTeamCount: 20 },
  { kind: "main", leagueSlug: "efl-championship", sourceCode: "E1", expectedTeamCount: 24 },
  { kind: "main", leagueSlug: "scotland-premiership", sourceCode: "SC0", expectedTeamCount: 12 },
  { kind: "main", leagueSlug: "bundesliga", sourceCode: "D1", expectedTeamCount: 18 },
  { kind: "main", leagueSlug: "ligue-1", sourceCode: "F1", expectedTeamCount: 18 },
  { kind: "main", leagueSlug: "super-league-greece", sourceCode: "G1", expectedTeamCount: 12 },
  { kind: "main", leagueSlug: "serie-a", sourceCode: "I1", expectedTeamCount: 20 },
  { kind: "main", leagueSlug: "eredivisie", sourceCode: "N1", expectedTeamCount: 18 },
  { kind: "main", leagueSlug: "primeira-liga", sourceCode: "P1", expectedTeamCount: 18 },
  { kind: "main", leagueSlug: "la-liga", sourceCode: "SP1", expectedTeamCount: 20 },
  { kind: "main", leagueSlug: "super-lig", sourceCode: "T1", expectedTeamCount: 18 },
  { kind: "main", leagueSlug: "belgium-jupiler-pro-league", sourceCode: "B1", expectedTeamCount: 18 },
  { kind: "extra", leagueSlug: "liga-profesional-argentina", sourceCode: "ARG", expectedTeamCount: 30, seasonStyle: "calendar" },
  { kind: "extra", leagueSlug: "austria-bundesliga", sourceCode: "AUT", expectedTeamCount: 12, seasonStyle: "split" },
  { kind: "extra", leagueSlug: "brasileirao-serie-a", sourceCode: "BRA", expectedTeamCount: 20, seasonStyle: "calendar" },
  { kind: "extra", leagueSlug: "denmark-superliga", sourceCode: "DNK", expectedTeamCount: 12, seasonStyle: "split" },
  { kind: "extra", leagueSlug: "liga-mx", sourceCode: "MEX", expectedTeamCount: 18, seasonStyle: "split" },
  { kind: "extra", leagueSlug: "major-league-soccer", sourceCode: "USA", expectedTeamCount: 30, seasonStyle: "calendar" },
] as const satisfies readonly (MainCompetition | ExtraCompetition)[];

const sourceRoot = "https://www.football-data.co.uk";
const sourceHeaders = { "User-Agent": "LeagueCred/0.1 (+https://leaguecred.com)" };

function seasonPath(providerSeason: string) {
  const start = Number(providerSeason);
  if (!Number.isInteger(start)) throw new Error(`Invalid season: ${providerSeason}`);
  return `${String(start).slice(-2)}${String(start + 1).slice(-2)}`;
}

function splitSeason(providerSeason: string) {
  const start = Number(providerSeason);
  if (!Number.isInteger(start)) throw new Error(`Invalid season: ${providerSeason}`);
  return `${start}/${start + 1}`;
}

function rosterTeams(rows: CsvRow[], sourceCode: string, homeColumn: string, awayColumn: string) {
  const names = new Set<string>();
  for (const row of rows) {
    if (row[homeColumn]) names.add(row[homeColumn]);
    if (row[awayColumn]) names.add(row[awayColumn]);
  }
  return [...names].sort().map((name) => ({
    externalId: footballDataUkTeamId(sourceCode, name),
    name,
    shortName: footballDataUkShortName(name),
  }));
}

async function fetchText(url: string) {
  const response = await fetch(url, { headers: sourceHeaders, cache: "no-store" });
  if (!response.ok) throw new Error(`Football-Data.co.uk roster request failed with ${response.status}: ${url}`);
  return response.text();
}

export async function fetchFootballDataUkRosters(providerSeasonBySlug: Map<string, string>) {
  const firstSeason = [...providerSeasonBySlug.values()][0];
  if (!firstSeason) return [];

  const archiveUrl = `${sourceRoot}/mmz4281/${seasonPath(firstSeason)}/data.zip`;
  const archiveResponse = await fetch(archiveUrl, { headers: sourceHeaders, cache: "no-store" });
  if (!archiveResponse.ok) {
    throw new Error(`Football-Data.co.uk roster archive failed with ${archiveResponse.status}: ${archiveUrl}`);
  }
  const archive = unzipSync(new Uint8Array(await archiveResponse.arrayBuffer()));

  const extraCompetitions = FOOTBALL_DATA_UK_ROSTER_COMPETITIONS
    .filter((competition) => competition.kind === "extra");
  const extraTexts = new Map(await Promise.all(extraCompetitions.map(async (competition) => {
    const url = `${sourceRoot}/new/${competition.sourceCode}.csv`;
    return [competition.sourceCode, await fetchText(url)] as const;
  })));

  const batches: RosterBatch[] = [];
  for (const competition of FOOTBALL_DATA_UK_ROSTER_COMPETITIONS) {
    const providerSeason = providerSeasonBySlug.get(competition.leagueSlug);
    if (!providerSeason) continue;

    let teams: RosterTeam[] = [];
    let sourceUrl = archiveUrl;
    if (competition.kind === "main") {
      const filename = Object.keys(archive).find((entry) =>
        entry === `${competition.sourceCode}.csv` || entry.endsWith(`/${competition.sourceCode}.csv`));
      if (filename) teams = rosterTeams(parseCsv(strFromU8(archive[filename]!)), competition.sourceCode, "HomeTeam", "AwayTeam");
    } else {
      sourceUrl = `${sourceRoot}/new/${competition.sourceCode}.csv`;
      const season = competition.seasonStyle === "calendar" ? providerSeason : splitSeason(providerSeason);
      const rows = parseCsv(extraTexts.get(competition.sourceCode) ?? "")
        .filter((row) => row.Season === season);
      teams = rosterTeams(rows, competition.sourceCode, "Home", "Away");
    }

    batches.push({
      leagueSlug: competition.leagueSlug,
      provider: "football-data-uk",
      sourceCode: competition.sourceCode,
      expectedTeamCount: competition.expectedTeamCount,
      sourceUrl,
      teams,
    });
  }
  return batches;
}
