import { isAuthorizedCronRequest } from "@/lib/cron-auth";
import { sendLockReminders } from "@/services/lock-reminders";

// One provider call per candidate, so a large matchweek needs the headroom.
export const maxDuration = 300;

async function remind(request: Request) {
  if (!isAuthorizedCronRequest(request)) return Response.json({ error: "Unauthorized" }, { status: 401 });
  return Response.json(await sendLockReminders());
}

// Vercel Cron issues GET. POST stays for manual schedulers and curl.
export const GET = remind;
export const POST = remind;
