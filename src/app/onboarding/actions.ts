"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { sqlClient } from "@/db";
import { getSession } from "@/lib/auth-session";

const preferencesSchema = z.object({ known: z.array(z.string().min(1)).max(25), help: z.array(z.string().min(1)).max(25) });
export async function saveLeaguePreferences(input: z.infer<typeof preferencesSchema>) {
  const session = await getSession();
  if (!session) return { ok: false as const, message: "Sign in to save your league preferences." };
  const parsed = preferencesSchema.safeParse(input);
  if (!parsed.success || parsed.data.known.length === 0) return { ok: false as const, message: "Choose at least one league you know." };
  if (parsed.data.known.some((slug) => parsed.data.help.includes(slug))) return { ok: false as const, message: "A league cannot be in both preference lists." };
  const choices = [...parsed.data.known.map((slug) => ({ slug, kind: "know" })), ...parsed.data.help.map((slug) => ({ slug, kind: "help" }))];
  await sqlClient.begin(async (sql) => {
    await sql`delete from user_league_preferences where user_id = ${session.user.id}`;
    for (const choice of choices) await sql`insert into user_league_preferences (user_id, league_id, kind) select ${session.user.id}, id, ${choice.kind}::league_preference_kind from leagues where slug = ${choice.slug} and enabled = true`;
  });
  revalidatePath("/leagues"); revalidatePath(`/specialists/${session.user.id}`); revalidatePath("/onboarding"); revalidatePath("/network");
  return { ok: true as const };
}
