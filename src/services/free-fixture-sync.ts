import { serverEnv } from "@/lib/env";
import { EspnFixtureProvider } from "@/providers/espn-fixtures";
import { FootballDataUkProvider } from "@/providers/football-data-uk";
import { synchronizeFixtures } from "@/services/fixture-sync";
import { synchronizeCurrentRosters } from "@/services/roster-sync";
import { synchronizeChampionsLeagueTeams } from "@/services/team-catalog-sync";

export async function synchronizeFreeFixtureSources(now = new Date()) {
  const rosters = await synchronizeCurrentRosters();
  const footballDataUk = await synchronizeFixtures(new FootballDataUkProvider(), now);
  const footballDataOrgTeams = serverEnv.footballDataApiKey
    ? await synchronizeChampionsLeagueTeams()
    : null;
  const espn = await synchronizeFixtures(new EspnFixtureProvider(), now);

  return {
    rosters,
    providers: {
      "football-data-uk": { status: "succeeded", ...footballDataUk },
      "football-data-org-teams": footballDataOrgTeams
        ? footballDataOrgTeams
        : { status: "skipped", reason: "FOOTBALL_DATA_API_KEY is not configured." },
      "espn-web": { status: "succeeded", ...espn },
    },
  };
}
