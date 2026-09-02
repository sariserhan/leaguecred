import { getNotificationCenter } from "@/data/notifications";
import { getViewerHandle } from "@/data/locked-games";
import type { LeagueNavOption } from "@/data/teams";
import { viewerIsAdmin } from "@/lib/admin";
import { getSession } from "@/lib/auth-session";
import { SiteHeader } from "@/components/site-header";

export type HeaderFlags = {
  challengeEnabled: boolean;
  liveLocksEnabled: boolean;
  leaderboardEnabled: boolean;
};

/**
 * The header once the viewer is known, streamed in behind the shell.
 *
 * The header decides signed-in from signed-out on the client, through
 * `authClient.useSession()`, so the shell version below is not a signed-out
 * header waiting to be corrected — it is the same header without three details
 * that need a database round trip: the notification bell's contents, the
 * handle a profile link points at, and whether to offer the admin entry. They
 * arrive a moment later and nothing moves when they do.
 */
export async function ViewerHeader({ leagues, ...flags }: { leagues: LeagueNavOption[] } & HeaderFlags) {
  const session = await getSession();
  const [isAdmin, notificationCenter, viewerHandle] = session
    ? await Promise.all([
        viewerIsAdmin(),
        getNotificationCenter(session.user.id),
        getViewerHandle(session.user.id),
      ])
    : [false, null, null];

  return (
    <SiteHeader
      isAdmin={isAdmin}
      leagues={leagues}
      notificationCenter={notificationCenter}
      viewerHandle={viewerHandle}
      {...flags}
    />
  );
}
