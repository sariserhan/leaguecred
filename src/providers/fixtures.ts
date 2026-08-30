import type { FixtureStatus } from "@/db/schema";

export type ProviderFixture = {
  externalId: string;
  round: string;
  kickoffAt: string;
  status: FixtureStatus;
  home: { externalId: string; name: string; shortName: string; logoUrl: string | null };
  away: { externalId: string; name: string; shortName: string; logoUrl: string | null };
  homeScore: number | null;
  awayScore: number | null;
  winnerExternalId: string | null;
};

export type FixtureBatch = { fixtures: ProviderFixture[]; requestCount: number };

export type FixtureProviderCompetition = {
  leagueSlug: string;
  externalId: string;
};

export interface FixtureProvider {
  readonly name: string;
  readonly competitions?: readonly FixtureProviderCompetition[];
  fetchFixtures(input: { leagueExternalId: string; season: string; from: string; to: string }): Promise<FixtureBatch>;
}
