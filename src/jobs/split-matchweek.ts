import { sqlClient } from "@/db";
import { describeDatabaseTarget } from "@/lib/env";
import { planMatchweekRounds } from "@/services/matchweek-split";

/**
 * Splits a matchweek that holds more than one round back into one week each.
 *
 * The counterpart to merge-matchweeks. That job repairs one gameweek stored as
 * several; this repairs several stored as one. Liga Portugal had a thirteen-day
 * week holding two rounds and a leftover, and no Week 4 at all, because
 * fixture-sync lets a round join a week another provider opened and then widens
 * that week to cover it — so each widening made it a larger target for the next.
 *
 * A week that anyone has entered is never touched. Participation is immutable
 * and a lock belongs to a matchweek, so moving fixtures out from under one would
 * change what a player entered after they entered it.
 *
 * Weeks are renumbered afterwards, because the numbering counts weeks by start
 * date and a swallowed week leaves a gap in it.
 *
 * Usage:
 *   pnpm matchweeks:split [<league-slug>] [--apply]
 */

type WeekRow = {
  id: string;
  league_id: string;
  league_slug: string;
  league_name: string;
  display_name: string;
  start_at: Date | string;
  end_at: Date | string;
  season_id: string;
  provider_round_name: string;
  picks: number;
  participation: number;
};

async function loadWeeks(leagueSlug: string | null) {
  return sqlClient<WeekRow[]>`
    select m.id, m.league_id, l.slug as league_slug, l.name as league_name, m.display_name,
      m.start_at, m.end_at, m.season_id, m.provider_round_name,
      (select count(*)::int from picks p where p.matchweek_id = m.id) as picks,
      (select count(*)::int from matchweek_participation mp where mp.matchweek_id = m.id) as participation
    from matchweeks m
    join leagues l on l.id = m.league_id
    where l.enabled = true
      and (${leagueSlug}::text is null or l.slug = ${leagueSlug})
    order by l.slug, m.start_at`;
}

async function renumber(leagueId: string, seasonId: string, leagueName: string, apply: boolean) {
  const weeks = await sqlClient<Array<{ id: string; display_name: string }>>`
    select id, display_name from matchweeks
    where league_id = ${leagueId} and season_id = ${seasonId}
    order by start_at`;

  for (const [index, week] of weeks.entries()) {
    const name = `${leagueName} — Week ${index + 1}`;
    if (week.display_name === name) continue;
    console.info(`  ${apply ? "RENUMBER" : "WOULD RENUMBER"} "${week.display_name}" -> "${name}"`);
    if (apply) {
      await sqlClient`update matchweeks set display_name = ${name}, updated_at = now() where id = ${week.id}`;
    }
  }
}

async function main() {
  const apply = process.argv.includes("--apply");
  const leagueSlug = process.argv[2] && !process.argv[2].startsWith("--") ? process.argv[2] : null;

  console.info(`Target database: ${describeDatabaseTarget()}`);
  console.info(apply ? "Applying." : "Dry run. Pass --apply to write.");

  try {
    const weeks = await loadWeeks(leagueSlug);
    let split = 0;
    const touched = new Map<string, { leagueId: string; seasonId: string; leagueName: string }>();

    for (const week of weeks) {
      // Every league examined is renumbered, not only the ones split here. The
      // numbering counts weeks by start date, so absorbing a week elsewhere —
      // merge-matchweeks does exactly that — leaves the same hole this job was
      // added to close. Renaming is a no-op where the names already fit.
      touched.set(`${week.league_id}:${week.season_id}`, {
        leagueId: week.league_id, seasonId: week.season_id, leagueName: week.league_name,
      });

      const fixtures = await sqlClient<Array<{ id: string; kickoff_at: Date | string }>>`
        select id, kickoff_at from fixtures where matchweek_id = ${week.id} order by kickoff_at`;
      const rounds = planMatchweekRounds(fixtures.map((f) => ({ id: f.id, kickoffAt: f.kickoff_at })));
      if (rounds.length < 2) continue;

      const label = `${week.league_slug} "${week.display_name}"`;
      if (week.picks > 0 || week.participation > 0) {
        console.info(
          `HELD BACK ${label}: holds ${rounds.length} rounds but ${week.picks} lock(s) and ` +
          `${week.participation} entrant(s). Moving fixtures would change a week someone already entered.`,
        );
        continue;
      }

      console.info(`${apply ? "SPLIT" : "WOULD SPLIT"} ${label}: ${rounds.length} rounds`);
      for (const [index, round] of rounds.entries()) {
        const range = `${round.startAt.toISOString().slice(0, 10)}..${round.endAt.toISOString().slice(0, 10)}`;
        console.info(`  round ${index + 1}: ${round.fixtureIds.length} fixture(s) ${range}${index === 0 ? " (stays)" : ""}`);
      }
      split += rounds.length - 1;
      if (!apply) continue;

      await sqlClient.begin(async (sql) => {
        const [first, ...rest] = rounds;
        // postgres.js will not bind a Date, so timestamps go as ISO text with
        // the cast that tells Postgres what they are.
        const stamp = (value: Date) => value.toISOString();
        // The week keeps its first round and shrinks to it, so it stops being a
        // target the next round can join.
        await sql`
          update matchweeks set start_at = ${stamp(first.startAt)}::timestamptz,
            lock_at = ${stamp(first.startAt)}::timestamptz,
            end_at = ${stamp(first.endAt)}::timestamptz, updated_at = now()
          where id = ${week.id}`;

        for (const [index, round] of rest.entries()) {
          const [created] = await sql<Array<{ id: string }>>`
            insert into matchweeks (league_id, season_id, provider_round_name, display_name, start_at, lock_at, end_at, status)
            values (${week.league_id}, ${week.season_id},
              ${`${week.provider_round_name}:split-${index + 1}`},
              ${`${week.league_name} — split ${index + 1}`},
              ${stamp(round.startAt)}::timestamptz, ${stamp(round.startAt)}::timestamptz,
              ${stamp(round.endAt)}::timestamptz, 'upcoming')
            returning id`;
          if (!created) throw new Error("Could not create the matchweek.");
          await sql`
            update fixtures set matchweek_id = ${created.id}, updated_at = now()
            where id = any(${round.fixtureIds}::uuid[])`;
        }
      });
    }

    for (const entry of touched.values()) {
      console.info(`Renumbering ${entry.leagueName}:`);
      await renumber(entry.leagueId, entry.seasonId, entry.leagueName, apply);
    }

    console.info(`\n${split} matchweek(s)${apply ? " created" : " to create"}.`);
  } finally {
    await sqlClient.end();
  }
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
