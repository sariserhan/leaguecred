/**
 * The address a settled matchweek lives at.
 *
 * It used to be the row's UUID, which made the one page most worth sharing —
 * every call of a finished week, wins and losses together — the one hardest to
 * share, and put an internal primary key in a public URL.
 *
 * The date a week starts is what a supporter would recognise, but it is not
 * unique on its own: a league can hold two weeks that begin on the same day,
 * and the catalogue has a handful. So the slug is stored rather than derived,
 * and a genuine collision takes a numeric suffix. Stored also means stable —
 * a slug cannot drift when a week is renamed or renumbered.
 */
const SLUG_PATTERN = /^\d{4}-\d{2}-\d{2}(?:-\d+)?$/;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** The base slug for a week: the UTC day it starts. */
export function matchweekSlugBase(startAt: Date | string): string {
  const date = typeof startAt === "string" ? new Date(startAt) : startAt;
  return date.toISOString().slice(0, 10);
}

/** The nth week to start on that day. The first keeps the bare date. */
export function matchweekSlugAt(startAt: Date | string, position: number): string {
  const base = matchweekSlugBase(startAt);
  return position <= 1 ? base : `${base}-${position}`;
}

export function isMatchweekSlug(value: string): boolean {
  return SLUG_PATTERN.test(value);
}

/** The old address. Still answered, with a redirect to the slug. */
export function isMatchweekId(value: string): boolean {
  return UUID_PATTERN.test(value);
}
