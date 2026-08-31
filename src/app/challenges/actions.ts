"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { sqlClient } from "@/db";
import { getSession } from "@/lib/auth-session";
import { featureEnabled } from "@/lib/feature-gate";
import { COMMUNITY_CHALLENGE_FLAG } from "@/lib/site-settings";

const sideSchema = z.object({
  challengeId: z.string().uuid(),
  teamId: z.string().uuid(),
});

export async function chooseChallengeSide(formData: FormData) {
  // The form is gone from the page while the flag is down, but the action is a
  // public endpoint either way, so it checks the flag rather than trusting that.
  if (!(await featureEnabled(COMMUNITY_CHALLENGE_FLAG))) throw new Error("The Community Challenge is not available.");

  const parsed = sideSchema.safeParse({
    challengeId: formData.get("challengeId"),
    teamId: formData.get("teamId"),
  });

  if (!parsed.success) throw new Error("That challenge side is not valid.");

  const challengePath = `/challenges/${parsed.data.challengeId}`;
  const session = await getSession();
  if (!session) redirect(`/auth?next=${encodeURIComponent(challengePath)}`);

  const [side] = await sqlClient<Array<{ id: string }>>`
    select t.id
    from fixtures f
    join leagues l on l.id = f.league_id and l.enabled = true
    join teams t on t.id in (f.home_team_id, f.away_team_id)
    where f.id = ${parsed.data.challengeId} and t.id = ${parsed.data.teamId}
    limit 1`;

  if (!side) throw new Error("That club is not part of this challenge.");

  await sqlClient`
    update "user"
    set primary_team_id = ${side.id},
        community_role = case
          when community_role = 'member' and (select count(*) from "user") <= 100
            then 'founding_member'::community_role
          else community_role
        end,
        updated_at = now()
    where id = ${session.user.id}`;

  revalidatePath("/challenges");
  revalidatePath(challengePath);
  revalidatePath(`/specialists/${session.user.id}`);
  revalidatePath("/invite");
  redirect(challengePath);
}
