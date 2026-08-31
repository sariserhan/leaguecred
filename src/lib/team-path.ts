const teamIdPattern = /([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/i;

/**
 * Latin letters that carry no combining mark to strip, so NFD leaves them
 * whole. Without this a name keeps a letter the slug cannot spell and loses it
 * to a hyphen: Kasımpaşa was reachable only at /teams/kas-mpasa.
 */
const UNDECOMPOSED_LATIN: Array<[RegExp, string]> = [
  [/[ıİ]/g, "i"], [/[øØ]/g, "o"], [/[åÅ]/g, "a"], [/[æÆ]/g, "ae"],
  [/[œŒ]/g, "oe"], [/ß/g, "ss"], [/[łŁ]/g, "l"], [/[đĐ]/g, "d"],
  [/[þÞ]/g, "th"], [/[ðÐ]/g, "d"],
];

export function foldToAscii(name: string) {
  const folded = UNDECOMPOSED_LATIN.reduce(
    (value, [pattern, replacement]) => value.replace(pattern, replacement),
    name.normalize("NFD").replace(/[\u0300-\u036f]/g, ""),
  );
  return folded.toLowerCase();
}

export function teamSlug(name: string) {
  return foldToAscii(name)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "") || "team";
}

export function teamHref(team: { slug: string }) {
  return `/teams/${team.slug}`;
}

export function teamIdFromPath(path: string) {
  return teamIdPattern.exec(path)?.[1] ?? null;
}
