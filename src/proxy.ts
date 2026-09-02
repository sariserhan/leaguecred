import { NextResponse, type NextRequest } from "next/server";

import { sqlClient } from "@/db";
import { auth } from "@/lib/auth";
import { shouldServeMaintenance } from "@/lib/site-settings";

/**
 * The maintenance wall.
 *
 * It used to be a call at the top of eight page bodies. That stopped working
 * when those pages became prerenderable: a page that prerenders answers its own
 * body at build time, so the gate was decided once, while maintenance was off,
 * and frozen into the shell — the switch was wired to nothing on / and
 * /fixtures. It also only ever covered the eight pages that remembered to call
 * it; /communities, /recaps, /live-locks and /teams/* never were walled at all.
 *
 * A proxy runs before the cache, on every request, whether or not the route it
 * is protecting was prerendered. That is what a site-wide wall needs to be.
 */

/**
 * Maintenance is off virtually always, so the check has to be cheap. Held for a
 * few seconds in the instance rather than read per request: the difference
 * between a wall going up now and going up within five seconds does not matter,
 * and a query on every request to every page very much does.
 *
 * Correctness never depends on this surviving — an instance that has just
 * started simply reads.
 */
const SETTINGS_TTL_MS = 5_000;
let cachedSetting: { readAt: number; enabled: boolean } | null = null;

async function maintenanceIsOn(): Promise<boolean> {
  const now = Date.now();
  if (cachedSetting && now - cachedSetting.readAt < SETTINGS_TTL_MS) return cachedSetting.enabled;

  try {
    const [row] = await sqlClient<Array<{ maintenance_enabled: boolean }>>`
      select maintenance_enabled from app_settings where id = 'global'`;
    cachedSetting = { readAt: now, enabled: row?.maintenance_enabled ?? false };
  } catch (error) {
    // Fails open, in the same direction the settings read fails: a database
    // problem must not raise a wall nobody asked for and nobody can lower.
    console.error("Maintenance check failed; treating the site as open.", error);
    cachedSetting = { readAt: now, enabled: false };
  }

  return cachedSetting.enabled;
}

export async function proxy(request: NextRequest) {
  if (!(await maintenanceIsOn())) return NextResponse.next();

  // An admin keeps browsing the real site. Without this the only way out of
  // maintenance would be the database, which is the situation the admin panel
  // exists to avoid.
  const session = await auth.api.getSession({ headers: request.headers }).catch(() => null);
  const viewerIsAdmin = session
    ? await sqlClient<Array<{ role: string }>>`select role from "user" where id = ${session.user.id}`
        .then(([row]) => row?.role === "admin")
        .catch(() => false)
    : false;

  if (!shouldServeMaintenance({ maintenanceEnabled: true, viewerIsAdmin })) {
    return NextResponse.next();
  }

  return NextResponse.redirect(new URL("/maintenance", request.url));
}

export const config = {
  /**
   * Everything except the ways back in and the things that are not pages.
   *
   * `/auth` and `/admin` stay reachable on purpose: an administrator who is not
   * signed in has to be able to sign in and turn the wall off, and walling the
   * sign-in page would make the wall impossible to lower from the product.
   * `/api` stays open so that sign-in and the cron jobs keep working, and
   * `/maintenance` itself would otherwise redirect to itself forever.
   */
  matcher: [
    "/((?!api|_next/static|_next/image|auth|admin|maintenance|sw\\.js|manifest\\.webmanifest|icons|icon|apple-icon|opengraph-image|robots\\.txt|sitemap\\.xml|favicon\\.ico|.*\\.(?:avif|webp|jpg|jpeg|png|svg|ico)).*)",
  ],
};
