import { sqlClient } from "@/db";
import { chooseDisplayName } from "@/services/team-display-name";

/**
 * Counts the catalog faults the repair jobs exist to fix.
 *
 * Every one of these has actually happened, and every one came back after being
 * fixed: a provider renames a club and it is catalogued twice, a second source
 * records a match already stored, a round opens its own matchweek beside the one
 * covering it. "FC Cologne" reappeared on production within a day of being
 * merged, from a single gap in how names are normalised.
 *
 * The repairs are deliberately not run on a schedule. Each one has needed a
 * judgement call that data alone could not make — merging on a name nesting
 * would have folded Boca Juniors into Atlético Junior, and a shared region
 * nearly merged Santos of Brazil into Santos Laguna of Mexico. So this counts
 * and reports, and a person runs the repair.
 */

export type CatalogHealth = {
  duplicateClubNames: number;
  duplicateMatches: number;
  splitGameweeks: number;
  orphanedClubs: number;
  malformedSlugs: number;
  clubsNamedDifferentlyByEspn: number;
  /** Clubs whose competitions span two confederations. No real club does, so
   * this is a wrongly merged pair: it caught Nacional of Montevideo folded into
   * C.D. Nacional of Madeira. */
  clubsSpanningRegions: number;
  /** True when nothing needs a person to look at it. */
  healthy: boolean;
};

const EMPTY: Omit<CatalogHealth, "healthy"> = {
  duplicateClubNames: 0,
  duplicateMatches: 0,
  splitGameweeks: 0,
  orphanedClubs: 0,
  malformedSlugs: 0,
  clubsNamedDifferentlyByEspn: 0,
  clubsSpanningRegions: 0,
};

/**
 * Faults that are expected and are not worth reporting: two clubs really are
 * called Liverpool, and an undecided playoff tie really does appear twice under
 * placeholder names.
 *
 * Shared so the nightly job and the admin panel judge the catalogue by the same
 * standard. Kept apart, one would call healthy what the other flagged.
 */
export const TOLERATED_CATALOG_FAULTS = {
  duplicateClubNames: 1,
  duplicateMatches: 2,
} as const satisfies Partial<Omit<CatalogHealth, "healthy">>;

/** Some faults are expected and are not worth waking anyone over: two clubs
 * really are called Liverpool, and an undecided playoff tie really does appear
 * twice under placeholder names. */
export function isHealthy(counts: Omit<CatalogHealth, "healthy">, tolerated: Partial<typeof EMPTY> = {}) {
  return (Object.keys(EMPTY) as Array<keyof typeof EMPTY>)
    .every((key) => counts[key] <= (tolerated[key] ?? 0));
}

export async function measureCatalogHealth(
  tolerated: Partial<typeof EMPTY> = {},
): Promise<CatalogHealth> {
  const [row] = await sqlClient<Array<Omit<CatalogHealth, "healthy">>>`
    with weeks as (
      select m.id, m.league_id, m.start_at, m.end_at,
        case when m.provider_round_name like '%:%'
          then split_part(m.provider_round_name, ':', 1) else 'default' end as scheme
      from matchweeks m
    )
    select
      (select count(*)::int from (
        select name from teams group by name having count(*) > 1) x) as "duplicateClubNames",
      (select count(*)::int from (
        select league_id, season_id, home_team_id, away_team_id, date(kickoff_at)
        from fixtures group by 1, 2, 3, 4, 5 having count(*) > 1) y) as "duplicateMatches",
      (select count(*)::int from weeks a join weeks b
        on b.league_id = a.league_id and a.id < b.id and a.scheme <> b.scheme
       and a.start_at < b.end_at and b.start_at < a.end_at) as "splitGameweeks",
      (select count(*)::int from teams t
        where not exists (select 1 from league_team_memberships m where m.team_id = t.id)
          and not exists (select 1 from fixtures f where f.home_team_id = t.id or f.away_team_id = t.id)) as "orphanedClubs",
      (select count(*)::int from teams
        where slug like '%--%' or slug ~ '(^-|-$)') as "malformedSlugs",
      0 as "clubsNamedDifferentlyByEspn",
      (select count(*)::int from (
        select t.id from teams t
        join league_team_memberships m on m.team_id = t.id
        join leagues l on l.id = m.league_id and l.enabled = true
        group by t.id having count(distinct l.region) > 1) z) as "clubsSpanningRegions"`;

  // Not expressible in SQL: a name differing from ESPN's is only a fault when
  // the rename would actually take ESPN's. Where ESPN is offering the same name
  // with the accents stripped, ours is the right one and nothing is wrong.
  const named = await sqlClient<Array<{ name: string; espn_name: string }>>`
    select t.name, a.source_name as espn_name
    from teams t
    join team_provider_aliases a on a.team_id = t.id and a.provider = 'espn-web'
    where lower(a.source_name) <> lower(t.name)`;
  const clubsNamedDifferentlyByEspn = named
    .filter((club) => chooseDisplayName(club.name, club.espn_name) !== null).length;

  const counts = { ...(row ?? EMPTY), clubsNamedDifferentlyByEspn };
  return { ...counts, healthy: isHealthy(counts, tolerated) };
}
