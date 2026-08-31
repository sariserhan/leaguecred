"use server";

import { z } from "zod";

import { sqlClient } from "@/db";
import { getLeagueNavTeams, type TeamNavTeam } from "@/data/teams";
import { getSession } from "@/lib/auth-session";
import { getOrCreateVoterId } from "@/lib/voter-id";
import { withinRateLimit, withinUserRateLimit } from "@/services/rate-limit";

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

const voteInput = z.object({ fixtureId: z.string().uuid(), choice: z.enum(["home", "away"]) });

export type FixtureVoteTally = { home: number; away: number };
export type FixtureVoteResult =
  | { ok: true; tally: FixtureVoteTally; choice: "home" | "away" }
  | { ok: false; message: string };

/**
 * A casual "who wins" poll, open to anyone - signed in or not. The voter's
 * identity is a cookie, not an account, so this is deliberately separate from
 * the authenticated Weekly Lock: nothing here builds anyone's record, and a
 * vote can be changed right up to kickoff.
 */
export async function castFixtureVote(fixtureId: string, choice: "home" | "away"): Promise<FixtureVoteResult> {
  const parsed = voteInput.safeParse({ fixtureId, choice });
  if (!parsed.success) return { ok: false, message: "That fixture is invalid." };

  const voterId = await getOrCreateVoterId();
  if (!await withinRateLimit("castFixtureVote", voterId)) {
    return { ok: false, message: "That is a lot of votes at once. Wait a moment and try again." };
  }

  try {
    const rows = await sqlClient.begin(async (sql) => {
      const [fixture] = await sql<Array<{ id: string }>>`
        select id from fixtures
        where id = ${parsed.data.fixtureId} and status = 'scheduled' and kickoff_at > now()
        for update`;
      if (!fixture) throw new Error("fixture is not open for voting");

      await sql`insert into fixture_votes (fixture_id, voter_id, choice)
        values (${parsed.data.fixtureId}, ${voterId}, ${parsed.data.choice})
        on conflict (fixture_id, voter_id) do update set choice = excluded.choice, updated_at = now()`;

      const tallyRows = await sql<Array<{ choice: "home" | "away"; count: number }>>`
        select choice, count(*)::int as count from fixture_votes
        where fixture_id = ${parsed.data.fixtureId} group by choice`;
      return tallyRows;
    });

    return {
      ok: true,
      choice: parsed.data.choice,
      tally: {
        home: rows.find((row) => row.choice === "home")?.count ?? 0,
        away: rows.find((row) => row.choice === "away")?.count ?? 0,
      },
    };
  } catch {
    return { ok: false, message: "This fixture is no longer open for voting." };
  }
}
