import { strFromU8, unzipSync } from "fflate";

import type { FixtureBatch, FixtureProvider, ProviderFixture } from "@/providers/fixtures";

type CsvRow = Record<string, string>;

export const FOOTBALL_DATA_UK_COMPETITIONS = [
  { leagueSlug: "premier-league", externalId: "E0" },
  { leagueSlug: "efl-championship", externalId: "E1" },
  { leagueSlug: "scotland-premiership", externalId: "SC0" },
  { leagueSlug: "bundesliga", externalId: "D1" },
  { leagueSlug: "ligue-1", externalId: "F1" },
  { leagueSlug: "super-league-greece", externalId: "G1" },
  { leagueSlug: "serie-a", externalId: "I1" },
  { leagueSlug: "eredivisie", externalId: "N1" },
  { leagueSlug: "primeira-liga", externalId: "P1" },
  { leagueSlug: "la-liga", externalId: "SP1" },
  { leagueSlug: "super-lig", externalId: "T1" },
  { leagueSlug: "belgium-jupiler-pro-league", externalId: "B1" },
] as const;

const sourceRoot = "https://www.football-data.co.uk";
const sourceHeaders = { "User-Agent": "LeagueCred/0.1 (+https://leaguecred.com)" };

export function parseCsv(text: string): CsvRow[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index]!;
    if (character === '"') {
      if (quoted && text[index + 1] === '"') {
        field += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === "," && !quoted) {
      row.push(field);
      field = "";
    } else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && text[index + 1] === "\n") index += 1;
      row.push(field);
      if (row.some((value) => value.length > 0)) rows.push(row);
      row = [];
      field = "";
    } else {
      field += character;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  const [rawHeaders, ...values] = rows;
  if (!rawHeaders) return [];
  const headers = rawHeaders.map((header, index) => index === 0 ? header.replace(/^\uFEFF/, "") : header);
  return values.map((columns) => Object.fromEntries(headers.map((header, index) => [header, columns[index] ?? ""])));
}

export function footballDataUkTeamId(leagueCode: string, name: string) {
  return `${leagueCode}:${name.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}`;
}

export function footballDataUkShortName(name: string) {
  const words = name.replace(/[^\p{L}\p{N} ]/gu, "").trim().split(/\s+/);
  return (words.length === 1 ? words[0]!.slice(0, 3) : words.map((word) => word[0]).join("").slice(0, 3)).toUpperCase();
}

function londonDateTimeToIso(date: string, time: string) {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(date);
  const timeMatch = /^(\d{1,2}):(\d{2})$/.exec(time || "12:00");
  if (!match || !timeMatch) throw new Error(`Invalid Football-Data.co.uk date: ${date} ${time}`);
  const desired = Date.UTC(Number(match[3]), Number(match[2]) - 1, Number(match[1]), Number(timeMatch[1]), Number(timeMatch[2]));
  let instant = desired;
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit",
    hourCycle: "h23",
  });
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const parts = Object.fromEntries(formatter.formatToParts(new Date(instant)).map((part) => [part.type, part.value]));
    const displayed = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), Number(parts.hour), Number(parts.minute));
    instant -= displayed - desired;
  }
  return new Date(instant).toISOString();
}

function weekStart(iso: string) {
  const date = new Date(iso);
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() - day + 1);
  return date.toISOString().slice(0, 10);
}

export function mapFootballDataUkRow(row: CsvRow, leagueCode: string, season: string): ProviderFixture | null {
  const homeName = row.HomeTeam || row.Home;
  const awayName = row.AwayTeam || row.Away;
  if (row.Div !== leagueCode || !row.Date || !homeName || !awayName) return null;
  const kickoffAt = londonDateTimeToIso(row.Date, row.Time);
  const homeExternalId = footballDataUkTeamId(leagueCode, homeName);
  const awayExternalId = footballDataUkTeamId(leagueCode, awayName);
  const homeScore = /^\d+$/.test(row.FTHG ?? row.HG) ? Number(row.FTHG ?? row.HG) : null;
  const awayScore = /^\d+$/.test(row.FTAG ?? row.AG) ? Number(row.FTAG ?? row.AG) : null;
  const result = row.FTR || row.Res;
  const finished = homeScore !== null && awayScore !== null && ["H", "D", "A"].includes(result);

  return {
    externalId: `${leagueCode}:${season}:${homeExternalId}:${awayExternalId}`,
    round: `football-data-uk:${leagueCode}:${weekStart(kickoffAt)}`,
    kickoffAt,
    status: finished ? "finished" : "scheduled",
    home: { externalId: homeExternalId, name: homeName, shortName: footballDataUkShortName(homeName), logoUrl: null },
    away: { externalId: awayExternalId, name: awayName, shortName: footballDataUkShortName(awayName), logoUrl: null },
    homeScore,
    awayScore,
    winnerExternalId: result === "H" ? homeExternalId : result === "A" ? awayExternalId : null,
  };
}

function seasonPath(providerSeason: string) {
  const start = Number(providerSeason);
  if (!Number.isInteger(start)) throw new Error(`Invalid season: ${providerSeason}`);
  return `${String(start).slice(-2)}${String(start + 1).slice(-2)}`;
}

async function downloadCsv(url: string) {
  const response = await fetch(url, { headers: sourceHeaders, cache: "no-store" });
  if (!response.ok) throw new Error(`Football-Data.co.uk request failed with ${response.status}: ${url}`);
  return parseCsv(await response.text());
}

async function downloadSeasonResults(path: string) {
  const url = `${sourceRoot}/mmz4281/${path}/data.zip`;
  const response = await fetch(url, { headers: sourceHeaders, cache: "no-store" });
  if (!response.ok) throw new Error(`Football-Data.co.uk request failed with ${response.status}: ${url}`);
  const archive = unzipSync(new Uint8Array(await response.arrayBuffer()));
  const results = new Map<string, CsvRow[]>();
  for (const competition of FOOTBALL_DATA_UK_COMPETITIONS) {
    const filename = Object.keys(archive).find((entry) => entry === `${competition.externalId}.csv` || entry.endsWith(`/${competition.externalId}.csv`));
    if (filename) results.set(competition.externalId, parseCsv(strFromU8(archive[filename]!)));
  }
  return results;
}

/**
 * No longer wired into the sync: ESPN covers every enabled competition, and
 * once the clubs the two sources named differently were merged, this held no
 * match ESPN did not already have. Kept because it still works and re-adding it
 * to free-fixture-sync is one line, should ESPN ever stop carrying a league.
 * Its CSV helpers above are still used, by the roster sync.
 */
export class FootballDataUkProvider implements FixtureProvider {
  readonly name = "football-data-uk";
  readonly competitions = FOOTBALL_DATA_UK_COMPETITIONS;
  private fixtureRowsPromise: Promise<CsvRow[]> | undefined;
  private resultRowsPromise: Promise<Map<string, CsvRow[]>> | undefined;

  async fetchFixtures(input: { leagueExternalId: string; season: string; from: string; to: string }): Promise<FixtureBatch> {
    let requestCount = 0;
    if (!this.fixtureRowsPromise) {
      this.fixtureRowsPromise = downloadCsv(`${sourceRoot}/fixtures.csv`);
      requestCount += 1;
    }
    if (!this.resultRowsPromise) {
      this.resultRowsPromise = downloadSeasonResults(seasonPath(input.season));
      requestCount += 1;
    }
    const [fixtureRows, resultRowsByLeague] = await Promise.all([
      this.fixtureRowsPromise,
      this.resultRowsPromise,
    ]);
    const resultRows = resultRowsByLeague.get(input.leagueExternalId) ?? [];
    const fixtures = new Map<string, ProviderFixture>();
    for (const row of [...fixtureRows, ...resultRows]) {
      const fixture = mapFootballDataUkRow(row, input.leagueExternalId, input.season);
      if (!fixture) continue;
      const date = fixture.kickoffAt.slice(0, 10);
      if (date < input.from || date > input.to) continue;
      fixtures.set(fixture.externalId, fixture);
    }
    return { fixtures: [...fixtures.values()], requestCount };
  }
}
