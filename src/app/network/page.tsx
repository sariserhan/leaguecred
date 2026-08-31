import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { NetworkHub } from "@/components/network/network-hub";
import { getNetworkHub } from "@/data/network";
import { getNotificationCenter } from "@/data/notifications";
import { getSession } from "@/lib/auth-session";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Your Network", description: "Manage your leagues, specialists, and LeagueCred notifications.", robots: { index: false, follow: false } };

export default async function NetworkPage() {
  const session = await getSession();
  if (!session) redirect("/auth?next=/network");
  const [network, notifications] = await Promise.all([getNetworkHub(session.user.id), getNotificationCenter(session.user.id)]);
  return <NetworkHub initialData={network} initialPreferences={notifications.preferences} />;
}
