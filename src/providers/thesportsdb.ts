export type SportsDbTeam = {
  idTeam: string;
  strTeam: string;
  strCountry: string;
  strSport: string;
  strBadge: string | null;
};

type SportsDbResponse = { teams: SportsDbTeam[] | null };

export class TheSportsDbProvider {
  async searchTeams(name: string) {
    const url = new URL("https://www.thesportsdb.com/api/v1/json/123/searchteams.php");
    url.searchParams.set("t", name);
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) throw new Error(`TheSportsDB team request failed with ${response.status}`);
    const payload = (await response.json()) as SportsDbResponse;
    return payload.teams ?? [];
  }
}
