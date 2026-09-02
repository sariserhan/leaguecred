"use client";

import { useState } from "react";
import { RotateCwIcon } from "lucide-react";

import { Button } from "@/components/ui/button";

/** A reload rather than a router refresh: the offline page is served by the
 *  service worker in place of the page that was asked for, so what should come
 *  back on retry is that page, not this one re-rendered. */
export function OfflineRetry() {
  const [retrying, setRetrying] = useState(false);

  return (
    <Button
      size="lg"
      disabled={retrying}
      onClick={() => {
        setRetrying(true);
        window.location.reload();
      }}
    >
      <RotateCwIcon data-icon="inline-start" />
      {retrying ? "Reconnecting…" : "Try again"}
    </Button>
  );
}
