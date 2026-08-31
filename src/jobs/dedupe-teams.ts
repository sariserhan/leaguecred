import { sqlClient } from "@/db";
import { describeDatabaseTarget } from "@/lib/env";
import { teamSlug } from "@/lib/team-path";
import { isDuplicateOfCatalogued, namesCouldBeOneClub, planTeamMerges, type DedupeTeam, type TeamMerge } from "@/services/team-dedupe";

/**
 * Merges clubs that were catalogued twice.
 *
 * Team identity is keyed on (provider, provider_external_id), so the same club
 * arriving from a second provider became a second row — most visibly when a
 * continental competition was synced and its participants had no membership in
 * it yet. `synchronizeFixtures` no longer creates those, and this repairs the
 * rows already stored.
 *
 * Two clubs may legitimately share a name, so a merge needs more than matching
 * names: the rows must also share a region. Liverpool of Montevideo plays in
 * the Americas and Liverpool of England in Europe, so they are left alone.
 *
 * Reports without writing unless --apply is passed.
 */

type TeamRow = DedupeTeam & {
  logo_url: string | null;
  logo_provider: string | null;
  sports_db_external_id: string | null;
  provider: string;
  provider_external_id: string;
};

type Merge = TeamMerge<TeamRow>;

async function loadTeams() {
  return sqlClient<TeamRow[]>`
    select t.id, t.name, t.slug, t.country_id, t.logo_url, t.logo_provider,
      t.sports_db_external_id, t.provider, t.provider_external_id,
      extract(epoch from t.created_at)::float8 as created_at,
      coalesce(array_agg(distinct l.region) filter (where l.region is not null), '{}') as regions,
      -- Count only memberships in leagues that are switched on, matching the
      -- regions beside it. Counting a disabled league made an unattached stub
      -- look like it played somewhere, which kept the two Slavia Prague rows apart.
      count(l.id)::int as memberships,
      count(*) filter (where c.is_region = false)::int as domestic_memberships
    from teams t
    left join league_team_memberships membership on membership.team_id = t.id
    left join leagues l on l.id = membership.league_id and l.enabled = true
    left join countries c on c.id = l.country_id
    group by t.id
    order by t.created_at`;
}

/**
 * Pairs the fixtures prove are one club: two rows in the same league and season
 * kicking off at the same minute with one side identical. No club plays two
 * matches at once, so the differing sides are the same club under two names —
 * which is how "Newcastle" and "Newcastle United" were both catalogued.
 *
 * Only cross-provider evidence counts, and seeded demo fixtures are ignored: a
 * fabricated match sharing a kickoff with a real one paired Antalyaspor with
 * Besiktas, two entirely different clubs.
 */
async function loadFixtureEvidence() {
  const rows = await sqlClient<Array<{ a: string; b: string; name_a: string; name_b: string }>>`
    with pairs as (
      select distinct
        least(case when f1.home_team_id = f2.home_team_id then f1.away_team_id else f1.home_team_id end,
              case when f1.home_team_id = f2.home_team_id then f2.away_team_id else f2.home_team_id end) as a,
        greatest(case when f1.home_team_id = f2.home_team_id then f1.away_team_id else f1.home_team_id end,
                 case when f1.home_team_id = f2.home_team_id then f2.away_team_id else f2.home_team_id end) as b
      from fixtures f1
      join fixtures f2
        on f2.league_id = f1.league_id and f2.season_id = f1.season_id
       and f2.kickoff_at = f1.kickoff_at and f2.id <> f1.id
       and ((f1.home_team_id = f2.home_team_id and f1.away_team_id <> f2.away_team_id)
         or (f1.away_team_id = f2.away_team_id and f1.home_team_id <> f2.home_team_id))
      where f1.provider <> 'seed' and f2.provider <> 'seed' and f1.provider <> f2.provider
    )
    select p.a, p.b, ta.name as name_a, tb.name as name_b
    from pairs p join teams ta on ta.id = p.a join teams tb on tb.id = p.b`;

  const accepted: Array<[string, string]> = [];
  const rejected: Array<{ nameA: string; nameB: string }> = [];
  for (const row of rows) {
    if (namesCouldBeOneClub(row.name_a, row.name_b)) accepted.push([row.a, row.b]);
    else rejected.push({ nameA: row.name_a, nameB: row.name_b });
  }
  return { accepted, rejected };
}

/**
 * Pairs where one row is a club and the other is a leftover catalogue entry for
 * it: both listed in the same competition and season, their names nesting, and
 * one of them never once appearing in a fixture.
 *
 * Reported, never merged. Nesting is not evidence of anything on its own: in one
 * competition it also pairs Atlético Junior with Boca Juniors, Paris FC with
 * Paris Saint-Germain and LAFC with LA Galaxy. Requiring one side to have no
 * fixture separates those on the data we happen to hold, and no further — a real
 * club we have simply not synced yet looks exactly like a leftover. So these go
 * to a person, and the ones that are genuine become aliases.
 */
async function loadStubEvidence() {
  const rows = await sqlClient<Array<{
    a: string; b: string; name_a: string; name_b: string; fixtures_a: number; fixtures_b: number;
  }>>`
    select ta.id as a, tb.id as b, ta.name as name_a, tb.name as name_b,
      (select count(*)::int from fixtures f where f.home_team_id = ta.id or f.away_team_id = ta.id) as fixtures_a,
      (select count(*)::int from fixtures f where f.home_team_id = tb.id or f.away_team_id = tb.id) as fixtures_b
    from league_team_memberships ma
    join league_team_memberships mb
      on mb.league_id = ma.league_id and mb.season_id = ma.season_id and mb.team_id > ma.team_id
    join seasons s on s.id = ma.season_id and s.is_current = true
    join leagues l on l.id = ma.league_id and l.enabled = true
    join teams ta on ta.id = ma.team_id
    join teams tb on tb.id = mb.team_id`;

  const pairs: Array<{ nameA: string; nameB: string }> = [];
  for (const row of rows) {
    const left = { name: row.name_a, fixtures: row.fixtures_a };
    const right = { name: row.name_b, fixtures: row.fixtures_b };
    if (isDuplicateOfCatalogued(left, right) || isDuplicateOfCatalogued(right, left)) {
      pairs.push({ nameA: row.name_a, nameB: row.name_b });
    }
  }
  return pairs;
}

/** Fixtures where both sides collapse to one team would break the check
 * constraint that a club cannot play itself, so they block the merge. */
async function selfPlayingFixtures(ids: string[]) {
  const [row] = await sqlClient<Array<{ count: number }>>`
    select count(*)::int as count from fixtures
    where home_team_id = any(${ids}) and away_team_id = any(${ids})`;
  return row?.count ?? 0;
}

async function applyMerge({ canonical, duplicates }: Merge) {
  const duplicateIds = duplicates.map((team) => team.id);

  await sqlClient.begin(async (sql) => {
    // The duplicate's own provider key becomes an alias, so the next sync from
    // that provider resolves to the surviving row instead of recreating it.
    for (const duplicate of duplicates) {
      await sql`insert into team_provider_aliases (provider, provider_external_id, team_id, source_name)
        values (${duplicate.provider}, ${duplicate.provider_external_id}, ${canonical.id}, ${duplicate.name})
        on conflict (provider, provider_external_id)
        do update set team_id = excluded.team_id, updated_at = now()`;
    }

    await sql`update team_provider_aliases set team_id = ${canonical.id}, updated_at = now()
      where team_id = any(${duplicateIds})`;
    await sql`update fixtures set home_team_id = ${canonical.id}, updated_at = now()
      where home_team_id = any(${duplicateIds})`;
    await sql`update fixtures set away_team_id = ${canonical.id}, updated_at = now()
      where away_team_id = any(${duplicateIds})`;
    await sql`update fixtures set winner_team_id = ${canonical.id}, updated_at = now()
      where winner_team_id = any(${duplicateIds})`;
    await sql`update picks set selected_team_id = ${canonical.id}
      where selected_team_id = any(${duplicateIds})`;

    // Memberships are unique per league and season, so drop the ones that would
    // collide before repointing the rest.
    await sql`delete from league_team_memberships duplicate
      where duplicate.team_id = any(${duplicateIds})
        and exists (select 1 from league_team_memberships kept
          where kept.team_id = ${canonical.id}
            and kept.league_id = duplicate.league_id
            and kept.season_id = duplicate.season_id)`;
    await sql`update league_team_memberships set team_id = ${canonical.id}, updated_at = now()
      where team_id = any(${duplicateIds})`;

    await sql`delete from teams where id = any(${duplicateIds})`;

    // Only now can the survivor take what it was missing: sports_db_external_id
    // is unique, so copying it while the row that holds it still existed would
    // trip the index.
    for (const duplicate of duplicates) {
      await sql`update teams set
        logo_url = coalesce(teams.logo_url, ${duplicate.logo_url}),
        logo_provider = case when teams.logo_url is null then ${duplicate.logo_provider} else teams.logo_provider end,
        country_id = coalesce(teams.country_id, ${duplicate.country_id}),
        sports_db_external_id = coalesce(teams.sports_db_external_id, ${duplicate.sports_db_external_id}),
        updated_at = now()
        where id = ${canonical.id}`;
    }

    // The clean slug is usually held by the row being removed, so the survivor
    // can take it back now that nothing else claims it.
    const preferred = teamSlug(canonical.name);
    if (preferred !== canonical.slug) {
      await sql`update teams set slug = ${preferred}, updated_at = now()
        where id = ${canonical.id}
          and not exists (select 1 from teams other where other.slug = ${preferred})`;
    }
  });
}

async function main() {
  const apply = process.argv.includes("--apply");
  const onlyArg = process.argv.find((argument) => argument.startsWith("--only="));
  const only = onlyArg ? new Set(onlyArg.slice("--only=".length).split(",")) : null;

  console.info(`Target database: ${describeDatabaseTarget()}`);
  console.info(apply ? "Applying merges." : "Dry run. Pass --apply to write.");

  try {
    const evidence = await loadFixtureEvidence();
    for (const pair of evidence.rejected) {
      console.warn(`FIXTURES SUGGEST ${pair.nameA} and ${pair.nameB} are one club, but the names do not agree. Left alone.`);
    }
    for (const pair of await loadStubEvidence()) {
      console.warn(`SUSPECT ${pair.nameA} and ${pair.nameB} share a competition and one has never played. ` +
        `Check them; add an alias if they are one club.`);
    }
    const planned = planTeamMerges(await loadTeams(), evidence.accepted);
    const merges = only ? planned.merges.filter((merge) => [merge.canonical.slug, ...merge.duplicates.map((team) => team.slug)].some((slug) => only.has(slug))) : planned.merges;
    const unresolved = only ? [] : planned.unresolved;

    if (merges.length === 0) console.info("\nNo duplicate clubs to merge.");
    for (const merge of merges) {
      const blocked = await selfPlayingFixtures([merge.canonical.id, ...merge.duplicates.map((team) => team.id)]);
      const names = merge.duplicates.map((team) => `${team.slug} (${team.provider})`).join(", ");
      if (blocked > 0) {
        console.warn(`SKIP ${merge.canonical.name}: ${blocked} fixture(s) list both rows as opponents.`);
        continue;
      }
      console.info(`${apply ? "MERGE" : "WOULD MERGE"} ${names} -> ${merge.canonical.slug} (${merge.canonical.provider})`);
      if (apply) await applyMerge(merge);
    }

    for (const group of unresolved) {
      console.info(`LEFT ALONE ${group[0].name}: ${group.map((team) => `${team.slug} [${team.regions.join("/") || "no league"}]`).join(", ")}`);
    }

    console.info(`\n${merges.length} club(s) to merge, ${unresolved.length} left for review.`);
  } finally {
    await sqlClient.end();
  }
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
