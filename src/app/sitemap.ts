import type { MetadataRoute } from "next";

import { sqlClient } from "@/db";
import { getLeagueDirectory } from "@/data/leagues";
import { getSpecialistDirectory } from "@/data/specialists";

const BASE_URL = "https://leaguecred.com";

/**
 * Only pages a signed-out visitor can actually read belong here, which is the
 * same set robots.ts leaves crawlable. Listing a members-only route would offer
 * a crawler a sign-in screen and call it content.
 *
 * Teams carry a real lastModified from the catalog. The rest do not claim one:
 * a timestamp invented at request time says "changed just now" on every crawl,
 * which teaches a crawler to stop believing the field.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [leagues, specialists, teams] = await Promise.all([
    getLeagueDirectory(),
    getSpecialistDirectory(),
    sqlClient<Array<{ slug: string; updated_at: string | Date }>>`
      select distinct t.slug, t.updated_at
      from teams t
      join league_team_memberships membership on membership.team_id = t.id
      join seasons s on s.id = membership.season_id and s.is_current = true
      join leagues l on l.id = membership.league_id
      where l.enabled = true`,
  ]);

  return [
    { url: BASE_URL, changeFrequency: "daily", priority: 1 },
    { url: `${BASE_URL}/leagues`, changeFrequency: "daily", priority: 0.9 },
    { url: `${BASE_URL}/challenges`, changeFrequency: "daily", priority: 0.8 },
    { url: `${BASE_URL}/fixtures`, changeFrequency: "hourly", priority: 0.9 },
    { url: `${BASE_URL}/live-locks`, changeFrequency: "hourly", priority: 0.9 },
    { url: `${BASE_URL}/communities`, changeFrequency: "daily", priority: 0.8 },
    { url: `${BASE_URL}/specialists`, changeFrequency: "daily", priority: 0.7 },
    { url: `${BASE_URL}/recaps`, changeFrequency: "daily", priority: 0.7 },
    ...leagues.flatMap((league) => [
      { url: `${BASE_URL}/leagues/${league.slug}`, changeFrequency: "daily" as const, priority: 0.8 },
      { url: `${BASE_URL}/leagues/${league.slug}/standings`, changeFrequency: "daily" as const, priority: 0.6 },
    ]),
    ...teams.map((team) => ({
      url: `${BASE_URL}/teams/${team.slug}`,
      // The driver hands this back as Postgres text, which is not the W3C
      // datetime a sitemap needs. A Date is what Next serialises correctly.
      lastModified: new Date(team.updated_at),
      changeFrequency: "weekly" as const,
      priority: 0.5,
    })),
    ...specialists.map((specialist) => ({
      url: `${BASE_URL}/specialists/${specialist.id}`,
      changeFrequency: "weekly" as const,
      priority: 0.5,
    })),
    // Rarely change, and nobody searches for them, but a crawler that can reach
    // every page it is offered is the point of the file.
    { url: `${BASE_URL}/privacy`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${BASE_URL}/terms`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${BASE_URL}/cookies`, changeFrequency: "yearly", priority: 0.2 },
  ];
}
