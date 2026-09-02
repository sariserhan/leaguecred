import { espnSport } from "@/providers/espn-fixtures";
export type EspnTeam = {
  id: string;
  displayName: string;
  shortDisplayName: string;
  logoUrl: string | null;
};

type EspnResponse = {
  sports?: Array<{
    leagues?: Array<{
      teams?: Array<{
        team?: {
          id?: string;
          displayName?: string;
          shortDisplayName?: string;
          logos?: Array<{ href?: string }>;
        };
      }>;
    }>;
  }>;
};

export const espnTeamCompetitions = [
  { slug: "la-liga", code: "esp.1" },
  { slug: "europa-league", code: "uefa.europa" },
  { slug: "brasileirao-serie-a", code: "bra.1" },
  { slug: "primeira-liga", code: "por.1" },
  { slug: "liga-mx", code: "mex.1" },
  { slug: "major-league-soccer", code: "usa.1" },
  { slug: "liga-profesional-argentina", code: "arg.1" },
  { slug: "saudi-arabia-pro-league", code: "ksa.1" },
  { slug: "copa-libertadores", code: "conmebol.libertadores" },
  { slug: "austria-bundesliga", code: "aut.1" },
  { slug: "denmark-superliga", code: "den.1" },
  // Domestic catalogs fill teams whose continental competition catalog is incomplete.
  { slug: "europa-league", code: "nor.1" },
  { slug: "uefa-conference-league", code: "nor.1" },
  { slug: "uefa-conference-league", code: "swe.1" },
  { slug: "uefa-conference-league", code: "cyp.1" },
] as const;

export class EspnTeamProvider {
  async fetchTeams(code: string): Promise<EspnTeam[]> {
    const url = new URL(`https://site.api.espn.com/apis/site/v2/sports/${espnSport(code)}/${code}/teams`);
    url.searchParams.set("limit", "100");
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) throw new Error(`ESPN team request failed with ${response.status}`);
    const payload = (await response.json()) as EspnResponse;
    const entries = payload.sports?.[0]?.leagues?.[0]?.teams ?? [];
    return entries.flatMap(({ team }) => {
      if (!team?.id || !team.displayName) return [];
      return [{
        id: team.id,
        displayName: team.displayName,
        shortDisplayName: team.shortDisplayName || team.displayName,
        logoUrl: team.logos?.find((logo) => logo.href)?.href ?? null,
      }];
    });
  }
}
