"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { sqlClient } from "@/db";
import { getSession } from "@/lib/auth-session";

const profileSchema = z.object({ name: z.string().trim().min(2).max(80), bio:z.string().trim().max(160), image:z.string().trim().url().max(500).or(z.literal("")), profileTheme:z.enum(["pitch-dark","paper-light","high-contrast"]), featuredLeagueId:z.string().uuid().nullable(), pinnedMilestone:z.string().max(80).nullable() });

export async function updateProfile(input: z.infer<typeof profileSchema>) {
  const session = await getSession();
  if (!session) return { ok: false as const, message: "Sign in to update your profile." };
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, message: "Use a name between 2 and 80 characters." };
  await sqlClient`update "user" set name=${parsed.data.name}, bio=${parsed.data.bio||null}, image=${parsed.data.image||null}, profile_theme=${parsed.data.profileTheme}, featured_league_id=${parsed.data.featuredLeagueId}, pinned_milestone=${parsed.data.pinnedMilestone}, updated_at=now() where id=${session.user.id}`;
  revalidatePath("/");
  revalidatePath("/settings");
  revalidatePath(`/specialists/${session.user.id}`);
  return { ok: true as const, message: "Profile updated." };
}
