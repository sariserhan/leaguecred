import { sqlClient } from "@/db";
import { describeDatabaseTarget } from "@/lib/env";
import { planMatchweekMerges, type MergeableMatchweek } from "@/services/matchweek-merge";

/**
 * Folds a real gameweek back into one matchweek.
 *
 * Matchweeks were identified by each provider's own round name, so one gameweek
 * was stored once per provider with the fixtures divided between them, and a
 * Weekly Lock could be made in each. `synchronizeFixtures` no longer splits
 * them; this repairs the weeks already stored.
 *
 * Reports without writing unless --apply is passed.
 */

type Row = MergeableMatchweek & { label: string };

async function loadMatchweeks() {
  const rows = await sqlClient<Array<{
    id: string; league_id: string; season_id: string; start_at: Date | string; end_at: Date | string;
    fixture_count: number; pick_count: number; participation_count: number; status: string;
    scheme: string; label: string;
  }>>`
    select mw.id, mw.league_id, mw.season_id, mw.start_at, mw.end_at, mw.status,
      (select count(*)::int from fixtures f where f.matchweek_id = mw.id) as fixture_count,
      (select count(*)::int from picks p where p.matchweek_id = mw.id) as pick_count,
      (select count(*)::int from matchweek_participation mp where mp.matchweek_id = mw.id) as participation_count,
      case when mw.provider_round_name like '%:%'
        then split_part(mw.provider_round_name, ':', 1) else 'default' end as scheme,
      l.slug || ' ' || to_char(mw.start_at, 'YYYY-MM-DD') || '..' || to_char(mw.end_at, 'MM-DD') as label
    from matchweeks mw join leagues l on l.id = mw.league_id
    order by mw.start_at`;

  return rows.map<Row>((row) => ({
    id: row.id, leagueId: row.league_id, seasonId: row.season_id,
    startAt: new Date(row.start_at).getTime(), endAt: new Date(row.end_at).getTime(),
    fixtureCount: row.fixture_count, pickCount: row.pick_count,
    participationCount: row.participation_count, status: row.status,
    scheme: row.scheme, label: row.label,
  }));
}

async function main() {
  const apply = process.argv.includes("--apply");

  console.info(`Target database: ${describeDatabaseTarget()}`);
  console.info(apply ? "Applying." : "Dry run. Pass --apply to write.");

  try {
    const { merges, committed } = planMatchweekMerges(await loadMatchweeks());

    for (const merge of merges) {
      const from = merge.absorbed.reduce((total, week) => total + week.fixtureCount, 0);
      console.info(`${apply ? "MERGE" : "WOULD MERGE"} ${merge.canonical.label}: ` +
        `absorbing ${merge.absorbed.length} week(s) and ${from} fixture(s)`);
    }
    for (const cluster of committed) {
      console.warn(`HELD BACK ${cluster[0].label}: ${cluster.length} weeks and more than one is already ` +
        `locked or played, so a person should decide which Weekly Locks stand.`);
    }

    if (apply) {
      for (const merge of merges) {
        const absorbedIds = merge.absorbed.map((week) => week.id);
        await sqlClient.begin(async (sql) => {
          await sql`update fixtures set matchweek_id = ${merge.canonical.id}, updated_at = now()
            where matchweek_id = any(${absorbedIds})`;
          // The survivor has to span every round it just took on.
          await sql`update matchweeks set
            start_at = least(start_at, ${new Date(Math.min(...merge.absorbed.map((w) => w.startAt))).toISOString()}::timestamptz),
            lock_at = least(lock_at, ${new Date(Math.min(...merge.absorbed.map((w) => w.startAt))).toISOString()}::timestamptz),
            end_at = greatest(end_at, ${new Date(Math.max(...merge.absorbed.map((w) => w.endAt))).toISOString()}::timestamptz),
            updated_at = now()
            where id = ${merge.canonical.id}`;
          // Safe by construction: the plan only absorbs weeks nobody committed to.
          await sql`delete from matchweeks where id = any(${absorbedIds})`;
        });
      }
    }

    const absorbed = merges.reduce((total, merge) => total + merge.absorbed.length, 0);
    console.info(`\n${absorbed} matchweek(s)${apply ? " merged" : " to merge"}, ${committed.length} held back.`);
  } finally {
    await sqlClient.end();
  }
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
