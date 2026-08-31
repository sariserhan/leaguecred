import { isAuthorizedCronRequest } from "@/lib/cron-auth";
import { runJobSteps } from "@/lib/job-steps";
import { measureCatalogHealth } from "@/services/catalog-health";
import { synchronizeFreeFixtureSources } from "@/services/free-fixture-sync";
import { settlePendingPicks } from "@/services/settlement";
import {
  synchronizeEspnTeamLogos,
  synchronizeFootballDataOrgLogos,
  synchronizeMissingTeamLogos,
  synchronizeTheSportsDbLogos,
} from "@/services/team-logo-sync";

export const maxDuration = 300;

/**
 * The nightly chain, in the order the data depends on.
 *
 * Settlement has to run after the fixture sync, or it reads yesterday's scores
 * and settles nothing. Chaining guarantees that ordering; two separate cron
 * entries only hope the gap between them is wide enough. It also keeps the
 * whole schedule inside the two cron jobs a Hobby project is allowed.
 *
 * Each step is independent: one failure is recorded and the rest still run, so
 * a logo provider being down never stops picks from settling. Every step is
 * idempotent, so tomorrow's run recovers whatever failed today.
 */
const steps = [
  ["fixtures", () => synchronizeFreeFixtureSources()],
  ["settlement", () => settlePendingPicks()],
  // Reports, never repairs. Every duplicate this counts came back after being
  // fixed, so something has to notice — but each repair has needed a judgement
  // call the data could not make on its own, and a merge made at 4am by a job
  // nobody watched is how Boca Juniors ends up inside Atlético Junior.
  ["catalogHealth", () => measureCatalogHealth({
    // Two clubs really are called Liverpool, and an undecided playoff tie
    // really is stored twice under placeholder names.
    duplicateClubNames: 1,
    duplicateMatches: 2,
  })],
  ["teamLogos", async () => ({
    footballDataOrg: await synchronizeFootballDataOrgLogos(),
    espn: await synchronizeEspnTeamLogos(),
    theSportsDb: await synchronizeTheSportsDbLogos(),
    apiFootball: await synchronizeMissingTeamLogos({ maxRequests: 8 }),
  })],
] as const;

async function runDaily(request: Request) {
  if (!isAuthorizedCronRequest(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { ok, results } = await runJobSteps(steps);

  // A non-2xx marks the run failed in the Vercel cron log, which is the only
  // place a silent nightly failure would otherwise show up.
  return Response.json({ ok, ...results }, { status: ok ? 200 : 500 });
}

export const GET = runDaily;
export const POST = runDaily;
