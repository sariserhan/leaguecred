import { sqlClient } from "@/db";
import { describeDatabaseTarget } from "@/lib/env";
import { planFixtureMerges, type DedupeFixture } from "@/services/fixture-dedupe";

/**
 * Removes the second copy of a match.
 *
 * Several providers cover the same leagues, and a fixture is keyed by
 * (provider, provider_external_id), so each recorded the same match separately.
 * Both then counted in the standings. `synchronizeFixtures` no longer creates
 * them; this clears the ones already stored, and drops any matchweek left with
 * nothing in it.
 *
 * Reports without writing unless --apply is passed.
 */

type FixtureRow = DedupeFixture & { matchweekId: string; label: string };

async function loadFixtures() {
  const rows = await sqlClient<Array<{
    id: string; match_key: string; provider: string; status: string;
    home_score: number | null; away_score: number | null; pick_count: number;
    created_at: number; matchweek_id: string; label: string;
  }>>`
    select f.id,
      f.league_id || '|' || f.season_id || '|' || f.home_team_id || '|' || f.away_team_id
        || '|' || date(f.kickoff_at) as match_key,
      f.provider, f.status, f.home_score, f.away_score,
      (select count(*)::int from picks p where p.fixture_id = f.id) as pick_count,
      extract(epoch from f.created_at)::float8 as created_at,
      f.matchweek_id,
      h.name || ' v ' || a.name || ' ' || to_char(f.kickoff_at, 'YYYY-MM-DD') as label
    from fixtures f
    join teams h on h.id = f.home_team_id
    join teams a on a.id = f.away_team_id
    order by f.created_at`;

  return rows.map<FixtureRow>((row) => ({
    id: row.id, matchKey: row.match_key, provider: row.provider, status: row.status,
    homeScore: row.home_score, awayScore: row.away_score, pickCount: row.pick_count,
    createdAt: row.created_at, matchweekId: row.matchweek_id, label: row.label,
  }));
}

async function main() {
  const apply = process.argv.includes("--apply");

  console.info(`Target database: ${describeDatabaseTarget()}`);
  console.info(apply ? "Applying." : "Dry run. Pass --apply to write.");

  try {
    const { merges, withPicks } = planFixtureMerges(await loadFixtures());

    for (const merge of merges) {
      console.info(`${apply ? "DROP" : "WOULD DROP"} ${merge.duplicates.length} copy of ${merge.canonical.label}` +
        ` — keeping ${merge.canonical.provider}, dropping ${merge.duplicates.map((f) => f.provider).join(", ")}`);
    }
    for (const group of withPicks) {
      console.warn(`HELD BACK ${group[0].label}: a copy carries picks, so a person should move them first.`);
    }

    if (apply && merges.length > 0) {
      const doomed = merges.flatMap((merge) => merge.duplicates.map((fixture) => fixture.id));
      const touchedMatchweeks = [...new Set(merges.flatMap((m) => m.duplicates.map((f) => f.matchweekId)))];

      await sqlClient.begin(async (sql) => {
        await sql`delete from fixtures where id = any(${doomed})`;
        // A matchweek that only ever held duplicates has nothing left to show,
        // and an empty week in the picker is worse than no week.
        await sql`delete from matchweeks mw
          where mw.id = any(${touchedMatchweeks})
            and not exists (select 1 from fixtures f where f.matchweek_id = mw.id)
            and not exists (select 1 from matchweek_participation mp where mp.matchweek_id = mw.id)
            and not exists (select 1 from picks p where p.matchweek_id = mw.id)`;
      });
    }

    const dropped = merges.reduce((total, merge) => total + merge.duplicates.length, 0);
    console.info(`\n${dropped} duplicate fixture(s)${apply ? " removed" : " to remove"}, ${withPicks.length} held back.`);
  } finally {
    await sqlClient.end();
  }
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
