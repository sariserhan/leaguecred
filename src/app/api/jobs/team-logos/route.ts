import { isAuthorizedCronRequest } from "@/lib/cron-auth";
import { synchronizeMissingTeamLogos } from "@/services/team-logo-sync";

export const maxDuration = 60;

async function synchronize(request: Request) {
  if (!isAuthorizedCronRequest(request)) return Response.json({ error: "Unauthorized" }, { status: 401 });
  return Response.json(await synchronizeMissingTeamLogos({ maxRequests: 8 }));
}

export const GET = synchronize;
export const POST = synchronize;
