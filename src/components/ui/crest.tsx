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
 * The tile is dark-mode only. On a light page a dark crest is already legible,
 * so a white square there is just a patch of paper — visible now that the page
 * itself is a shade off white. The padding stays in both themes so a crest is
 * the same size whichever one you are in.
 *
 * This does not rescue a crest drawn in white, which has nowhere to show on a
 * white tile either. If any turn up they need a dark tile, not this one.
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
      className={cn("flex shrink-0 items-center justify-center overflow-hidden dark:bg-white", className)}
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
