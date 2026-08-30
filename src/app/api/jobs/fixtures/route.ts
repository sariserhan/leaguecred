import { ApiFootballProvider } from "@/providers/api-football";
import { isAuthorizedCronRequest } from "@/lib/cron-auth";
import { synchronizeFixtures } from "@/services/fixture-sync";

export async function POST(request: Request) {
  if (!isAuthorizedCronRequest(request)) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const result = await synchronizeFixtures(new ApiFootballProvider());
  return Response.json(result);
}
