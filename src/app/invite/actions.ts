"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

import { sqlClient } from "@/db";
import { getSession } from "@/lib/auth-session";
import { withinUserRateLimit } from "@/services/rate-limit";

const REFERRAL_COOKIE = "leaguecred_referral";

export async function claimPendingReferral() {
  const session = await getSession();
  if (!session) return { ok: false as const };
  const store = await cookies();
  const code = store.get(REFERRAL_COOKIE)?.value?.trim();
  if (!code) return { ok: true as const };

  await sqlClient.begin(async (sql) => {
    const [inviter] = await sql<Array<{ id: string }>>`
      select id from "user" where lower(referral_code)=lower(${code}) and id<>${session.user.id} limit 1`;
    if (!inviter) return;
    await sql`insert into referrals (inviter_user_id, invited_user_id, code)
      values (${inviter.id}, ${session.user.id}, ${code}) on conflict (invited_user_id) do nothing`;
    await sql`update "user" set referred_by_user_id=${inviter.id}, acquisition_source='member_referral', updated_at=now()
      where id=${session.user.id} and referred_by_user_id is null`;
  });
  store.delete(REFERRAL_COOKIE);
  revalidatePath("/invite");
  return { ok: true as const };
}

export async function becomeCommunityCaptain() {
  const session = await getSession();
  if (!session) return { ok: false as const, message: "Sign in to represent a community." };
  if (!await withinUserRateLimit("becomeCommunityCaptain", session.user.id)) return { ok: false as const, message: "Wait a moment and try again." };
  const result = await sqlClient.begin(async (sql) => {
    const [identity] = await sql<Array<{ primary_team_id: string | null }>>`
      select primary_team_id from "user" where id=${session.user.id} for update`;
    if (!identity?.primary_team_id) return "Choose the club you represent first.";
    const [captain] = await sql<Array<{ id: string }>>`
      select id from "user" where primary_team_id=${identity.primary_team_id} and community_role='captain' limit 1`;
    if (captain && captain.id !== session.user.id) return "This community already has a captain. You can still join as a founding member.";
    await sql`update "user" set community_role='captain', updated_at=now() where id=${session.user.id}`;
    return null;
  });
  if (result) return { ok: false as const, message: result };
  revalidatePath("/invite"); revalidatePath("/challenges"); revalidatePath(`/specialists/${session.user.id}`);
  return { ok: true as const };
}
