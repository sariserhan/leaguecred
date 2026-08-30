import { isAuthorizedCronRequest } from "@/lib/cron-auth";
import { settlePendingPicks } from "@/services/settlement";

export async function POST(request: Request) {
  if (!isAuthorizedCronRequest(request)) return Response.json({ error: "Unauthorized" }, { status: 401 });
  return Response.json(await settlePendingPicks());
}
