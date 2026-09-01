"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { sqlClient } from "@/db";
import { getSession } from "@/lib/auth-session";
import { withinUserRateLimit } from "@/services/rate-limit";
import { submitDailyLock } from "@/app/leagues/actions";

export type SlipActionResult = { ok: true } | { ok: false; message: string };

const uuid = z.string().uuid();

/**
 * Sets a match aside to decide later.
 *
 * Nothing is committed here: no side is chosen, no participation is recorded,
 * and the match stays as open as it was. That is the whole distinction between
 * a slip and a lock, and it is why this asks for a fixture and nothing else.
 */
export async function addSlipCandidate(fixtureId: string): Promise<SlipActionResult> {
  const parsed = uuid.safeParse(fixtureId);
  if (!parsed.success) return { ok: false, message: "That match is invalid." };

  const session = await getSession();
  if (!session) return { ok: false, message: "Sign in to keep a slip." };
  if (!await withinUserRateLimit("slipCandidate", session.user.id)) {
    return { ok: false, message: "That is a lot of changes at once. Wait a moment and try again." };
  }

  const [fixture] = await sqlClient<Array<{ id: string }>>`
    select id from fixtures where id = ${parsed.data} and status = 'scheduled' and kickoff_at > now()`;
  if (!fixture) return { ok: false, message: "That match has already kicked off." };

  await sqlClient`insert into slip_candidates (user_id, fixture_id) values (${session.user.id}, ${parsed.data})
    on conflict (user_id, fixture_id) do nothing`;

  revalidatePath("/slip");
  return { ok: true };
}

export async function removeSlipCandidate(fixtureId: string): Promise<SlipActionResult> {
  const parsed = uuid.safeParse(fixtureId);
  if (!parsed.success) return { ok: false, message: "That match is invalid." };

  const session = await getSession();
  if (!session) return { ok: false, message: "Sign in to keep a slip." };

  await sqlClient`delete from slip_candidates where user_id = ${session.user.id} and fixture_id = ${parsed.data}`;
  revalidatePath("/slip");
  return { ok: true };
}

/**
 * Turns a match on the slip into the lock it was being considered for.
 *
 * The lock itself goes through submitDailyLock, so every rule that governs a
 * lock made anywhere else governs this one. The slip entry is dropped only once
 * that succeeds: a refused lock leaves the match where it was, still to decide.
 */
export async function lockSlipCandidate(fixtureId: string, selectedTeamId: string): Promise<SlipActionResult> {
  const parsed = z.object({ fixtureId: uuid, selectedTeamId: uuid }).safeParse({ fixtureId, selectedTeamId });
  if (!parsed.success) return { ok: false, message: "That match or team is invalid." };

  const session = await getSession();
  if (!session) return { ok: false, message: "Sign in before locking." };

  const result = await submitDailyLock(parsed.data.fixtureId, parsed.data.selectedTeamId);
  if (!result.ok) return result;

  await sqlClient`delete from slip_candidates
    where user_id = ${session.user.id} and fixture_id = ${parsed.data.fixtureId}`;

  revalidatePath("/slip");
  revalidatePath("/live-locks");
  return { ok: true };
}
