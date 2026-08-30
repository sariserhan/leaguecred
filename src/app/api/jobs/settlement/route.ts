import { isAuthorizedCronRequest } from "@/lib/cron-auth";
import { settlePendingPicks } from "@/services/settlement";

// Settling walks every finished fixture with a pending pick, one transaction
// each, so give it room on a backlog.
export const maxDuration = 300;

async function settle(request: Request) {
  if (!isAuthorizedCronRequest(request)) return Response.json({ error: "Unauthorized" }, { status: 401 });
  return Response.json(await settlePendingPicks());
}

// Vercel Cron issues GET. POST stays for manual schedulers and curl.
export const GET = settle;
export const POST = settle;
