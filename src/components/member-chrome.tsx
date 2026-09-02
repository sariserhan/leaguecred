import { getLockedGames, getViewerHandle } from "@/data/locked-games";
import { getNotificationCenter } from "@/data/notifications";
import { getSlipCandidates } from "@/data/slip-candidates";
import { getSession } from "@/lib/auth-session";
import { MobileMemberNav } from "@/components/mobile-member-nav";
import { SlipDock } from "@/components/slip/slip-dock";

/**
 * Everything a signed-in member gets pinned to the bottom of the screen.
 *
 * The spacer replaces the `pb-16 md:pb-0` that used to sit on `<main>`. That
 * class needed the session to decide itself, which is the one thing the layout
 * can no longer ask for; rendered here instead, between the main element and
 * the footer, it leaves the same gap in the same place, and only for the people
 * who have a navigation bar covering it.
 */
export async function MemberChrome({ liveLocksEnabled }: { liveLocksEnabled: boolean }) {
  const session = await getSession();
  if (!session) return null;

  const [notificationCenter, slipCandidates, lockedGames, viewerHandle] = await Promise.all([
    getNotificationCenter(session.user.id),
    getSlipCandidates(session.user.id),
    getLockedGames(session.user.id),
    getViewerHandle(session.user.id),
  ]);

  return (
    <>
      <div className="h-16 md:hidden" aria-hidden="true" />
      <SlipDock candidates={slipCandidates} locked={lockedGames} />
      <MobileMemberNav
        userId={viewerHandle ?? session.user.id}
        liveLocksEnabled={liveLocksEnabled}
        unread={notificationCenter.items.filter((item) => !item.readAt).length}
      />
    </>
  );
}
