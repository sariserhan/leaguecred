import { serverEnv } from "@/lib/env";
import { EspnFixtureProvider } from "@/providers/espn-fixtures";
import { synchronizeFixtures } from "@/services/fixture-sync";
import { synchronizeCurrentRosters } from "@/services/roster-sync";
import { synchronizeChampionsLeagueTeams } from "@/services/team-catalog-sync";

export async function synchronizeFreeFixtureSources(now = new Date()) {
  const rosters = await synchronizeCurrentRosters();
  // ESPN is the only fixture source. It covers all 23 enabled competitions, and
  // once the clubs both sources named differently were merged, football-data
  // turned out to hold no match ESPN did not already have — only stale copies,
  // still reading "scheduled" against results ESPN had already settled. Every
  // one of those copies cost a duplicate club, a duplicate fixture and a
  // duplicate matchweek to clean up, so it no longer supplies fixtures. Its CSV
  // parser stays, because the roster sync still reads it.
  const espn = await synchronizeFixtures(new EspnFixtureProvider(), now);
  const footballDataOrgTeams = serverEnv.footballDataApiKey
    ? await synchronizeChampionsLeagueTeams()
    : null;

  return {
    rosters,
    providers: {
      "football-data-org-teams": footballDataOrgTeams
        ? footballDataOrgTeams
        : { status: "skipped", reason: "FOOTBALL_DATA_API_KEY is not configured." },
      "espn-web": { status: "succeeded", ...espn },
    },
  };
}
