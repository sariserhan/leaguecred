import { serverEnv } from "@/lib/env";

export function isAuthorizedCronRequest(request: Request) {
  if (!serverEnv.cronSecret) return false;
  const authorization = request.headers.get("authorization");
  const explicitSecret = request.headers.get("x-cron-secret");
  return authorization === `Bearer ${serverEnv.cronSecret}` || explicitSecret === serverEnv.cronSecret;
}
