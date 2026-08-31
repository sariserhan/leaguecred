import { sqlClient } from "@/db";
import { describeDatabaseTarget } from "@/lib/env";
import { teamSlug } from "@/lib/team-path";
import { chooseDisambiguatingName, chooseDisplayName } from "@/services/team-display-name";

/**
 * Renames clubs to what ESPN calls them.
 *
 * Names came from whichever provider's row happened to survive a merge, so
 * football-data's abbreviations were left on show: the Süper Lig table read
 * "Buyuksehyr" and "Goztep". ESPN is the source of truth for everything else,
 * so it names the clubs too — except where it would strip the accents off a
 * name we already spell properly.
 *
 * The slug follows the name when the better slug is free, so a club's page
 * stops sitting at a misspelling.
 *
 * Reports without writing unless --apply is passed.
 */

type Row = { id: string; name: string; slug: string; espn_name: string | null; collides: number; alias_names: string[] };

async function loadTeams() {
  return sqlClient<Row[]>`
    select t.id, t.name, t.slug,
      (select a.source_name from team_provider_aliases a
        where a.team_id = t.id and a.provider = 'espn-web' limit 1) as espn_name,
      -- ESPN calls both Santos of Brazil and Santos Laguna of Mexico "Santos".
      -- Adopting that for the second leaves two different clubs under one name,
      -- so a rename that would collide with another club is refused.
      (select count(*)::int from teams other
        where other.id <> t.id
          and lower(other.name) = lower((select a.source_name from team_provider_aliases a
            where a.team_id = t.id and a.provider = 'espn-web' limit 1))) as collides,
      coalesce((select array_agg(distinct a.source_name) from team_provider_aliases a
        where a.team_id = t.id), '{}') as alias_names
    from teams t
    order by t.name`;
}

async function main() {
  const apply = process.argv.includes("--apply");

  console.info(`Target database: ${describeDatabaseTarget()}`);
  console.info(apply ? "Applying." : "Dry run. Pass --apply to write.");

  try {
    const teams = await loadTeams();

    // Names held by more than one club, and who holds each, so a club can be
    // asked to move off a name it shares rather than onto one.
    const holders = new Map<string, string[]>();
    for (const team of teams) {
      const key = team.name.trim().toLowerCase();
      holders.set(key, [...(holders.get(key) ?? []), team.id]);
    }
    const sharedNames = new Set([...holders].filter(([, ids]) => ids.length > 1).map(([name]) => name));
    const otherClubNames = (team: Row) => new Set(
      teams.filter((other) => other.id !== team.id).map((other) => other.name.trim().toLowerCase()));

    let renamed = 0;
    let reslugged = 0;

    for (const team of teams) {
      // Two separate questions, and a collision answers neither on its own:
      // whether ESPN's name is an improvement, and whether this club's current
      // name says which club it is.
      const proposed = chooseDisplayName(team.name, team.espn_name);
      if (proposed && team.collides > 0) {
        console.warn(`KEEPING ${team.name}: ESPN calls it "${proposed}", which another club already answers to.`);
      }
      const adopted = team.collides > 0 ? null : proposed;

      const shared = sharedNames.has(team.name.trim().toLowerCase());
      const clearer = adopted || !shared
        ? null
        : chooseDisambiguatingName(team.name, team.alias_names, otherClubNames(team));
      if (clearer) {
        console.warn(`SHARED NAME ${team.name} is held by another club; taking "${clearer}".`);
      }

      const best = adopted ?? clearer;
      const name = best ?? team.name;

      if (best) {
        renamed += 1;
        console.info(`${apply ? "RENAME" : "WOULD RENAME"} ${team.name} -> ${best}`);
        if (apply) {
          await sqlClient`update teams set name = ${best}, updated_at = now() where id = ${team.id}`;
        }
      }

      // The slug is checked for every club, not just renamed ones. The backfill
      // that first filled this column folded accents with a plain character
      // class, so any club whose name is not ASCII was left at an address like
      // /teams/ey-pspor. teamSlug strips the accents properly.
      const preferredSlug = teamSlug(name);
      if (preferredSlug === team.slug) continue;

      reslugged += 1;
      console.info(`${apply ? "MOVE" : "WOULD MOVE"} /teams/${team.slug} -> /teams/${preferredSlug}`);
      if (!apply) continue;

      // Only move the page if nothing else already answers to that address.
      await sqlClient`
        update teams set slug = ${preferredSlug}, updated_at = now()
        where id = ${team.id}
          and not exists (select 1 from teams other where other.slug = ${preferredSlug})`;
    }

    console.info(`\n${renamed} club(s)${apply ? " renamed" : " to rename"}, ${reslugged} slug(s)${apply ? " moved" : " to move"}.`);
  } finally {
    await sqlClient.end();
  }
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
