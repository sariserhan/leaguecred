import type postgres from "postgres";

import {
  describeProblem,
  findMigrationProblems,
  isBlocking,
  readJournal,
} from "@/db/migration-preflight";

/**
 * Compares the journal against what a database has actually applied, and
 * refuses to continue when a migration can no longer be reached.
 *
 * Deliberately reads the migrations table directly rather than going through
 * drizzle, because the point is to check the migrator's own bookkeeping.
 */
export async function assertMigrationsReachable(sql: postgres.Sql, migrationsFolder: string) {
  const applied = await sql<Array<{ hash: string; created_at: string }>>`
    select hash, created_at from drizzle.__drizzle_migrations
    where created_at is not null`
    .catch(() => []);

  const problems = findMigrationProblems(
    readJournal(migrationsFolder),
    applied.map((row) => ({ hash: row.hash, created_at: Number(row.created_at) })),
  );

  for (const problem of problems) {
    console[isBlocking(problem) ? "error" : "warn"](describeProblem(problem));
  }

  const blocking = problems.filter(isBlocking);
  if (blocking.length > 0) {
    throw new Error(`${blocking.length} migration(s) cannot be applied as ordered.`);
  }
}
