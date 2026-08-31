import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { NotificationInbox } from "@/components/notifications/notification-inbox";
import { getNotificationInbox } from "@/data/notifications";
import { getSession } from "@/lib/auth-session";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Notifications" };

export default async function NotificationsPage() {
  const session = await getSession();
  if (!session) redirect("/auth?next=/notifications");
  return <NotificationInbox initialItems={await getNotificationInbox(session.user.id)} />;
}
