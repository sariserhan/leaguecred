/**
 * The install icons are rendered from the brand mark in `brand-logo.tsx` rather
 * than checked in as PNGs, so there is one drawing of the mark to keep in step
 * rather than five. Each variant is addressed as `purpose-size`: the size a
 * launcher asks for, and whether the launcher is free to crop it.
 */
export const PWA_ICON_VARIANTS = ["any-192", "any-512", "maskable-192", "maskable-512"] as const;

export type PwaIconVariant = (typeof PWA_ICON_VARIANTS)[number];

export type PwaIcon = {
  purpose: "any" | "maskable";
  size: number;
  /**
   * How much of the square the mark itself fills. A maskable icon is cropped to
   * whatever shape the launcher likes — a circle, a squircle, a rounded square —
   * and only the middle 80% of the width is guaranteed to survive. Drawing the
   * mark at 60% keeps its corners clear of every crop; an "any" icon is shown
   * whole, so it can sit close to the edge.
   */
  scale: number;
};

export function parsePwaIconVariant(variant: string): PwaIcon | null {
  if (!(PWA_ICON_VARIANTS as readonly string[]).includes(variant)) return null;
  const [purpose, size] = variant.split("-") as ["any" | "maskable", string];
  return { purpose, size: Number(size), scale: purpose === "maskable" ? 0.6 : 0.82 };
}

export function pwaIconUrl(variant: PwaIconVariant): string {
  return `/icons/${variant}`;
}

/**
 * Safari offers no install prompt to trigger, so an iPhone or iPad gets written
 * instructions instead of a button that would do nothing. iPadOS 13 and later
 * report the desktop Safari user agent, which is why a Mac claiming more than
 * one touch point counts: real Macs report none.
 */
export function isIosDevice(userAgent: string, maxTouchPoints = 0): boolean {
  if (/iPad|iPhone|iPod/.test(userAgent)) return true;
  return /Macintosh/.test(userAgent) && maxTouchPoints > 1;
}
