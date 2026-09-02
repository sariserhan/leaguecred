import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AccountSettings } from "@/components/settings/account-settings";
import { getNotificationCenter } from "@/data/notifications";
import { getSession } from "@/lib/auth-session";
import { sqlClient } from "@/db";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export const metadata: Metadata = { title: "Settings", robots: { index: false, follow: false } };

export default async function SettingsPage() {
  const session = await getSession();
  if (!session) redirect("/auth?next=/settings");
  const [notifications,profile,leagues]=await Promise.all([getNotificationCenter(session.user.id),sqlClient<Array<{username:string|null;bio:string|null;image:string|null;profile_theme:string;featured_league_id:string|null;pinned_milestone:string|null}>>`select username,bio,image,profile_theme,featured_league_id,pinned_milestone from "user" where id=${session.user.id}`,sqlClient<Array<{id:string;name:string}>>`select id,name from leagues where enabled=true order by name`]);
  return <AccountSettings user={{ name: session.user.name, email: session.user.email, id: session.user.id, ...profile[0] }} leagues={leagues} initialPreferences={notifications.preferences} />;
}
