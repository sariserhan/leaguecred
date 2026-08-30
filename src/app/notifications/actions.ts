"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { sqlClient } from "@/db";
import { getSession } from "@/lib/auth-session";
async function userId(){return (await getSession())?.user.id}
export async function markNotificationRead(id:string){const uid=await userId();if(!uid)return;const parsed=z.string().uuid().safeParse(id);if(!parsed.success)return;await sqlClient`update notifications set read_at=coalesce(read_at,now()) where id=${parsed.data} and user_id=${uid}`;revalidatePath("/")}
export async function markAllNotificationsRead(){const uid=await userId();if(!uid)return;await sqlClient`update notifications set read_at=now() where user_id=${uid} and read_at is null`;revalidatePath("/")}
const prefs=z.object({lockDeadlines:z.boolean(),specialistLocks:z.boolean(),pickResults:z.boolean(),followedResults:z.boolean()});
export async function saveNotificationPreferences(input:z.infer<typeof prefs>){const uid=await userId();if(!uid)return;const p=prefs.parse(input);await sqlClient`insert into notification_preferences(user_id,lock_deadlines,specialist_locks,pick_results,followed_results) values(${uid},${p.lockDeadlines},${p.specialistLocks},${p.pickResults},${p.followedResults}) on conflict(user_id) do update set lock_deadlines=excluded.lock_deadlines,specialist_locks=excluded.specialist_locks,pick_results=excluded.pick_results,followed_results=excluded.followed_results,updated_at=now()`;revalidatePath("/")}
