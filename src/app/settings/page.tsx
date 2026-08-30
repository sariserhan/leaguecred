import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AccountSettings } from "@/components/settings/account-settings";
import { getNotificationCenter } from "@/data/notifications";
import { getSession } from "@/lib/auth-session";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Settings", robots: { index: false, follow: false } };

export default async function SettingsPage() {
  const session = await getSession();
  if (!session) redirect("/auth?next=/settings");
  const notifications = await getNotificationCenter(session.user.id);
  return <AccountSettings user={{ name: session.user.name, email: session.user.email, id: session.user.id }} initialPreferences={notifications.preferences} />;
}
