import { sqlClient } from "@/db";
import { describeDatabaseTarget } from "@/lib/env";
import { teamSlug } from "@/lib/team-path";

/**
 * Pulls a club back out of a row it was wrongly merged into.
 *
 * The merge jobs are careful, and still got one wrong: Nacional of Montevideo
 * was folded into C.D. Nacional of Madeira, leaving a single club listed in both
 * the Copa Libertadores and Liga Portugal. A club whose competitions span two
 * confederations is always two clubs, which is what catalog-health now watches
 * for.
 *
 * Everything the split needs is named explicitly rather than guessed. Guessing
 * is what caused the merge, and the aliases matter most: leave one pointing at
 * the wrong club and the next sync merges them straight back.
 *
 * Usage:
 *   pnpm team:split <slug> --name "<new name>" --leagues <slug,...>
 *                          --aliases <provider>:<externalId>,... [--apply]
 */

function argumentValue(flag: string) {
  const index = process.argv.indexOf(flag);
  return index === -1 ? null : process.argv[index + 1] ?? null;
}

async function main() {
  const apply = process.argv.includes("--apply");
  const sourceSlug = process.argv[2];
  const name = argumentValue("--name");
  const leagueSlugs = (argumentValue("--leagues") ?? "").split(",").filter(Boolean);
  const aliasKeys = (argumentValue("--aliases") ?? "").split(",").filter(Boolean);

  if (!sourceSlug || sourceSlug.startsWith("--") || !name || leagueSlugs.length === 0) {
    console.error('Usage: pnpm team:split <slug> --name "<new name>" --leagues <slug,...> [--aliases <provider>:<externalId>,...] [--apply]');
    process.exitCode = 1;
    return;
  }

  console.info(`Target database: ${describeDatabaseTarget()}`);
  console.info(apply ? "Applying." : "Dry run. Pass --apply to write.");

  try {
    const [source] = await sqlClient<Array<{ id: string; name: string; provider: string }>>`
      select id, name, provider from teams where slug = ${sourceSlug}`;
    if (!source) {
      console.error(`No club at ${sourceSlug}.`);
      process.exitCode = 1;
      return;
    }

    const moving = await sqlClient<Array<{ league: string; memberships: number; fixtures: number; picks: number }>>`
      select l.slug as league,
        (select count(*)::int from league_team_memberships m
          where m.team_id = ${source.id} and m.league_id = l.id) as memberships,
        (select count(*)::int from fixtures f
          where f.league_id = l.id and (f.home_team_id = ${source.id} or f.away_team_id = ${source.id})) as fixtures,
        (select count(*)::int from picks p
          where p.league_id = l.id and p.selected_team_id = ${source.id}) as picks
      from leagues l where l.slug = any(${leagueSlugs})`;

    for (const row of moving) {
      console.info(`  ${row.league}: ${row.memberships} membership(s), ${row.fixtures} fixture(s), ${row.picks} pick(s)`);
    }
    const picks = moving.reduce((total, row) => total + row.picks, 0);
    if (picks > 0) {
      // A Weekly Lock names a club. Moving it silently would rewrite what
      // somebody actually predicted.
      throw new Error(`${picks} pick(s) name this club in those competitions; a person must decide where they belong.`);
    }

    console.info(`${apply ? "SPLIT" : "WOULD SPLIT"} ${source.name} -> keeps ${sourceSlug}, new club "${name}" takes ${leagueSlugs.join(", ")}`);
    for (const key of aliasKeys) console.info(`  moving alias ${key}`);
    if (!apply) return;

    await sqlClient.begin(async (sql) => {
      const [created] = await sql<Array<{ id: string }>>`
        insert into teams (provider, provider_external_id, name, slug, short_name, country_id)
        values (${source.provider}, ${`split:${sourceSlug}:${teamSlug(name)}`}, ${name},
          ${teamSlug(name)}, ${name.slice(0, 3).toUpperCase()}, null)
        returning id`;
      if (!created) throw new Error("Could not create the club.");

      const leagueIds = await sql<Array<{ id: string }>>`
        select id from leagues where slug = any(${leagueSlugs})`;
      const ids = leagueIds.map((league) => league.id);

      await sql`update league_team_memberships set team_id = ${created.id}, updated_at = now()
        where team_id = ${source.id} and league_id = any(${ids})`;
      await sql`update fixtures set home_team_id = ${created.id}, updated_at = now()
        where home_team_id = ${source.id} and league_id = any(${ids})`;
      await sql`update fixtures set away_team_id = ${created.id}, updated_at = now()
        where away_team_id = ${source.id} and league_id = any(${ids})`;
      await sql`update fixtures set winner_team_id = ${created.id}, updated_at = now()
        where winner_team_id = ${source.id} and league_id = any(${ids})`;

      for (const key of aliasKeys) {
        // A provider's external id may itself contain colons, so only the first
        // separates the provider from it.
        const separator = key.indexOf(":");
        const provider = key.slice(0, separator);
        const externalId = key.slice(separator + 1);
        await sql`update team_provider_aliases set team_id = ${created.id}, updated_at = now()
          where provider = ${provider} and provider_external_id = ${externalId} and team_id = ${source.id}`;
      }
    });

    console.info("Split applied.");
  } finally {
    await sqlClient.end();
  }
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
