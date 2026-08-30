import { isAuthorizedCronRequest } from "@/lib/cron-auth";
import { sendLockReminders } from "@/services/lock-reminders";

export async function POST(request: Request) {
  if (!isAuthorizedCronRequest(request)) return Response.json({ error: "Unauthorized" }, { status: 401 });
  return Response.json(await sendLockReminders());
}
