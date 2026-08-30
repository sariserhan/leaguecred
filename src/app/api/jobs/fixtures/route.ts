import { isAuthorizedCronRequest } from "@/lib/cron-auth";
import { synchronizeFreeFixtureSources } from "@/services/free-fixture-sync";

export const maxDuration = 60;

async function synchronize(request: Request) {
  if (!isAuthorizedCronRequest(request)) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const result = await synchronizeFreeFixtureSources();
  return Response.json(result);
}

export const GET = synchronize;
export const POST = synchronize;
