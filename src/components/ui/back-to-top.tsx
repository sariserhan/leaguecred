"use client";

import { useEffect, useState } from "react";
import { ArrowUpIcon } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Returns to the top of a long page.
 *
 * Hidden until there is enough behind you to be worth skipping, so it never
 * covers content on a page short enough to scroll back by hand.
 *
 * Scrolling is smooth unless the reader has asked for less motion, in which case
 * it jumps: a long page smooth-scrolling for several seconds is exactly what
 * that setting exists to prevent.
 */
export function BackToTop({ after = 900, className }: { after?: number; className?: string }) {
  const [shown, setShown] = useState(false);

  useEffect(() => {
    let frame = 0;
    const read = () => {
      frame = 0;
      setShown(window.scrollY > after);
    };
    const onScroll = () => {
      // One read per frame: the handler fires far more often than the value
      // can change anything.
      if (frame === 0) frame = window.requestAnimationFrame(read);
    };

    read();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame !== 0) window.cancelAnimationFrame(frame);
    };
  }, [after]);

  function toTop() {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });
  }

  return (
    <button
      type="button"
      onClick={toTop}
      aria-label="Back to top"
      // Kept in the tree and hidden, so it fades rather than appearing abruptly,
      // and is taken out of the tab order while it is not offered.
      aria-hidden={!shown}
      tabIndex={shown ? 0 : -1}
      className={cn(
        "fixed right-4 bottom-4 z-40 flex size-11 items-center justify-center border border-primary bg-foreground text-background shadow-lg transition-all",
        "hover:bg-primary hover:text-primary-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        shown ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-2 opacity-0",
        className,
      )}
    >
      <ArrowUpIcon aria-hidden="true" className="size-5" />
    </button>
  );
}
