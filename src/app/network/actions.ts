"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { sqlClient } from "@/db";
import { getSession } from "@/lib/auth-session";
import { MINIMUM_SETTLED_PICKS_FOR_RANK } from "@/lib/reputation";

export type NetworkActionResult = { ok: true } | { ok: false; message: string };
const choiceSchema = z.object({ specialistId: z.string().min(1), leagueId: z.string().uuid() });

function refreshNetworkPaths(specialistIds: string[]) {
  revalidatePath("/network");
  revalidatePath("/leagues");
  revalidatePath("/slip");
  for (const id of specialistIds) revalidatePath(`/specialists/${id}`);
}

export async function unfollowSpecialist(specialistId: string, leagueId: string): Promise<NetworkActionResult> {
  const session = await getSession();
  if (!session) return { ok: false, message: "Sign in to manage your network." };
  const parsed = choiceSchema.safeParse({ specialistId, leagueId });
  if (!parsed.success) return { ok: false, message: "That specialist or league is invalid." };
  await sqlClient`delete from league_follows where follower_user_id = ${session.user.id}
    and specialist_user_id = ${parsed.data.specialistId} and league_id = ${parsed.data.leagueId}`;
  refreshNetworkPaths([parsed.data.specialistId]);
  return { ok: true };
}

export async function switchSpecialist(fromSpecialistId: string, toSpecialistId: string, leagueId: string): Promise<NetworkActionResult> {
  const session = await getSession();
  if (!session) return { ok: false, message: "Sign in to manage your network." };
  const parsed = z.object({ fromSpecialistId: z.string().min(1), toSpecialistId: z.string().min(1), leagueId: z.string().uuid() })
    .safeParse({ fromSpecialistId, toSpecialistId, leagueId });
  if (!parsed.success || parsed.data.fromSpecialistId === parsed.data.toSpecialistId || parsed.data.toSpecialistId === session.user.id) {
    return { ok: false, message: "That specialist switch is invalid." };
  }

  const changed = await sqlClient.begin(async (sql) => {
    const [target] = await sql<Array<{ id: string }>>`
      select r.user_id id from user_league_records r join leagues l on l.id = r.league_id
      where r.user_id = ${parsed.data.toSpecialistId} and r.league_id = ${parsed.data.leagueId}
        and r.settled_picks >= ${MINIMUM_SETTLED_PICKS_FOR_RANK} and l.enabled = true`;
    if (!target) return false;
    const removed = await sql`
      delete from league_follows where follower_user_id = ${session.user.id}
        and specialist_user_id = ${parsed.data.fromSpecialistId} and league_id = ${parsed.data.leagueId}
      returning specialist_user_id`;
    if (removed.count === 0) return false;
    await sql`insert into league_follows (follower_user_id, specialist_user_id, league_id)
      values (${session.user.id}, ${parsed.data.toSpecialistId}, ${parsed.data.leagueId}) on conflict do nothing`;
    return true;
  });
  if (!changed) return { ok: false, message: "That switch is no longer available. Refresh and try again." };
  refreshNetworkPaths([parsed.data.fromSpecialistId, parsed.data.toSpecialistId]);
  return { ok: true };
}
