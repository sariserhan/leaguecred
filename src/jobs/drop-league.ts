import { sqlClient } from "@/db";
import { describeDatabaseTarget } from "@/lib/env";

/**
 * Removes a competition from the catalog for good.
 *
 * Every table that references a league cascades from it — seasons, matchweeks,
 * fixtures, memberships, and also picks, follows and records. That makes a
 * league row a dangerous thing to delete casually, so this refuses outright
 * when anyone has played in the competition. Dropping a league nobody has
 * touched is tidying; dropping one with Daily Locks in it destroys a record
 * somebody earned, and no flag here will do that.
 *
 * Clubs left behind with no league and no fixture go too, since a catalog entry
 * that belongs to nothing is what the dedupe work spent so long cleaning up.
 *
 * Usage: pnpm league:drop <slug> [<slug>...] [--apply]
 *        pnpm league:drop --orphans [--apply]   (clubs left in no competition)
 */

type LeagueRow = {
  id: string;
  slug: string;
  name: string;
  seasons: number;
  memberships: number;
  matchweeks: number;
  fixtures: number;
  picks: number;
  follows: number;
  records: number;
  participation: number;
};

async function loadLeagues(slugs: string[]) {
  return sqlClient<LeagueRow[]>`
    select l.id, l.slug, l.name,
      (select count(*)::int from seasons s where s.league_id = l.id) as seasons,
      (select count(*)::int from league_team_memberships m where m.league_id = l.id) as memberships,
      (select count(*)::int from matchweeks mw where mw.league_id = l.id) as matchweeks,
      (select count(*)::int from fixtures f where f.league_id = l.id) as fixtures,
      (select count(*)::int from picks p where p.league_id = l.id) as picks,
      (select count(*)::int from league_follows lf where lf.league_id = l.id) as follows,
      (select count(*)::int from user_league_records r where r.league_id = l.id) as records,
      (select count(*)::int from matchweek_participation mp where mp.league_id = l.id) as participation
    from leagues l where l.slug = any(${slugs})`;
}

/** Anything a person did in the competition. None of it survives the cascade. */
function playerData(league: LeagueRow) {
  return league.picks + league.follows + league.records + league.participation;
}

/**
 * Clubs no competition lists and no match mentions. Providers leave these behind
 * as they rename and re-import, and they are pure noise: unreachable in the app,
 * yet still offered to every name match the dedupe makes.
 */
async function sweepOrphans(apply: boolean) {
  const orphans = await sqlClient<Array<{ id: string; name: string }>>`
    select t.id, t.name from teams t
    where not exists (select 1 from league_team_memberships m where m.team_id = t.id)
      and not exists (select 1 from fixtures f where f.home_team_id = t.id or f.away_team_id = t.id)
      and not exists (select 1 from picks p where p.selected_team_id = t.id)`;

  if (orphans.length === 0) {
    console.info("No clubs left over.");
    return;
  }
  console.info(`${apply ? "REMOVING" : "WOULD REMOVE"} ${orphans.length} club(s) in no competition and no fixture:`);
  for (const orphan of orphans.slice(0, 10)) console.info(`  ${orphan.name}`);
  if (orphans.length > 10) console.info(`  ... and ${orphans.length - 10} more`);

  if (apply) {
    await sqlClient`delete from teams where id = any(${orphans.map((orphan) => orphan.id)})`;
  }
}

async function main() {
  const args = process.argv.slice(2);
  const apply = args.includes("--apply");
  const slugs = args.filter((arg) => !arg.startsWith("--"));

  if (args.includes("--orphans")) {
    console.info(`Target database: ${describeDatabaseTarget()}`);
    console.info(apply ? "Applying." : "Dry run. Pass --apply to write.");
    try {
      await sweepOrphans(apply);
    } finally {
      await sqlClient.end();
    }
    return;
  }

  if (slugs.length === 0) {
    console.error("Usage: pnpm league:drop <slug> [<slug>...] [--apply]\n       pnpm league:drop --orphans [--apply]");
    process.exitCode = 1;
    return;
  }

  console.info(`Target database: ${describeDatabaseTarget()}`);
  console.info(apply ? "Applying." : "Dry run. Pass --apply to write.");

  try {
    const leagues = await loadLeagues(slugs);
    for (const slug of slugs) {
      if (!leagues.some((league) => league.slug === slug)) console.warn(`NOT FOUND ${slug}`);
    }

    const blocked = leagues.filter((league) => playerData(league) > 0);
    for (const league of blocked) {
      console.error(`REFUSING ${league.slug}: ${playerData(league)} row(s) of player data ` +
        `(${league.picks} picks, ${league.participation} participation, ${league.follows} follows, ${league.records} records).`);
    }
    if (blocked.length > 0) {
      throw new Error("Some leagues have been played in and will not be dropped.");
    }

    for (const league of leagues) {
      console.info(`${apply ? "DROP" : "WOULD DROP"} ${league.slug} (${league.name}): ` +
        `${league.seasons} season(s), ${league.memberships} membership(s), ` +
        `${league.matchweeks} matchweek(s), ${league.fixtures} fixture(s)`);
    }
    if (leagues.length === 0 || !apply) {
      console.info(`\n${leagues.length} league(s)${apply ? " dropped" : " to drop"}.`);
      return;
    }

    const ids = leagues.map((league) => league.id);
    // Work out which clubs belong to nothing else BEFORE the cascade runs: once
    // the leagues are gone their memberships are too, and an unrelated stub
    // would be indistinguishable from a club these competitions brought in.
    const exclusive = await sqlClient<Array<{ id: string; name: string }>>`
      select t.id, t.name from teams t
      where exists (
          select 1 from league_team_memberships m
          where m.team_id = t.id and m.league_id = any(${ids}))
        and not exists (
          select 1 from league_team_memberships m
          where m.team_id = t.id and m.league_id <> all(${ids}))
        and not exists (select 1 from fixtures f where f.home_team_id = t.id or f.away_team_id = t.id)
        and not exists (select 1 from picks p where p.selected_team_id = t.id)`;

    await sqlClient.begin(async (sql) => {
      await sql`delete from leagues where id = any(${ids})`;
      if (exclusive.length > 0) {
        await sql`delete from teams where id = any(${exclusive.map((team) => team.id)})`;
      }
    });
    const orphaned = exclusive;

    console.info(`\n${leagues.length} league(s) dropped, ${orphaned.length} club(s) that played only there removed.`);
  } finally {
    await sqlClient.end();
  }
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
