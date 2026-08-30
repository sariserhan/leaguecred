"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { sqlClient } from "@/db";
import { getSession } from "@/lib/auth-session";

const profileSchema = z.object({ name: z.string().trim().min(2).max(80) });

export async function updateProfile(input: z.infer<typeof profileSchema>) {
  const session = await getSession();
  if (!session) return { ok: false as const, message: "Sign in to update your profile." };
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, message: "Use a name between 2 and 80 characters." };
  await sqlClient`update "user" set name = ${parsed.data.name}, updated_at = now() where id = ${session.user.id}`;
  revalidatePath("/");
  revalidatePath("/settings");
  revalidatePath(`/specialists/${session.user.id}`);
  return { ok: true as const, message: "Profile updated." };
}
