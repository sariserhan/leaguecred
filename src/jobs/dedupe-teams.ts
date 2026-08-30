import { sqlClient } from "@/db";
import { describeDatabaseTarget } from "@/lib/env";
import { teamSlug } from "@/lib/team-path";
import { planTeamMerges, type DedupeTeam, type TeamMerge } from "@/services/team-dedupe";

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
      count(membership.id)::int as memberships,
      count(*) filter (where c.is_region = false)::int as domestic_memberships
    from teams t
    left join league_team_memberships membership on membership.team_id = t.id
    left join leagues l on l.id = membership.league_id and l.enabled = true
    left join countries c on c.id = l.country_id
    group by t.id
    order by t.created_at`;
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
    // Keep whatever the surviving row is missing before the others are removed.
    for (const duplicate of duplicates) {
      await sql`update teams set
        logo_url = coalesce(teams.logo_url, ${duplicate.logo_url}),
        logo_provider = case when teams.logo_url is null then ${duplicate.logo_provider} else teams.logo_provider end,
        country_id = coalesce(teams.country_id, ${duplicate.country_id}),
        sports_db_external_id = coalesce(teams.sports_db_external_id, ${duplicate.sports_db_external_id}),
        updated_at = now()
        where id = ${canonical.id}`;
    }

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
    const planned = planTeamMerges(await loadTeams());
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
