import { redirect } from "next/navigation";

import { viewerIsAdmin } from "@/lib/admin";
import { shouldServeMaintenance } from "@/lib/site-settings";
import { getSiteSettings } from "@/services/site-settings";

/**
 * Called at the top of every public page.
 *
 * The order matters more than it looks. Whether maintenance is on is a cached
 * read; who is asking is not, and reading the session here is what used to make
 * every public route dynamic — no page could prerender because all of them
 * began by asking who you were.
 *
 * Maintenance is off virtually always, and when it is off the answer does not
 * depend on the viewer at all. So the settings are checked first and the common
 * path returns without ever touching the session, which lets those pages
 * prerender. Only the rare deliberate state of being in maintenance costs a
 * session read, and a site in maintenance is not one whose speed is the
 * concern.
 *
 * `updateTag` in the admin action is what makes switching it on immediate.
 */
export async function enforceMaintenanceGate() {
  const settings = await getSiteSettings();
  if (!settings.maintenanceEnabled) return;

  if (
    shouldServeMaintenance({
      maintenanceEnabled: true,
      viewerIsAdmin: await viewerIsAdmin(),
    })
  ) {
    redirect("/maintenance");
  }
}
