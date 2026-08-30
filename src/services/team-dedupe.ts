import { normalizeTeamName } from "@/services/team-names";

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
 * Barcelona SC of Ecuador survives all three: it plays in a league, in another
 * region, and claims no country to agree on.
 */
export function isSameClub(canonical: DedupeTeam, other: DedupeTeam) {
  if (other.regions.some((region) => canonical.regions.includes(region))) return true;
  if (canonical.country_id && other.country_id) return canonical.country_id === other.country_id;
  return other.memberships === 0 && other.country_id === null;
}

/**
 * Groups the catalog by normalised name and splits each group into the rows
 * that can be merged and the rows that need a person to look at them.
 */
export function planTeamMerges<Team extends DedupeTeam>(teams: Team[]) {
  const byName = new Map<string, Team[]>();
  for (const team of teams) {
    const key = normalizeTeamName(team.name);
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
