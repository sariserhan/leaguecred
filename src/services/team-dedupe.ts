import { normalizeTeamName } from "@/services/team-names";

/**
 * A second opinion on a pair the fixtures say is one club.
 *
 * The fixture evidence is strong on its own — a club cannot play two matches at
 * the same minute — but it reads from data, and bad data has already produced
 * one false pair. Requiring the names to look related as well means a single
 * wrong fixture cannot merge two real clubs on its own.
 */
export function namesCouldBeOneClub(left: string, right: string) {
  const a = normalizeTeamName(left);
  const b = normalizeTeamName(right);
  if (a === b) return true;
  if (a.length >= 4 && b.length >= 4 && (a.includes(b) || b.includes(a))) return true;

  // A shared word only means something if it names the club rather than
  // describing it. "Real Madrid" and "Real Sociedad" share "real"; half the
  // league shares "united". Only a long, distinctive word counts.
  const GENERIC = new Set([
    "united", "sporting", "sport", "sportif", "racing", "athletic", "atletico",
    "deportivo", "royal", "football", "futbol", "calcio", "association", "olympique",
  ]);
  const tokens = (value: string) => new Set(
    value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .split(/[^a-z0-9]+/)
      .filter((token) => token.length >= 5 && !GENERIC.has(token)));
  const rightTokens = tokens(right);
  return [...tokens(left)].some((token) => rightTokens.has(token));
}

/**
 * Decides which catalogued clubs are the same club.
 *
 * Team identity is keyed on (provider, provider_external_id), so one club
 * arriving from a second provider became a second row — most visibly when a
 * continental competition was synced and its participants held no membership in
 * it yet, which also stamped the competition's region on them as a country.
 *
 * The planning here is deliberately separate from the writes in
 * `src/jobs/dedupe-teams.ts`, because deciding that two rows are one club is
 * the part worth testing.
 */

export type DedupeTeam = {
  id: string;
  name: string;
  slug: string;
  country_id: string | null;
  /** Regions of the enabled leagues this row plays in. */
  regions: string[];
  memberships: number;
  /** Memberships in leagues filed under a real country rather than a region. */
  domestic_memberships: number;
  created_at: number;
};

export type TeamMerge<Team extends DedupeTeam> = { canonical: Team; duplicates: Team[] };

/**
 * The row the others fold into: the one that looks most like the real club.
 * Playing in a domestic league beats playing only in a continental one, which
 * beats being an unattached stub.
 */
export function pickCanonical<Team extends DedupeTeam>(group: Team[]) {
  return [...group].sort((left, right) =>
    right.domestic_memberships - left.domestic_memberships ||
    right.memberships - left.memberships ||
    Number(Boolean(right.country_id)) - Number(Boolean(left.country_id)) ||
    left.created_at - right.created_at)[0];
}

/**
 * Matching names are not enough on their own, because two unrelated clubs can
 * share one. A merge needs corroboration:
 *
 *  - a shared region, so Liverpool of Montevideo (Americas) is never folded
 *    into Liverpool of England (Europe);
 *  - or the same country, which settles rows differing only by an accent;
 *  - or a stub belonging to no league at all that contradicts nothing, whose
 *    only content is a provider key worth keeping as an alias.
 *
 * A stub contradicts nothing when one of the two rows has no country recorded.
 * Two countries that disagree are settled above and never reach here, so what
 * is left is missing data rather than a difference — which is how the two
 * Slavia Prague rows sat unmerged, one holding a country and the other a league.
 *
 * Barcelona SC of Ecuador survives all three: it plays in a league, in another
 * region, and claims no country to agree on.
 */
export function isSameClub(canonical: DedupeTeam, other: DedupeTeam) {
  if (other.regions.some((region) => canonical.regions.includes(region))) return true;
  if (canonical.country_id && other.country_id) return canonical.country_id === other.country_id;
  return other.memberships === 0 && (other.country_id === null || canonical.country_id === null);
}

/**
 * Groups the catalog by normalised name and splits each group into the rows
 * that can be merged and the rows that need a person to look at them.
 */
export function planTeamMerges<Team extends DedupeTeam>(
  teams: Team[],
  /** Pairs the fixtures show to be one club, as team id tuples. */
  evidencePairs: Array<[string, string]> = [],
) {
  // Union-find over both signals, so a club reached by name and another reached
  // by fixture evidence end up in one group rather than two half-merges.
  const parent = new Map(teams.map((team) => [team.id, team.id]));
  const find = (id: string): string => {
    const seen = parent.get(id);
    if (seen === undefined || seen === id) return id;
    const root = find(seen);
    parent.set(id, root);
    return root;
  };
  const union = (left: string, right: string) => {
    const a = find(left);
    const b = find(right);
    if (a !== b) parent.set(a, b);
  };

  const firstWithName = new Map<string, string>();
  for (const team of teams) {
    const key = normalizeTeamName(team.name);
    const seen = firstWithName.get(key);
    if (seen) union(seen, team.id); else firstWithName.set(key, team.id);
  }
  for (const [left, right] of evidencePairs) {
    if (parent.has(left) && parent.has(right)) union(left, right);
  }

  const byName = new Map<string, Team[]>();
  for (const team of teams) {
    const key = find(team.id);
    byName.set(key, [...(byName.get(key) ?? []), team]);
  }

  const merges: TeamMerge<Team>[] = [];
  const unresolved: Team[][] = [];

  for (const group of byName.values()) {
    if (group.length < 2) continue;

    const canonical = pickCanonical(group);
    const others = group.filter((team) => team.id !== canonical.id);
    const duplicates = others.filter((team) => isSameClub(canonical, team));

    if (duplicates.length > 0) merges.push({ canonical, duplicates });
    const remaining = others.filter((team) => !duplicates.includes(team));
    if (remaining.length > 0) unresolved.push([canonical, ...remaining]);
  }

  return { merges, unresolved };
}
