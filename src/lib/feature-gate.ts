import { notFound } from "next/navigation";

import { isFeatureEnabled } from "@/lib/site-settings";
import { getFeatureFlags } from "@/services/site-settings";

export async function featureEnabled(key: string) {
  return isFeatureEnabled(await getFeatureFlags(), key);
}

/**
 * Called at the top of a page a flag owns. A switched-off feature answers 404
 * rather than a "come back later" screen: the route is not meant to exist while
 * the flag is down, and a soft page would still be linkable and indexable.
 */
export async function enforceFeatureGate(key: string) {
  if (!(await featureEnabled(key))) notFound();
}
