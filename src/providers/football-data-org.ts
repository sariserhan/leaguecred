import type { FixtureStatus } from "@/db/schema";
import { requireFootballDataApiKey, serverEnv } from "@/lib/env";
import type { FixtureBatch, FixtureProvider, ProviderFixture } from "@/providers/fixtures";

type FootballDataMatch = {
  id: number;
  utcDate: string;
  status: string;
  stage: string;
  matchday: number | null;
  homeTeam: { id: number; name: string; shortName: string | null; crest: string | null };
  awayTeam: { id: number; name: string; shortName: string | null; crest: string | null };
  score: { winner: "HOME_TEAM" | "AWAY_TEAM" | "DRAW" | null; fullTime: { home: number | null; away: number | null } };
};

type FootballDataResponse = { matches: FootballDataMatch[] };

export function normalizeFootballDataStatus(status: string): FixtureStatus {
  if (["SCHEDULED", "TIMED"].includes(status)) return "scheduled";
  if (["IN_PLAY", "PAUSED", "EXTRA_TIME", "PENALTY_SHOOTOUT"].includes(status)) return "live";
  if (status === "FINISHED") return "finished";
  if (status === "POSTPONED") return "postponed";
  if (status === "CANCELLED") return "cancelled";
  if (status === "SUSPENDED") return "suspended";
  return "unknown";
}

export function mapFootballDataMatch(match: FootballDataMatch): ProviderFixture {
  const homeExternalId = String(match.homeTeam.id);
  const awayExternalId = String(match.awayTeam.id);
  const round = match.matchday ? `Matchday ${match.matchday}` : match.stage.replaceAll("_", " ");
  return {
    externalId: String(match.id),
    round: `football-data-org:CL:${round}`,
    kickoffAt: match.utcDate,
    status: normalizeFootballDataStatus(match.status),
    home: {
      externalId: homeExternalId,
      name: match.homeTeam.name,
      shortName: match.homeTeam.shortName || match.homeTeam.name.slice(0, 3).toUpperCase(),
      logoUrl: match.homeTeam.crest,
    },
    away: {
      externalId: awayExternalId,
      name: match.awayTeam.name,
      shortName: match.awayTeam.shortName || match.awayTeam.name.slice(0, 3).toUpperCase(),
      logoUrl: match.awayTeam.crest,
    },
    homeScore: match.score.fullTime.home,
    awayScore: match.score.fullTime.away,
    winnerExternalId: match.score.winner === "HOME_TEAM" ? homeExternalId : match.score.winner === "AWAY_TEAM" ? awayExternalId : null,
  };
}

export class FootballDataOrgProvider implements FixtureProvider {
  readonly name = "football-data-org";
  readonly competitions = [{ leagueSlug: "uefa-champions-league", externalId: "CL" }] as const;

  async fetchFixtures(input: { leagueExternalId: string; season: string; from: string; to: string }): Promise<FixtureBatch> {
    const url = new URL(`competitions/${input.leagueExternalId}/matches`, `${serverEnv.footballDataBaseUrl}/`);
    url.searchParams.set("season", input.season);
    const response = await fetch(url, {
      headers: { "X-Auth-Token": requireFootballDataApiKey() },
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`football-data.org request failed with ${response.status}`);
    const payload = (await response.json()) as FootballDataResponse;
    return { fixtures: payload.matches.map(mapFootballDataMatch), requestCount: 1 };
  }
}
