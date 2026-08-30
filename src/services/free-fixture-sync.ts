import { serverEnv } from "@/lib/env";
import { EspnFixtureProvider } from "@/providers/espn-fixtures";
import { FootballDataUkProvider } from "@/providers/football-data-uk";
import { synchronizeFixtures } from "@/services/fixture-sync";
import { synchronizeCurrentRosters } from "@/services/roster-sync";
import { synchronizeChampionsLeagueTeams } from "@/services/team-catalog-sync";

export async function synchronizeFreeFixtureSources(now = new Date()) {
  const rosters = await synchronizeCurrentRosters();
  // ESPN goes first because it covers every league football-data-uk does and
  // thirteen more, with fuller upcoming fixtures. Whoever records a match first
  // owns it, so leading with the broader source keeps a real gameweek in one
  // matchweek; football-data-uk then only adds what ESPN is missing.
  const espn = await synchronizeFixtures(new EspnFixtureProvider(), now);
  const footballDataUk = await synchronizeFixtures(new FootballDataUkProvider(), now);
  const footballDataOrgTeams = serverEnv.footballDataApiKey
    ? await synchronizeChampionsLeagueTeams()
    : null;

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
