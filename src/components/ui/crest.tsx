import Image from "next/image";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * A club or competition badge.
 *
 * Club crests do not need a backing. They are full-colour shields designed to
 * be seen from a stand, and they read on a dark page as well as a light one —
 * checked across two full league tables, Juventus and Beşiktaş included.
 *
 * Competition logos are the exception. Those are wordmarks, often black type on
 * transparency, and on a dark page they simply vanish. Those pass `plate`, which
 * puts them on the pale ground they were drawn against, the way a printed
 * programme does for the same reason. It is a dark-mode concern only: on a light
 * page nothing here needs help.
 */
export function Crest({
  src,
  alt = "",
  size,
  fallback,
  plate = false,
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
  /** For a wordmark that would disappear on a dark page. Competition logos, not crests. */
  plate?: boolean;
  className?: string;
}) {
  const padding = Math.max(2, Math.round(size * 0.12));
  const inner = size - padding * 2;

  return (
    <span
      className={cn("flex shrink-0 items-center justify-center overflow-hidden", plate && "dark:bg-white", className)}
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
