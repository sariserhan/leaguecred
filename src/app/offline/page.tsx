import type { Metadata } from "next";
import { WifiOffIcon } from "lucide-react";

import { OfflineRetry } from "@/components/offline-retry";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

/**
 * The page the service worker serves when a navigation cannot reach the
 * network. It is precached signed-out and unchanged for everyone, so it says
 * nothing about who is looking at it.
 */
export const metadata: Metadata = {
  title: "Offline",
  description: "LeagueCred could not reach the network.",
  robots: { index: false, follow: false },
};

export default function OfflinePage() {
  return (
    <div className="page-shell grid min-h-[calc(100vh-5rem)] place-items-center py-16 text-center">
      <div className="flex max-w-xl flex-col items-center gap-6">
        <WifiOffIcon aria-hidden="true" className="size-16 text-primary" />
        <h1 className="section-title">No connection.</h1>
        <p className="text-muted-foreground">
          LeagueCred needs the network for fixtures, locks and records — all of it moves
          too fast to keep a copy on your phone. Your locks are safe on the server; nothing
          you had already saved is lost.
        </p>
        <OfflineRetry />
      </div>
    </div>
  );
}
