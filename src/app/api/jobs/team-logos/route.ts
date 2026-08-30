import { isAuthorizedCronRequest } from "@/lib/cron-auth";
import {
  synchronizeEspnTeamLogos,
  synchronizeFootballDataOrgLogos,
  synchronizeMissingTeamLogos,
  synchronizeTheSportsDbLogos,
} from "@/services/team-logo-sync";

export const maxDuration = 60;

async function synchronize(request: Request) {
  if (!isAuthorizedCronRequest(request)) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const footballDataOrg = await synchronizeFootballDataOrgLogos();
  const espn = await synchronizeEspnTeamLogos();
  const theSportsDb = await synchronizeTheSportsDbLogos();
  const apiFootball = await synchronizeMissingTeamLogos({ maxRequests: 8 });
  return Response.json({ footballDataOrg, espn, theSportsDb, apiFootball });
}

export const GET = synchronize;
export const POST = synchronize;
