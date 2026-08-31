/**
 * Decides the name a club is shown under, with ESPN as the source of truth.
 *
 * Names used to come from whichever provider's row happened to survive a merge,
 * so football-data's abbreviations leaked into the tables: the Süper Lig read
 * "Buyuksehyr" and "Goztep". ESPN names clubs consistently and in full, so its
 * spelling wins.
 *
 * With one exception. ESPN writes Turkish, Nordic and German clubs in plain
 * ASCII — "Besiktas", "Fenerbahce", "Genclerbirligi" — and adopting those would
 * fix two names by damaging three. So when ESPN is offering the same name with
 * the accents stripped, the accented spelling stays. Anything else ESPN says is
 * a different name, not a worse rendering of ours, and it is taken.
 */

/** The name reduced to what survives ASCII, for deciding whether two spellings
 * are the same name at all. Turkish ı and German ß have no decomposed form, so
 * they are folded by hand. */
function asciiFold(name: string) {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/ı/g, "i").replace(/İ/g, "I")
    .replace(/ø/g, "o").replace(/Ø/g, "O")
    .replace(/å/g, "a").replace(/Å/g, "A")
    .replace(/æ/g, "ae").replace(/Æ/g, "AE")
    .replace(/œ/g, "oe").replace(/Œ/g, "OE")
    .replace(/ß/g, "ss")
    .replace(/ł/g, "l").replace(/Ł/g, "L")
    .replace(/đ/g, "d").replace(/Đ/g, "D")
    .replace(/þ/g, "th").replace(/Þ/g, "TH")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

/** How much of the name would be lost by writing it in plain ASCII. */
function accentedLetters(name: string) {
  let count = 0;
  for (const character of name.normalize("NFD")) {
    if (/[̀-ͯ]/.test(character)) count += 1;
  }
  for (const character of name) {
    if (/[ıİøØåÅæÆœŒßłŁđĐþÞ]/.test(character)) count += 1;
  }
  return count;
}

function isMeaningful(name: string | null | undefined): name is string {
  return typeof name === "string" && /[\p{L}\p{N}]/u.test(name);
}

/**
 * @param current what the club is called now
 * @param espnName what ESPN calls it, if ESPN has ever named it
 * @returns the name to store, or null when there is no reason to change
 */
export function chooseDisplayName(current: string, espnName: string | null | undefined) {
  const trimmedCurrent = current.trim();
  if (!isMeaningful(espnName)) return null;

  const candidate = espnName.trim();
  if (candidate === trimmedCurrent) return null;

  // The same name, one of them stripped of its accents: keep the richer one.
  if (asciiFold(candidate) === asciiFold(trimmedCurrent)) {
    return accentedLetters(candidate) > accentedLetters(trimmedCurrent) ? candidate : null;
  }

  return candidate;
}

/**
 * A name for a club whose current one is already answered to by a different
 * club. ESPN calls both Santos of Brazil and Santos Laguna of Mexico "Santos",
 * so adopting its wording for the second left two clubs indistinguishable in
 * every table and link. Another provider usually kept them apart, and the most
 * specific of those spellings is the one that does.
 *
 * @param taken names already held by other clubs
 * @returns a clearer name, or null when nothing on offer is any clearer
 */
export function chooseDisambiguatingName(
  current: string,
  candidates: Array<string | null | undefined>,
  taken: ReadonlySet<string>,
) {
  const isTaken = (name: string) => taken.has(name.trim().toLowerCase());
  if (!isTaken(current)) return null;

  const usable = candidates
    .map((candidate) => candidate?.trim())
    .filter((candidate): candidate is string =>
      isMeaningful(candidate) && candidate !== current.trim() && !isTaken(candidate));
  if (usable.length === 0) return null;

  // The longest spelling is the one carrying the distinguishing part.
  return usable.sort((left, right) =>
    right.length - left.length || left.localeCompare(right))[0];
}
