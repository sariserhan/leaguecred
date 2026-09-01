"use client";

import { useEffect } from "react";

/**
 * Keeps a page's own bottom bar from being covered by the slip and lock docks.
 *
 * The docks are pinned to the bottom-right of every page, so anything else a
 * page pins down there - a "2 calls ready" bar, a comparison tray - loses its
 * buttons underneath them. Rather than each page guessing at a right-hand
 * margin, the page says how tall its bar is while the bar is up and the docks
 * rise by that much.
 *
 * Set on the document element because the docks are rendered by the layout,
 * above every page in the tree, so nothing a page renders can reach them by
 * props or context.
 */
export function useDockClearance(active: boolean, height = "5.5rem") {
  useEffect(() => {
    const root = document.documentElement;
    if (!active) {
      root.style.removeProperty("--dock-bottom");
      return undefined;
    }

    root.style.setProperty("--dock-bottom", height);
    return () => { root.style.removeProperty("--dock-bottom"); };
  }, [active, height]);
}
