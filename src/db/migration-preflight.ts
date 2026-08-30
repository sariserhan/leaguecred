import crypto from "node:crypto";
import fs from "node:fs";

/**
 * Catches the two ways drizzle loses a migration without saying anything.
 *
 * The migrator keeps one high-water mark — the newest `created_at` in
 * `drizzle.__drizzle_migrations` — and runs an entry only when its journal
 * `when` is greater than that. It never checks entries individually, and it
 * records each file's hash without ever comparing it again. So:
 *
 *  - a migration whose `when` lands below the high-water mark, which is what
 *    happens when two branches generate one in parallel and the older one
 *    merges second, is skipped forever, with no error;
 *  - a migration edited after it was applied is never re-run, and the stored
 *    hash that would reveal it is never read.
 *
 * Both are invisible until something downstream fails against a schema that
 * was never actually migrated, so they are worth failing a deploy over.
 */

export type JournalMigration = { tag: string; when: number; hash: string };
export type AppliedMigration = { hash: string; created_at: number };

export type MigrationProblem =
  | { kind: "skipped"; tag: string; when: number; highWater: number }
  | { kind: "changed"; tag: string; when: number }
  | { kind: "untracked"; hash: string; createdAt: number };

export function findMigrationProblems(
  journal: JournalMigration[],
  applied: AppliedMigration[],
): MigrationProblem[] {
  const problems: MigrationProblem[] = [];
  if (applied.length === 0) return problems;

  const highWater = Math.max(...applied.map((row) => Number(row.created_at)));
  const appliedByWhen = new Map(applied.map((row) => [Number(row.created_at), row.hash]));

  for (const entry of journal) {
    const appliedHash = appliedByWhen.get(entry.when);
    if (appliedHash === undefined) {
      // Anything at or below the high-water mark will never be reached again.
      if (entry.when <= highWater) {
        problems.push({ kind: "skipped", tag: entry.tag, when: entry.when, highWater });
      }
      continue;
    }
    if (appliedHash !== entry.hash) {
      problems.push({ kind: "changed", tag: entry.tag, when: entry.when });
    }
  }

  const journalWhens = new Set(journal.map((entry) => entry.when));
  for (const row of applied) {
    if (!journalWhens.has(Number(row.created_at))) {
      problems.push({ kind: "untracked", hash: row.hash, createdAt: Number(row.created_at) });
    }
  }

  return problems;
}

/** Only a migration the database can no longer reach is worth stopping for. A
 * row the journal has forgotten is a leftover, and says so without failing. */
export function isBlocking(problem: MigrationProblem) {
  return problem.kind !== "untracked";
}

export function describeProblem(problem: MigrationProblem) {
  switch (problem.kind) {
    case "skipped":
      return `${problem.tag} (when ${problem.when}) will never run: the database has already applied ${problem.highWater}. Give it a "when" above that in drizzle/meta/_journal.json.`;
    case "changed":
      return `${problem.tag} (when ${problem.when}) was edited after it was applied. Restore the file, or write the change as a new migration.`;
    case "untracked":
      return `The database records a migration at ${problem.createdAt} that the journal no longer lists. Left over from a renamed or re-timed migration; delete the row once you have confirmed it.`;
  }
}

/**
 * Reads the journal the same way the migrator does — entries in array order,
 * hashed over the raw file — so the preflight sees exactly what it will.
 */
export function readJournal(migrationsFolder: string): JournalMigration[] {
  const journalPath = `${migrationsFolder}/meta/_journal.json`;
  const journal = JSON.parse(fs.readFileSync(journalPath, "utf8")) as {
    entries: Array<{ tag: string; when: number }>;
  };
  return journal.entries.map((entry) => {
    const query = fs.readFileSync(`${migrationsFolder}/${entry.tag}.sql`, "utf8");
    return {
      tag: entry.tag,
      when: entry.when,
      hash: crypto.createHash("sha256").update(query).digest("hex"),
    };
  });
}
