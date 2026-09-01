import { randomUUID } from "node:crypto";

import { sqlClient } from "@/db";
import { toIsoTimestamp } from "@/lib/timestamps";
import { settlePick } from "@/services/settlement";

/**
 * Admin-created members, and locks recorded against matches already played.
 *
 * Everything here writes records that the rest of the product treats as
 * genuine: a lock created this way is stored in the same table, settled by the
 * same settlement path, and counted in the same league record as one a member
 * placed themselves. Nothing downstream can tell the difference, which is the
 * whole point of the tool and also the reason it is admin-only and audited.
 *
 * The database normally refuses both of these things. Inserting a lock on a
 * started match is rejected, and pick timestamps are written by a trigger
 * rather than the caller so a record cannot be backdated. This is the only
 * caller that opens leaguecred.backfill to relax those two rules, and it opens
 * it for a single statement inside one transaction.
 */

export type SeedableMember = {
  id: string;
  name: string;
  locks: number;
  createdAt: string;
};

export type AssignableFixture = {
  id: string;
  kickoff: string;
  leagueName: string;
  home: { id: string; name: string };
  away: { id: string; name: string };
  homeScore: number | null;
  awayScore: number | null;
  /** Null for a draw, which still settles — as a loss whichever side was taken. */
  winnerTeamId: string | null;
  /** False for a match still to kick off: the lock is recorded as any member's
   * would be and settles when the match is played. */
  played: boolean;
};

export type AssignedLock = {
  pickId: string;
  matchDate: string;
  leagueName: string;
  selectedTeam: string;
  opponent: string;
  result: string;
};

const NAME_MIN = 2;
const NAME_MAX = 80;

export function validateMemberName(raw: string) {
  const name = raw.trim().replace(/\s+/g, " ");
  if (name.length < NAME_MIN) return { ok: false as const, message: "A name needs at least two characters." };
  if (name.length > NAME_MAX) return { ok: false as const, message: `A name cannot be longer than ${NAME_MAX} characters.` };
  return { ok: true as const, name };
}

/**
 * The address is a placeholder on a domain that cannot receive mail, and no
 * credential row is written, so nobody can sign in as one of these. It exists
 * because the column is required and unique, not because anyone will use it.
 */
export function seedEmailFor(id: string) {
  return `member-${id}@created.leaguecred.local`;
}

export async function createMember(input: { name: string; actorUserId: string }) {
  const validated = validateMemberName(input.name);
  if (!validated.ok) throw new Error(validated.message);

  const id = randomUUID();
  return sqlClient.begin(async (sql) => {
    await sql`
      insert into "user" (id, name, email, email_verified)
      values (${id}, ${validated.name}, ${seedEmailFor(id)}, false)`;
    await sql`
      insert into admin_audit_log (actor_user_id, action, target, before, after)
      values (${input.actorUserId}, 'member_created', ${id}, null, ${JSON.stringify({ name: validated.name })}::jsonb)`;
    return { id, name: validated.name };
  });
}

/** Every member, newest first, with how many locks each already holds. */
export async function listMembers(): Promise<SeedableMember[]> {
  const rows = await sqlClient<Array<{ id: string; name: string; locks: number; created_at: Date | string }>>`
    select u.id, u.name, count(p.id)::int as locks, u.created_at
    from "user" u
    left join picks p on p.user_id = u.id
    group by u.id, u.name, u.created_at
    order by u.created_at desc
    limit 100`;
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    locks: row.locks,
    createdAt: toIsoTimestamp(row.created_at),
  }));
}

/**
 * Played matches in the league's current season that this member could still be
 * given. A member holds at most one lock per league per day, so any date they
 * already hold one for is left out rather than offered and then rejected.
 */
export async function listAssignableFixtures(input: { userId: string; leagueSlug: string }): Promise<AssignableFixture[]> {
  type Row = {
    id: string; kickoff_at: Date | string; league_name: string;
    home_team_id: string; home_name: string; away_team_id: string; away_name: string;
    home_score: number | null; away_score: number | null; winner_team_id: string | null;
    status: string;
  };

  const columns = sqlClient`
    f.id, f.kickoff_at, f.status, l.name as league_name,
    f.home_team_id, home.name as home_name,
    f.away_team_id, away.name as away_name,
    f.home_score, f.away_score, f.winner_team_id`;

  // A day the member already holds a lock for is excluded either way: one lock
  // per league per day is the rule the product is built on.
  const [played, upcoming] = await Promise.all([
    sqlClient<Row[]>`
      select ${columns}
      from fixtures f
      join leagues l on l.id = f.league_id
      join seasons s on s.id = f.season_id and s.is_current = true
      join teams home on home.id = f.home_team_id
      join teams away on away.id = f.away_team_id
      where l.slug = ${input.leagueSlug}
        and f.status = 'finished'
        and not exists (
          select 1 from picks p
          where p.user_id = ${input.userId}
            and p.league_id = f.league_id
            and p.match_date = (f.kickoff_at at time zone 'UTC')::date)
      order by f.kickoff_at desc
      limit 60`,
    // Still to kick off, so a lock on one is an ordinary lock rather than a
    // backfill: it is placed now, and settles when the match is played.
    sqlClient<Row[]>`
      select ${columns}
      from fixtures f
      join leagues l on l.id = f.league_id
      join seasons s on s.id = f.season_id and s.is_current = true
      join teams home on home.id = f.home_team_id
      join teams away on away.id = f.away_team_id
      where l.slug = ${input.leagueSlug}
        and f.status = 'scheduled'
        and f.kickoff_at > now()
        and not exists (
          select 1 from picks p
          where p.user_id = ${input.userId}
            and p.league_id = f.league_id
            and p.match_date = (f.kickoff_at at time zone 'UTC')::date)
      order by f.kickoff_at
      limit 30`,
  ]);

  return [...upcoming, ...played].map((row) => ({
    id: row.id,
    kickoff: toIsoTimestamp(row.kickoff_at),
    leagueName: row.league_name,
    home: { id: row.home_team_id, name: row.home_name },
    away: { id: row.away_team_id, name: row.away_name },
    homeScore: row.home_score,
    awayScore: row.away_score,
    winnerTeamId: row.winner_team_id,
    played: row.status === "finished",
  }));
}

/** The locks a member holds, newest first, for the admin to review. */
export async function listAssignedLocks(userId: string): Promise<AssignedLock[]> {
  const rows = await sqlClient<Array<{
    pick_id: string; match_date: Date | string; league_name: string;
    selected_team: string; opponent: string; result: string;
  }>>`
    select p.id as pick_id, p.match_date, l.name as league_name,
      selected.name as selected_team,
      case when f.home_team_id = p.selected_team_id then away.name else home.name end as opponent,
      p.result
    from picks p
    join leagues l on l.id = p.league_id
    join fixtures f on f.id = p.fixture_id
    join teams selected on selected.id = p.selected_team_id
    join teams home on home.id = f.home_team_id
    join teams away on away.id = f.away_team_id
    where p.user_id = ${userId}
    order by p.match_date desc
    limit 50`;
  return rows.map((row) => ({
    pickId: row.pick_id,
    matchDate: String(row.match_date).slice(0, 10),
    leagueName: row.league_name,
    selectedTeam: row.selected_team,
    opponent: row.opponent,
    result: row.result,
  }));
}

/**
 * Records one lock against a match that has already been played, then settles
 * it so the member's league record moves the same way it would have if they had
 * placed the lock themselves.
 *
 * Settlement runs after the insert transaction commits rather than inside it,
 * because settlePick opens its own transaction and takes its own locks.
 */
/**
 * Records a lock for a member on a match they did not pick themselves.
 *
 * A played match is a backfill: the database refuses a lock on a started match,
 * and the trigger derives the timestamps from the kickoff so the row reads as a
 * lock placed before it rather than one placed at an arbitrary time.
 *
 * A match still to kick off needs none of that and gets none of it. It is an
 * ordinary lock, written down the ordinary path with ordinary timestamps, and
 * it settles when the match is played like any other. Relaxing the rules for it
 * would only stamp it with a submitted_at in the future.
 */
export async function assignMemberLock(input: {
  userId: string;
  fixtureId: string;
  selectedTeamId: string;
  actorUserId: string;
}) {
  const pickId = await sqlClient.begin(async (sql) => {
    const [fixture] = await sql<Array<{
      id: string; league_id: string; season_id: string; matchweek_id: string;
      home_team_id: string; away_team_id: string; status: string; match_date: string;
    }>>`
      select id, league_id, season_id, matchweek_id, home_team_id, away_team_id, status,
        (kickoff_at at time zone 'UTC')::date as match_date
      from fixtures where id = ${input.fixtureId} for share`;
    if (!fixture) throw new Error("That fixture no longer exists.");
    const played = fixture.status === "finished";
    if (!played && fixture.status !== "scheduled") {
      throw new Error("A match already under way cannot be assigned.");
    }
    if (input.selectedTeamId !== fixture.home_team_id && input.selectedTeamId !== fixture.away_team_id) {
      throw new Error("That team is not playing in this fixture.");
    }

    // A lock requires the member to be an independent entrant for the matchweek.
    // Participation is immutable once written, so an existing row is left alone;
    // if it says 'follow', the trigger refuses the lock, which is correct.
    await sql`
      insert into matchweek_participation (user_id, league_id, matchweek_id, mode)
      values (${input.userId}, ${fixture.league_id}, ${fixture.matchweek_id}, 'independent')
      on conflict (user_id, league_id, matchweek_id) do nothing`;

    // Transaction-local, so it cannot leak to another statement on this pooled
    // connection once this transaction ends. Only a played match needs it: an
    // upcoming one is a lock the rules already allow.
    if (played) await sql`select set_config('leaguecred.backfill', 'on', true)`;

    const [pick] = await sql<Array<{ id: string }>>`
      insert into picks (user_id, league_id, season_id, matchweek_id, fixture_id, selected_team_id, match_date)
      values (${input.userId}, ${fixture.league_id}, ${fixture.season_id}, ${fixture.matchweek_id},
        ${fixture.id}, ${input.selectedTeamId}, ${fixture.match_date})
      returning id`;
    if (!pick) throw new Error("The lock was not recorded.");

    await sql`
      insert into admin_audit_log (actor_user_id, action, target, before, after)
      values (${input.actorUserId}, 'lock_assigned', ${input.userId}, null,
        ${JSON.stringify({ pickId: pick.id, fixtureId: input.fixtureId, selectedTeamId: input.selectedTeamId })}::jsonb)`;

    return pick.id;
  });

  await settlePick(pickId);
  return pickId;
}
