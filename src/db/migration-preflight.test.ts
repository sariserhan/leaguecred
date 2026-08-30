import { describe, expect, it } from "vitest";

import { findMigrationProblems, isBlocking, type JournalMigration } from "@/db/migration-preflight";

function entry(tag: string, when: number, hash = `${tag}-hash`): JournalMigration {
  return { tag, when, hash };
}

function applied(entries: JournalMigration[]) {
  return entries.map((one) => ({ hash: one.hash, created_at: one.when }));
}

const first = entry("0009_earlier", 100);
const deployed = entry("0010_theirs", 200);

describe("findMigrationProblems", () => {
  it("passes a journal the database has fully applied", () => {
    expect(findMigrationProblems([first, deployed], applied([first, deployed]))).toEqual([]);
  });

  it("passes a new migration timed above the high-water mark", () => {
    const next = entry("0011_mine", 300);
    expect(findMigrationProblems([first, deployed, next], applied([first, deployed]))).toEqual([]);
  });

  it("reports a migration that would never run because it is timed too early", () => {
    // Two branches generated a migration in parallel and the older merged last.
    const stranded = entry("0010_mine", 150);
    const problems = findMigrationProblems([first, stranded, deployed], applied([first, deployed]));

    expect(problems).toEqual([
      { kind: "skipped", tag: "0010_mine", when: 150, highWater: 200 },
    ]);
    expect(problems.every(isBlocking)).toBe(true);
  });

  it("reports a migration edited after it was applied", () => {
    const rewritten = entry("0010_theirs", 200, "different-hash");
    const problems = findMigrationProblems([first, rewritten], applied([first, deployed]));

    expect(problems).toEqual([{ kind: "changed", tag: "0010_theirs", when: 200 }]);
    expect(problems.every(isBlocking)).toBe(true);
  });

  it("notes a leftover row the journal has forgotten without blocking", () => {
    // What re-timing a migration leaves behind: the old row keeps its stamp.
    const problems = findMigrationProblems([first], applied([first, deployed]));

    expect(problems).toEqual([{ kind: "untracked", hash: deployed.hash, createdAt: 200 }]);
    expect(problems.some(isBlocking)).toBe(false);
  });

  it("treats an empty database as having nothing to reconcile", () => {
    expect(findMigrationProblems([first, deployed], [])).toEqual([]);
  });

  it("does not flag a re-timed migration that now sits above the mark", () => {
    // The renumbering fix: the file moved to a later slot, and the row it left
    // behind is reported as leftover rather than as a failure.
    const retimed = entry("0011_mine", 300, "0010_mine-hash");
    const problems = findMigrationProblems([first, deployed, retimed], applied([first, deployed]));

    expect(problems).toEqual([]);
  });
});
