"use server";

import { z } from "zod";

import { getLeagueNavTeams, type TeamNavTeam } from "@/data/teams";

const leagueSlug = z.string().min(1).max(120).regex(/^[a-z0-9-]+$/);

/**
 * Backs the header's Teams menu. The layout ships the league list only, so the
 * clubs for a league are fetched the first time someone opens it.
 */
export async function loadLeagueTeams(slug: string): Promise<TeamNavTeam[]> {
  const parsed = leagueSlug.safeParse(slug);
  if (!parsed.success) return [];
  return getLeagueNavTeams(parsed.data);
}
