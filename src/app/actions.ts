"use server";

import { z } from "zod";

import { getLeagueNavTeams, type TeamNavTeam } from "@/data/teams";
import { getSession } from "@/lib/auth-session";
import { withinUserRateLimit } from "@/services/rate-limit";

const leagueSlug = z.string().min(1).max(120).regex(/^[a-z0-9-]+$/);

/**
 * Backs the header's Teams menu. The layout ships the league list only, so the
 * clubs for a league are fetched the first time someone opens it.
 */
export async function loadLeagueTeams(slug: string): Promise<TeamNavTeam[]> {
  const parsed = leagueSlug.safeParse(slug);
  if (!parsed.success) return [];

  // The only action here anyone can reach without signing in, and one query per
  // call. An empty list is the right refusal: the menu shows nothing rather than
  // an error nobody browsing a menu can act on.
  const session = await getSession();
  if (!await withinUserRateLimit("loadLeagueTeams", session?.user.id)) return [];

  return getLeagueNavTeams(parsed.data);
}
