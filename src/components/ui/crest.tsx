import Image from "next/image";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * A club or competition badge on a light tile.
 *
 * Crests arrive from the providers as transparent PNGs, and a great many of them
 * are drawn in near-black: Juventus, Newcastle, Beşiktaş. On a dark page those
 * simply disappear, and no amount of lightening the theme fixes it — a dark
 * crest on any dark surface is invisible. The tile gives every badge the pale
 * background it was designed against, which is what a printed programme or a
 * television graphic does for the same reason.
 *
 * It is deliberately the same tile in both themes. In light mode it is close
 * enough to the page to disappear; in dark mode it is the thing doing the work.
 */
export function Crest({
  src,
  alt = "",
  size,
  fallback,
  className,
}: {
  src?: string | null;
  /** Empty by default: a badge beside the club's name is decoration, and
   * reading the name twice helps nobody using a screen reader. */
  alt?: string;
  /** Rendered size in pixels, tile included. */
  size: number;
  /** Shown when the club has no badge — usually its short name. */
  fallback?: ReactNode;
  className?: string;
}) {
  const padding = Math.max(2, Math.round(size * 0.12));
  const inner = size - padding * 2;

  return (
    <span
      className={cn("flex shrink-0 items-center justify-center overflow-hidden bg-white", className)}
      style={{ width: size, height: size, padding }}
    >
      {src ? (
        <Image src={src} alt={alt} width={inner} height={inner} className="h-full w-full object-contain" />
      ) : (
        fallback
      )}
    </span>
  );
}
