import { redirect } from "next/navigation";

import { viewerIsAdmin } from "@/lib/admin";
import { shouldServeMaintenance } from "@/lib/site-settings";
import { getSiteSettings } from "@/services/site-settings";

/**
 * Called at the top of every public page. Reading the session here is also what
 * keeps these routes dynamic, so an operator toggling maintenance takes effect
 * on the next request instead of being frozen into a prerendered page.
 */
export async function enforceMaintenanceGate() {
  const [settings, isAdmin] = await Promise.all([getSiteSettings(), viewerIsAdmin()]);

  if (
    shouldServeMaintenance({
      maintenanceEnabled: settings.maintenanceEnabled,
      viewerIsAdmin: isAdmin,
    })
  ) {
    redirect("/maintenance");
  }
}
