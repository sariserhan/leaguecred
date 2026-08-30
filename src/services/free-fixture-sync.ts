import { serverEnv } from "@/lib/env";
import { FootballDataOrgProvider } from "@/providers/football-data-org";
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
  const footballDataOrg = serverEnv.footballDataApiKey
    ? await synchronizeFixtures(new FootballDataOrgProvider(), now)
    : null;

  return {
    rosters,
    providers: {
      "football-data-uk": { status: "succeeded", ...footballDataUk },
      "football-data-org": footballDataOrg
        ? { status: "succeeded", teams: footballDataOrgTeams, ...footballDataOrg }
        : { status: "skipped", reason: "FOOTBALL_DATA_API_KEY is not configured." },
    },
  };
}
