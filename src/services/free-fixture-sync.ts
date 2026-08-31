import { serverEnv } from "@/lib/env";
import { runJobSteps } from "@/lib/job-steps";
import { EspnFixtureProvider } from "@/providers/espn-fixtures";
import { synchronizeFixtures } from "@/services/fixture-sync";
import { synchronizeCurrentRosters } from "@/services/roster-sync";
import { synchronizeChampionsLeagueTeams } from "@/services/team-catalog-sync";

export async function synchronizeFreeFixtureSources(now = new Date()) {
  const rosters = await synchronizeCurrentRosters();

  // Each source runs even if an earlier one failed outright (ESPN down, a
  // provider timing out) rather than one outage cancelling every other
  // source for the night.
  //
  // ESPN is the only fixture source. football-data-uk was unwired first, for
  // never contributing a match ESPN did not already have; football-data.org
  // was kept on as a failover and turned out to do the same thing. It names
  // clubs differently — Ipswich Town FC beside ESPN's Ipswich — so it could not
  // match an existing row and created its own, and with it a second copy of a
  // match already recorded. 315 of its 363 fixtures in production were a
  // duplicate of an ESPN one, and every league it touched, ESPN already covered
  // more completely. Both stay unwired and re-addable in one line, but a second
  // fixture source needs to resolve clubs against the catalogue before it earns
  // a place here.
  //
  // The team catalogue below is unaffected: it resolves against existing clubs
  // rather than inserting blindly, and covers a competition ESPN's fixture feed
  // does not enumerate.
  const { results } = await runJobSteps([
    ["espn-web", () => synchronizeFixtures(new EspnFixtureProvider(), now)],
    ["football-data-org-teams", () => serverEnv.footballDataApiKey
      ? synchronizeChampionsLeagueTeams()
      : Promise.resolve({ status: "skipped" as const, reason: "FOOTBALL_DATA_API_KEY is not configured." })],
  ] as const);

  return { rosters, providers: results };
}
