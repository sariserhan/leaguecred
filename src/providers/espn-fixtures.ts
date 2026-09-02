import type { FixtureStatus } from "@/db/schema";
import type { FixtureBatch, FixtureProvider, ProviderFixture } from "@/providers/fixtures";
import { assertUnderstood } from "@/providers/upstream-shape";

type EspnStatus = {
  name?: string;
  state?: "pre" | "in" | "post";
  completed?: boolean;
};

type EspnCompetitor = {
  homeAway?: "home" | "away";
  winner?: boolean;
  score?: string;
  team?: {
    id?: string;
    abbreviation?: string;
    displayName?: string;
    shortDisplayName?: string;
    logo?: string;
  };
};

export type EspnEvent = {
  id?: string;
  date?: string;
  season?: { slug?: string };
  status?: { type?: EspnStatus };
  competitions?: Array<{
    status?: { type?: EspnStatus };
    competitors?: EspnCompetitor[];
    series?: { title?: string };
  }>;
};

type EspnScoreboardResponse = { events?: EspnEvent[] };

const DEFAULT_ESPN_SPORT = "soccer";

/**
 * The path segment ESPN files a competition under. Read from the registry
 * rather than passed around, because the services that call these providers
 * carry a league's external id and nothing else.
 */
export function espnSportPath(externalId: string): string {
  const competition = ESPN_FIXTURE_COMPETITIONS.find((entry) => entry.externalId === externalId);
  return competition && "sportPath" in competition ? competition.sportPath : DEFAULT_ESPN_SPORT;
}

// ESPN provides the shared fixture source for every enabled LeagueCred competition.
//
// `sportPath` is the segment ESPN files a competition under, left off the
// football entries because that is what nearly all of them are. The shape of
// the response is identical across sports, which is the only reason adding one
// is a line here rather than a second provider.
//
// Named for the path and not for the sport on purpose: ESPN files the NFL under
// "football", which is the word this product uses for what ESPN calls "soccer".
// The league row's own `sport` column carries our vocabulary; this carries
// theirs, and conflating the two would file the NFL as a football league.
export const ESPN_FIXTURE_COMPETITIONS = [
  { leagueSlug: "premier-league", externalId: "eng.1" },
  { leagueSlug: "uefa-champions-league", externalId: "uefa.champions" },
  { leagueSlug: "la-liga", externalId: "esp.1" },
  { leagueSlug: "serie-a", externalId: "ita.1" },
  { leagueSlug: "bundesliga", externalId: "ger.1" },
  { leagueSlug: "ligue-1", externalId: "fra.1" },
  { leagueSlug: "europa-league", externalId: "uefa.europa" },
  { leagueSlug: "brasileirao-serie-a", externalId: "bra.1" },
  { leagueSlug: "super-lig", externalId: "tur.1" },
  { leagueSlug: "primeira-liga", externalId: "por.1" },
  { leagueSlug: "eredivisie", externalId: "ned.1" },
  { leagueSlug: "efl-championship", externalId: "eng.2" },
  { leagueSlug: "liga-mx", externalId: "mex.1" },
  { leagueSlug: "major-league-soccer", externalId: "usa.1" },
  { leagueSlug: "liga-profesional-argentina", externalId: "arg.1" },
  { leagueSlug: "saudi-arabia-pro-league", externalId: "ksa.1" },
  { leagueSlug: "belgium-jupiler-pro-league", externalId: "bel.1" },
  { leagueSlug: "scotland-premiership", externalId: "sco.1" },
  { leagueSlug: "copa-libertadores", externalId: "conmebol.libertadores" },
  { leagueSlug: "uefa-conference-league", externalId: "uefa.europa.conf" },
  { leagueSlug: "austria-bundesliga", externalId: "aut.1" },
  { leagueSlug: "denmark-superliga", externalId: "den.1" },
  { leagueSlug: "super-league-greece", externalId: "gre.1" },
  { leagueSlug: "nba", externalId: "nba", sportPath: "basketball" },
  { leagueSlug: "nfl", externalId: "nfl", sportPath: "football" },
  { leagueSlug: "mlb", externalId: "mlb", sportPath: "baseball" },
  { leagueSlug: "nhl", externalId: "nhl", sportPath: "hockey" },
] as const;

function compactDate(isoDate: string) {
  return isoDate.replaceAll("-", "");
}

function weekStart(iso: string) {
  const date = new Date(iso);
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() - day + 1);
  return date.toISOString().slice(0, 10);
}

export function normalizeEspnStatus(status: EspnStatus | undefined): FixtureStatus {
  const name = status?.name ?? "";
  if (/POSTPONED/i.test(name)) return "postponed";
  if (/CANCELED|CANCELLED/i.test(name)) return "cancelled";
  if (/SUSPENDED/i.test(name)) return "suspended";
  if (status?.state === "in") return "live";
  if (status?.state === "post" && status.completed) return "finished";
  if (status?.state === "pre") return "scheduled";
  return "unknown";
}

function mapTeam(competitor: EspnCompetitor) {
  const team = competitor.team;
  if (!team?.id || !team.displayName) return null;
  return {
    externalId: team.id,
    name: team.displayName,
    shortName: team.abbreviation || team.shortDisplayName || team.displayName.slice(0, 4).toUpperCase(),
    logoUrl: team.logo ?? null,
  };
}

export function mapEspnEvent(event: EspnEvent, leagueCode: string): ProviderFixture | null {
  const competition = event.competitions?.[0];
  const homeCompetitor = competition?.competitors?.find((entry) => entry.homeAway === "home");
  const awayCompetitor = competition?.competitors?.find((entry) => entry.homeAway === "away");
  const home = homeCompetitor ? mapTeam(homeCompetitor) : null;
  const away = awayCompetitor ? mapTeam(awayCompetitor) : null;
  if (!event.id || !event.date || !home || !away) return null;

  const statusType = competition?.status?.type ?? event.status?.type;
  const status = normalizeEspnStatus(statusType);
  const hasScore = status === "live" || status === "finished";
  const score = (value: string | undefined) => hasScore && /^\d+$/.test(value ?? "") ? Number(value) : null;
  const homeScore = score(homeCompetitor?.score);
  const awayScore = score(awayCompetitor?.score);
  const stage = event.season?.slug || competition?.series?.title || "fixtures";

  return {
    externalId: event.id,
    round: `espn-web:${leagueCode}:${stage}:${weekStart(event.date)}`,
    kickoffAt: event.date,
    status,
    home,
    away,
    homeScore,
    awayScore,
    winnerExternalId: status === "finished"
      ? homeCompetitor?.winner ? home.externalId : awayCompetitor?.winner ? away.externalId : null
      : null,
  };
}

export class EspnFixtureProvider implements FixtureProvider {
  readonly name = "espn-web";
  readonly competitions = ESPN_FIXTURE_COMPETITIONS;

  async fetchFixtures(input: {
    leagueExternalId: string;
    season: string;
    from: string;
    to: string;
  }): Promise<FixtureBatch> {
    const url = new URL(
      `https://site.api.espn.com/apis/site/v2/sports/${espnSportPath(input.leagueExternalId)}/${input.leagueExternalId}/scoreboard`,
    );
    url.searchParams.set("dates", `${compactDate(input.from)}-${compactDate(input.to)}`);
    url.searchParams.set("limit", "200");
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) throw new Error(`ESPN scoreboard request failed with ${response.status}`);
    const payload = (await response.json()) as EspnScoreboardResponse;
    const events = payload.events ?? [];
    const fixtures = events.flatMap((event) => {
      const fixture = mapEspnEvent(event, input.leagueExternalId);
      return fixture ? [fixture] : [];
    });
    // mapEspnEvent skips what it cannot read, so a renamed field would show up
    // as an empty, successful sync rather than as a fault.
    assertUnderstood(`ESPN scoreboard for ${input.leagueExternalId}`, events.length, fixtures.length);
    return { fixtures, requestCount: 1 };
  }
}
