import { isAuthorizedCronRequest } from "@/lib/cron-auth";
import { runJobSteps } from "@/lib/job-steps";
import { synchronizeMatchResults } from "@/services/result-sync";
import { settlePendingPicks } from "@/services/settlement";

export const maxDuration = 300;

/**
 * The hourly pair: pull scores for matches already scheduled, then settle the
 * picks those scores decide. Settlement reads what the sync just wrote, so the
 * two are chained here rather than left to two crons and a hopeful gap.
 *
 * Deliberately not the nightly chain. This one never builds the schedule and
 * never touches logos or catalogue health: it costs one provider request per
 * league that actually played, and nothing at all on a quiet hour.
 */
const steps = [
  ["results", () => synchronizeMatchResults()],
  ["settlement", () => settlePendingPicks()],
] as const;

async function runResults(request: Request) {
  if (!isAuthorizedCronRequest(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { ok, results } = await runJobSteps(steps);

  return Response.json({ ok, ...results }, { status: ok ? 200 : 500 });
}

export const GET = runResults;
export const POST = runResults;
