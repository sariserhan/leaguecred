import type { FixtureStatus } from "@/db/schema";
import { requireApiFootballKey, serverEnv } from "@/lib/env";
import type { FixtureBatch, FixtureProvider, ProviderFixture } from "@/providers/fixtures";

type ApiFixture = {
  fixture: { id: number; date: string; status: { short: string } };
  league: { round: string };
  teams: {
    home: { id: number; name: string; logo: string | null; winner: boolean | null };
    away: { id: number; name: string; logo: string | null; winner: boolean | null };
  };
  goals: { home: number | null; away: number | null };
};
type ApiResponse = { errors: unknown[] | Record<string, string>; paging: { current: number; total: number }; response: ApiFixture[] };

export type ApiFootballTeam = {
  id: number;
  name: string;
  code: string | null;
  country: string;
  logo: string | null;
};

type ApiTeamResponse = {
  errors: unknown[] | Record<string, string>;
  response: Array<{ team: ApiFootballTeam }>;
};

const liveStatuses = new Set(["1H", "HT", "2H", "ET", "P", "BT"]);

export function normalizeApiFootballStatus(status: string): FixtureStatus {
  if (["TBD", "NS"].includes(status)) return "scheduled";
  if (liveStatuses.has(status)) return "live";
  if (["FT", "AET", "PEN"].includes(status)) return "finished";
  if (status === "PST") return "postponed";
  if (status === "CANC") return "cancelled";
  if (status === "ABD") return "abandoned";
  if (status === "SUSP" || status === "INT") return "suspended";
  return "unknown";
}

function shortName(name: string) {
  return name.replace(/[^\p{L}\p{N} ]/gu, "").split(/\s+/).map((word) => word[0]).join("").slice(0, 3).toUpperCase();
}

function mapFixture(item: ApiFixture): ProviderFixture {
  return {
    externalId: String(item.fixture.id),
    round: item.league.round,
    kickoffAt: item.fixture.date,
    status: normalizeApiFootballStatus(item.fixture.status.short),
    home: { externalId: String(item.teams.home.id), name: item.teams.home.name, shortName: shortName(item.teams.home.name), logoUrl: item.teams.home.logo },
    away: { externalId: String(item.teams.away.id), name: item.teams.away.name, shortName: shortName(item.teams.away.name), logoUrl: item.teams.away.logo },
    homeScore: item.goals.home,
    awayScore: item.goals.away,
    winnerExternalId: item.teams.home.winner ? String(item.teams.home.id) : item.teams.away.winner ? String(item.teams.away.id) : null,
  };
}

export class ApiFootballProvider implements FixtureProvider {
  readonly name = "api-football";

  async searchTeams(name: string) {
    const url = new URL("teams", `${serverEnv.apiFootballBaseUrl}/`);
    url.searchParams.set("search", name);
    const response = await fetch(url, {
      headers: { "x-apisports-key": requireApiFootballKey() },
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`API-Football team request failed with ${response.status}`);
    const payload = (await response.json()) as ApiTeamResponse;
    if (Array.isArray(payload.errors) ? payload.errors.length > 0 : Object.keys(payload.errors).length > 0) {
      throw new Error(`API-Football returned errors: ${JSON.stringify(payload.errors)}`);
    }
    return payload.response.map((entry) => entry.team);
  }

  async fetchTeam(id: string) {
    const url = new URL("teams", `${serverEnv.apiFootballBaseUrl}/`);
    url.searchParams.set("id", id);
    const response = await fetch(url, {
      headers: { "x-apisports-key": requireApiFootballKey() },
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`API-Football team request failed with ${response.status}`);
    const payload = (await response.json()) as ApiTeamResponse;
    if (Array.isArray(payload.errors) ? payload.errors.length > 0 : Object.keys(payload.errors).length > 0) {
      throw new Error(`API-Football returned errors: ${JSON.stringify(payload.errors)}`);
    }
    return payload.response[0]?.team ?? null;
  }

  async fetchFixtures(input: { leagueExternalId: string; season: string; from: string; to: string }): Promise<FixtureBatch> {
    const fixtures: ProviderFixture[] = [];
    let page = 1;
    let totalPages = 1;

    do {
      const url = new URL("fixtures", `${serverEnv.apiFootballBaseUrl}/`);
      url.searchParams.set("league", input.leagueExternalId);
      url.searchParams.set("season", input.season);
      url.searchParams.set("from", input.from);
      url.searchParams.set("to", input.to);
      url.searchParams.set("timezone", "UTC");
      url.searchParams.set("page", String(page));

      const response = await fetch(url, { headers: { "x-apisports-key": requireApiFootballKey() }, cache: "no-store" });
      if (!response.ok) throw new Error(`API-Football request failed with ${response.status}`);
      const payload = (await response.json()) as ApiResponse;
      if (Array.isArray(payload.errors) ? payload.errors.length > 0 : Object.keys(payload.errors).length > 0) {
        throw new Error(`API-Football returned errors: ${JSON.stringify(payload.errors)}`);
      }
      fixtures.push(...payload.response.map(mapFixture));
      totalPages = payload.paging.total;
      page += 1;
    } while (page <= totalPages);

    return { fixtures, requestCount: totalPages };
  }
}
