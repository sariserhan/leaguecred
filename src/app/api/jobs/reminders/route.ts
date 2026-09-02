import { isAuthorizedCronRequest } from "@/lib/cron-auth";
import { runJobSteps } from "@/lib/job-steps";
import { completeJobRun } from "@/services/job-run";
import { sendLockReminders } from "@/services/lock-reminders";
import { sendSpecialistLockNotifications } from "@/services/specialist-lock-notifications";

// One provider call per candidate, so a large matchweek needs the headroom.
export const maxDuration = 300;

// A Hobby project gets two cron jobs, both already spent on /daily and this
// route, so a new kind of reminder mail is a step here rather than a third cron.
const steps = [
  ["lockReminders", () => sendLockReminders()],
  ["specialistLockNotifications", () => sendSpecialistLockNotifications()],
] as const;

async function remind(request: Request) {
  if (!isAuthorizedCronRequest(request)) return Response.json({ error: "Unauthorized" }, { status: 401 });
  // Reports the run before answering: a non-2xx marks it failed in the Vercel
  // cron log, and a failed step also reaches ALERT_EMAIL when one is set.
  return completeJobRun("reminders", await runJobSteps(steps));
}

// Vercel Cron issues GET. POST stays for manual schedulers and curl.
export const GET = remind;
export const POST = remind;
