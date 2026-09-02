"use client";

import { useEffect, useRef } from "react";

import { toast } from "@/components/ui/toast";

/**
 * Registers the service worker and, when a deploy lands while someone has the
 * app open, offers them the new version rather than taking it. The waiting
 * worker only takes over once they say so, because swapping the assets under a
 * running page is how a half-updated screen happens.
 */
export function ServiceWorkerManager() {
  const reloadOnTakeover = useRef(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    // `next dev` serves unhashed chunks that change without their URL changing,
    // which the cache-first rules would happily serve stale forever. So the
    // worker is production-only, and a development session actively clears one
    // left behind by a local production build.
    if (process.env.NODE_ENV !== "production") {
      void navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (const registration of registrations) void registration.unregister();
      });
      return;
    }

    function offerUpdate(worker: ServiceWorker) {
      toast.add({
        id: "app-update",
        title: "A new version is ready",
        description: "Reload to pick up the latest LeagueCred.",
        type: "info",
        timeout: 0,
        actionProps: {
          children: "Reload",
          onClick: () => {
            reloadOnTakeover.current = true;
            worker.postMessage({ type: "SKIP_WAITING" });
          },
        },
      });
    }

    const takeover = () => {
      if (!reloadOnTakeover.current) return;
      reloadOnTakeover.current = false;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener("controllerchange", takeover);

    void navigator.serviceWorker
      .register("/sw.js", { scope: "/", updateViaCache: "none" })
      .then((registration) => {
        if (registration.waiting) offerUpdate(registration.waiting);

        registration.addEventListener("updatefound", () => {
          const installing = registration.installing;
          if (!installing) return;
          installing.addEventListener("statechange", () => {
            // Installed with a controller already in place means this is a
            // replacement waiting its turn, not the very first install.
            if (installing.state === "installed" && navigator.serviceWorker.controller) offerUpdate(installing);
          });
        });
      })
      .catch(() => {
        // A blocked or unsupported worker costs nothing here: every page still
        // works, it just works online only.
      });

    return () => navigator.serviceWorker.removeEventListener("controllerchange", takeover);
  }, []);

  return null;
}
