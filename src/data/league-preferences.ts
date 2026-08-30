import "server-only";
import { cache } from "react";
import { sqlClient } from "@/db";

export type LeaguePreferences = { known: string[]; help: string[] };
export const getLeaguePreferences = cache(async (userId: string): Promise<LeaguePreferences> => {
  const rows = await sqlClient<Array<{ slug: string; kind: "know" | "help" }>>`
    select l.slug, p.kind from user_league_preferences p
    join leagues l on l.id = p.league_id
    where p.user_id = ${userId}
    order by l.priority, l.name`;
  return { known: rows.filter((row) => row.kind === "know").map((row) => row.slug), help: rows.filter((row) => row.kind === "help").map((row) => row.slug) };
});
