import { z } from "zod";

import { isAuthorizedCronRequest } from "@/lib/cron-auth";
import { correctSettlement } from "@/services/settlement";

const correctionSchema = z.object({
  reason: z.string().trim().min(1).max(500),
});

export async function PATCH(
  request: Request,
  context: RouteContext<"/api/jobs/settlement/[pickId]">,
) {
  if (!isAuthorizedCronRequest(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = correctionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json(
      { error: "A correction reason between 1 and 500 characters is required." },
      { status: 400 },
    );
  }

  const { pickId } = await context.params;
  const corrected = await correctSettlement(pickId, parsed.data.reason);

  return Response.json({ corrected });
}
