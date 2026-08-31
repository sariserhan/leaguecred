import type { MetadataRoute } from "next";

import { sqlClient } from "@/db";
import { getLeagueDirectory } from "@/data/leagues";
import { getSpecialistDirectory } from "@/data/specialists";

const BASE_URL = "https://leaguecred.com";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [leagues, specialists, teams] = await Promise.all([
    getLeagueDirectory(),
    getSpecialistDirectory(),
    sqlClient<Array<{ slug: string }>>`
      select distinct t.slug
      from teams t
      join league_team_memberships membership on membership.team_id = t.id
      join seasons s on s.id = membership.season_id and s.is_current = true
      join leagues l on l.id = membership.league_id
      where l.enabled = true`,
  ]);

  return [
    { url: BASE_URL, changeFrequency: "daily", priority: 1 },
    { url: `${BASE_URL}/leagues`, changeFrequency: "daily", priority: 0.9 },
    { url: `${BASE_URL}/specialists`, changeFrequency: "daily", priority: 0.7 },
    { url: `${BASE_URL}/challenges`, changeFrequency: "daily", priority: 0.8 },
    { url: `${BASE_URL}/recaps`, changeFrequency: "daily", priority: 0.7 },
    ...leagues.flatMap((league) => [
      { url: `${BASE_URL}/leagues/${league.slug}`, changeFrequency: "daily" as const, priority: 0.8 },
      { url: `${BASE_URL}/leagues/${league.slug}/standings`, changeFrequency: "daily" as const, priority: 0.6 },
    ]),
    ...specialists.map((specialist) => ({
      url: `${BASE_URL}/specialists/${specialist.id}`,
      changeFrequency: "weekly" as const,
      priority: 0.5,
    })),
    ...teams.map((team) => ({
      url: `${BASE_URL}/teams/${team.slug}`,
      changeFrequency: "weekly" as const,
      priority: 0.5,
    })),
  ];
}
