"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { sqlClient } from "@/db";
import { getSession } from "@/lib/auth-session";

export type LeagueActionResult = { ok: true } | { ok: false; message: string };

const uuid = z.string().uuid();

async function authenticatedUserId() {
  const session = await getSession();
  return session?.user.id ?? null;
}

function actionError(error: unknown): LeagueActionResult {
  const databaseError = error as { code?: string; message?: string };
  if (databaseError.code === "23505") {
    return { ok: false, message: "You already made a choice for this league and matchweek." };
  }
  if (databaseError.message?.includes("matchweek is locked")) {
    return { ok: false, message: "This matchweek is already locked." };
  }
  if (databaseError.message?.includes("independent participation")) {
    return { ok: false, message: "Expert calls were already revealed, so an independent lock is no longer available." };
  }
  return { ok: false, message: "The choice could not be saved. Please refresh and try again." };
}

export async function submitWeeklyLock(fixtureId: string, selectedTeamId: string): Promise<LeagueActionResult> {
  const parsed = z.object({ fixtureId: uuid, selectedTeamId: uuid }).safeParse({ fixtureId, selectedTeamId });
  if (!parsed.success) return { ok: false, message: "That fixture or team is invalid." };

  const userId = await authenticatedUserId();
  if (!userId) return { ok: false, message: "Sign in before submitting a Weekly Lock." };

  try {
    const slug = await sqlClient.begin(async (sql) => {
      const [fixture] = await sql<Array<{ league_id: string; season_id: string; matchweek_id: string; slug: string }>>`
        select f.league_id, f.season_id, f.matchweek_id, l.slug
        from fixtures f join leagues l on l.id = f.league_id join matchweeks mw on mw.id = f.matchweek_id
        where f.id = ${parsed.data.fixtureId}
          and f.status = 'scheduled'
          and f.kickoff_at > now()
          and mw.status = 'upcoming'
          and mw.lock_at > now()
          and (f.home_team_id = ${parsed.data.selectedTeamId} or f.away_team_id = ${parsed.data.selectedTeamId})
        for update of mw, f`;
      if (!fixture) throw new Error("fixture is not eligible");

      await sql`insert into matchweek_participation (user_id, league_id, matchweek_id, mode)
        values (${userId}, ${fixture.league_id}, ${fixture.matchweek_id}, 'independent')
        on conflict (user_id, league_id, matchweek_id) do nothing`;
      await sql`insert into picks (user_id, league_id, season_id, matchweek_id, fixture_id, selected_team_id)
        values (${userId}, ${fixture.league_id}, ${fixture.season_id}, ${fixture.matchweek_id}, ${parsed.data.fixtureId}, ${parsed.data.selectedTeamId})`;
      return fixture.slug;
    });

    revalidatePath(`/leagues/${slug}`);
    revalidatePath("/leagues");
    return { ok: true };
  } catch (error) {
    return actionError(error);
  }
}

export async function revealSpecialistPicks(matchweekId: string): Promise<LeagueActionResult> {
  const parsed = uuid.safeParse(matchweekId);
  if (!parsed.success) return { ok: false, message: "That matchweek is invalid." };

  const userId = await authenticatedUserId();
  if (!userId) return { ok: false, message: "Sign in before viewing current specialist calls." };

  try {
    const slug = await sqlClient.begin(async (sql) => {
      const [matchweek] = await sql<Array<{ league_id: string; slug: string; lock_at: Date; status: string }>>`
        select mw.league_id, l.slug, mw.lock_at, mw.status from matchweeks mw join leagues l on l.id = mw.league_id
        where mw.id = ${parsed.data} for update of mw`;
      if (!matchweek || matchweek.status !== "upcoming" || new Date(matchweek.lock_at) <= new Date()) {
        throw new Error("matchweek is locked");
      }

      const [existing] = await sql<Array<{ mode: string }>>`
        select mode from matchweek_participation where user_id = ${userId} and league_id = ${matchweek.league_id} and matchweek_id = ${parsed.data} for update`;
      if (existing?.mode === "independent") throw new Error("independent participation already exists");

      await sql`insert into matchweek_participation (user_id, league_id, matchweek_id, mode, expert_picks_revealed_at)
        values (${userId}, ${matchweek.league_id}, ${parsed.data}, 'follow', now())
        on conflict (user_id, league_id, matchweek_id) do nothing`;
      return matchweek.slug;
    });

    revalidatePath(`/leagues/${slug}`);
    return { ok: true };
  } catch (error) {
    if ((error as Error).message.includes("independent participation")) {
      return { ok: false, message: "You already chose to prove your knowledge this matchweek." };
    }
    return actionError(error);
  }
}

export async function followSpecialistPick(sourcePickId: string): Promise<LeagueActionResult> {
  const parsed = uuid.safeParse(sourcePickId);
  if (!parsed.success) return { ok: false, message: "That specialist call is invalid." };

  const userId = await authenticatedUserId();
  if (!userId) return { ok: false, message: "Sign in before following a specialist." };

  try {
    const slug = await sqlClient.begin(async (sql) => {
      const [source] = await sql<Array<{ user_id: string; league_id: string; season_id: string; matchweek_id: string; slug: string }>>`
        select p.user_id, p.league_id, p.season_id, p.matchweek_id, l.slug
        from picks p join leagues l on l.id = p.league_id join matchweeks mw on mw.id = p.matchweek_id
        where p.id = ${parsed.data} for update of mw, p`;
      if (!source) throw new Error("source pick does not exist");

      await sql`insert into league_follows (follower_user_id, specialist_user_id, league_id)
        values (${userId}, ${source.user_id}, ${source.league_id}) on conflict do nothing`;
      await sql`insert into followed_picks (follower_user_id, source_pick_id, league_id, season_id, matchweek_id)
        values (${userId}, ${parsed.data}, ${source.league_id}, ${source.season_id}, ${source.matchweek_id})`;
      return source.slug;
    });

    revalidatePath(`/leagues/${slug}`);
    revalidatePath("/leagues");
    return { ok: true };
  } catch (error) {
    return actionError(error);
  }
}
