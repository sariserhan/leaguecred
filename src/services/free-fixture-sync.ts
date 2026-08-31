import { serverEnv } from "@/lib/env";
import { runJobSteps } from "@/lib/job-steps";
import { EspnFixtureProvider } from "@/providers/espn-fixtures";
import { FootballDataOrgProvider } from "@/providers/football-data-org";
import { FootballDataUkProvider } from "@/providers/football-data-uk";
import { synchronizeFixtures } from "@/services/fixture-sync";
import { synchronizeCurrentRosters } from "@/services/roster-sync";
import { synchronizeChampionsLeagueTeams } from "@/services/team-catalog-sync";

export async function synchronizeFreeFixtureSources(now = new Date()) {
  const rosters = await synchronizeCurrentRosters();

  // Each source runs even if an earlier one failed outright (ESPN down, a
  // provider timing out) rather than one outage cancelling every other
  // source for the night. Whoever records a match first still owns it, so
  // ESPN goes first for its breadth; football-data-uk and football-data.org
  // then each add only what is still missing - real failover, not just a
  // wider net when everything happens to be up.
  const { results } = await runJobSteps([
    ["espn-web", () => synchronizeFixtures(new EspnFixtureProvider(), now)],
    ["football-data-uk", () => synchronizeFixtures(new FootballDataUkProvider(), now)],
    ["football-data-org", () => serverEnv.footballDataApiKey
      ? synchronizeFixtures(new FootballDataOrgProvider(), now)
      : Promise.resolve({ status: "skipped" as const, reason: "FOOTBALL_DATA_API_KEY is not configured." })],
    ["football-data-org-teams", () => serverEnv.footballDataApiKey
      ? synchronizeChampionsLeagueTeams()
      : Promise.resolve({ status: "skipped" as const, reason: "FOOTBALL_DATA_API_KEY is not configured." })],
  ] as const);

  return { rosters, providers: results };
}
