import { describe, expect, it } from "vitest";

import { sqlClient } from "@/db";
import { getCommunityChallenge } from "@/data/distribution";
import { getGlobalActiveLocks } from "@/data/live-locks";
import { getHomeData } from "@/data/home";
import { getNetworkActivity } from "@/data/network";
import { getPersonalizedRecommendations } from "@/data/recommendations";
import { getSpecialistDirectory } from "@/data/specialists";

/**
 * Every surface that links to a profile now reads the handle to link with.
 *
 * These queries are single-line and dense, and a column added to one of them is
 * invisible to the type checker: it type-checks against the shape the developer
 * wrote, not the shape the database returns. So each is executed once - a
 * missing column, or one left out of a GROUP BY, fails here rather than on the
 * page.
 */
describe("profile link sources", () => {
  it("run without error and carry a handle to link with", async () => {
    const [viewer] = await sqlClient<Array<{ id: string }>>`
      insert into "user" (id, name, email, email_verified, username)
      values (${`test-links-${crypto.randomUUID()}`}, 'Link Reader',
        ${`links-${crypto.randomUUID()}@test.local`}, true, ${`links_${crypto.randomUUID().slice(0, 8)}`})
      returning id`;

    const [home, recommendations, activity, challenge, directory, board] = await Promise.all([
      getHomeData(),
      getPersonalizedRecommendations(viewer!.id),
      getNetworkActivity(viewer!.id),
      getCommunityChallenge(),
      getSpecialistDirectory(),
      getGlobalActiveLocks(viewer!.id),
    ]);

    // Shape rather than content: the fixtures these read are whatever the test
    // database happens to hold, and what matters is that the field exists.
    for (const specialist of home.specialists) expect(specialist).toHaveProperty("handle");
    for (const entry of recommendations) expect(entry).toHaveProperty("specialistHandle");
    for (const entry of activity) expect(entry).toHaveProperty("specialistHandle");
    for (const entry of directory) expect(entry).toHaveProperty("handle");
    for (const lock of board) expect(lock).toHaveProperty("handle");
    for (const side of challenge ? [challenge.home, challenge.away] : []) {
      for (const leader of side.leaders) expect(leader).toHaveProperty("handle");
    }
  });
});
