import { describe, expect, it } from "vitest";

import { sqlClient } from "@/db";
import { getLeaderboards } from "@/data/leaderboard";

const superLig = "10000000-0000-4000-8000-000000000001";

async function rankedMember(suffix: string, picks: number, wins: number, accuracy: number) {
  const id = `test-board-${suffix}`;
  await sqlClient`insert into "user" (id, name, email, email_verified, username)
    values (${id}, ${`Board ${suffix}`}, ${`${id}@test.local`}, true, ${`board_${suffix.slice(0, 10)}`})`;
  await sqlClient`insert into user_league_records
    (user_id, league_id, wins, losses, settled_picks, current_win_streak, best_win_streak, confidence_adjusted_accuracy)
    values (${id}, ${superLig}, ${wins}, ${picks - wins}, ${picks}, 2, 3, ${accuracy})`;
  return id;
}

describe("getLeaderboards", () => {
  // The threshold is the whole promise of a rank: it cannot be reached by
  // showing up, and a table that ignored it would be selling something else.
  it("lists only members past the rank threshold, in both scopes", async () => {
    const suffix = crypto.randomUUID().slice(0, 8);
    const ranked = await rankedMember(`ranked-${suffix}`, 12, 9, 0.61);
    const unranked = await rankedMember(`unranked-${suffix}`, 2, 2, 0.99);

    const board = await getLeaderboards();
    const superLigBoard = board.leagues.find((entry) => entry.league.id === superLig);

    expect(board.global.some((row) => row.userId === ranked)).toBe(true);
    expect(board.global.some((row) => row.userId === unranked)).toBe(false);
    expect(superLigBoard?.rows.some((row) => row.userId === unranked)).toBe(false);
  });

  it("carries the handle to link with, and names the league a record was built in", async () => {
    const suffix = crypto.randomUUID().slice(0, 8);
    const id = await rankedMember(`strongest-${suffix}`, 30, 25, 0.94);

    const board = await getLeaderboards();
    const row = board.global.find((entry) => entry.userId === id);

    expect(row?.handle).toBeTruthy();
    expect(row?.strongestLeague?.slug).toBe("super-lig");
    expect(row?.settledPicks).toBe(30);
  });
});
