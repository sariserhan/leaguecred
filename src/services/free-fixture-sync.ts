import { serverEnv } from "@/lib/env";
import { runJobSteps } from "@/lib/job-steps";
import { EspnFixtureProvider } from "@/providers/espn-fixtures";
import { FootballDataOrgProvider } from "@/providers/football-data-org";
import { synchronizeFixtures } from "@/services/fixture-sync";
import { synchronizeCurrentRosters } from "@/services/roster-sync";
import { synchronizeChampionsLeagueTeams } from "@/services/team-catalog-sync";

export async function synchronizeFreeFixtureSources(now = new Date()) {
  const rosters = await synchronizeCurrentRosters();

  // Each source runs even if an earlier one failed outright (ESPN down, a
  // provider timing out) rather than one outage cancelling every other
  // source for the night. ESPN goes first for its breadth; football-data.org
  // is the real failover, adding whatever is still missing. football-data-uk
  // is not wired here - it never contributed a match ESPN didn't already
  // have, only stale duplicates that cost cleanup. It stays unwired
  // (src/providers/football-data-uk.ts) and re-addable in one line.
  const { results } = await runJobSteps([
    ["espn-web", () => synchronizeFixtures(new EspnFixtureProvider(), now)],
    ["football-data-org", () => serverEnv.footballDataApiKey
      ? synchronizeFixtures(new FootballDataOrgProvider(), now)
      : Promise.resolve({ status: "skipped" as const, reason: "FOOTBALL_DATA_API_KEY is not configured." })],
    ["football-data-org-teams", () => serverEnv.footballDataApiKey
      ? synchronizeChampionsLeagueTeams()
      : Promise.resolve({ status: "skipped" as const, reason: "FOOTBALL_DATA_API_KEY is not configured." })],
  ] as const);

  return { rosters, providers: results };
}
