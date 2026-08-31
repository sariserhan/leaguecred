import { describe, expect, it } from "vitest";

import {
  BANNER_MESSAGE_MAX_LENGTH,
  HOMEPAGE_ACTIVITY_FLAG,
  LEAGUE_LEADERBOARD_FLAG,
  MAX_SETTLED_PICKS_FOR_RANK,
  MIN_SETTLED_PICKS_FOR_RANK,
  STANDARD_SETTLED_PICKS_FOR_RANK,
  defaultSiteSettings,
  featureFlagDefinitions,
  isFeatureEnabled,
  normalizeAdminMessage,
  resolveFeatureFlags,
  shouldServeMaintenance,
} from "@/lib/site-settings";

describe("resolveFeatureFlags", () => {
  it("falls back to the definition default when the flag was never stored", () => {
    const flags = resolveFeatureFlags([]);

    expect(flags).toHaveLength(featureFlagDefinitions.length);
    expect(isFeatureEnabled(flags, LEAGUE_LEADERBOARD_FLAG)).toBe(true);
    expect(isFeatureEnabled(flags, HOMEPAGE_ACTIVITY_FLAG)).toBe(false);
  });

  it("lets a stored row override the default", () => {
    const flags = resolveFeatureFlags([{ key: LEAGUE_LEADERBOARD_FLAG, enabled: false }]);

    expect(isFeatureEnabled(flags, LEAGUE_LEADERBOARD_FLAG)).toBe(false);
  });

  it("keeps a stored flag that no longer has a definition, marked unknown", () => {
    const flags = resolveFeatureFlags([{ key: "retired_experiment", enabled: true }]);
    const orphan = flags.find((flag) => flag.key === "retired_experiment");

    expect(orphan).toMatchObject({ enabled: true, known: false });
    expect(flags.filter((flag) => flag.known)).toHaveLength(featureFlagDefinitions.length);
  });

  it("reports an unknown key as disabled rather than throwing", () => {
    expect(isFeatureEnabled(resolveFeatureFlags([]), "never_defined")).toBe(false);
  });
});

describe("shouldServeMaintenance", () => {
  it("blocks members while maintenance is enabled", () => {
    expect(shouldServeMaintenance({ maintenanceEnabled: true, viewerIsAdmin: false })).toBe(true);
  });

  it("lets an admin through so maintenance can be switched back off", () => {
    expect(shouldServeMaintenance({ maintenanceEnabled: true, viewerIsAdmin: true })).toBe(false);
  });

  it("blocks nobody while maintenance is disabled", () => {
    expect(shouldServeMaintenance({ maintenanceEnabled: false, viewerIsAdmin: false })).toBe(false);
  });
});

describe("normalizeAdminMessage", () => {
  it("collapses whitespace and trims", () => {
    expect(normalizeAdminMessage("  Scheduled\n\n  upgrade  ", 100)).toBe("Scheduled upgrade");
  });

  it("treats a blank or missing message as no message", () => {
    expect(normalizeAdminMessage("   ", 100)).toBeNull();
    expect(normalizeAdminMessage(null, 100)).toBeNull();
    expect(normalizeAdminMessage(undefined, 100)).toBeNull();
  });

  it("truncates to the maximum length", () => {
    expect(normalizeAdminMessage("x".repeat(400), BANNER_MESSAGE_MAX_LENGTH)).toHaveLength(
      BANNER_MESSAGE_MAX_LENGTH,
    );
  });
});

describe("the rank threshold", () => {
  it("defaults to the standard bar when no settings row exists", () => {
    // getSiteSettings falls back to these, so a database it cannot read must
    // not quietly make everyone rankable.
    expect(defaultSiteSettings.minimumSettledPicksForRank).toBe(STANDARD_SETTLED_PICKS_FOR_RANK);
    expect(STANDARD_SETTLED_PICKS_FOR_RANK).toBe(10);
  });

  it("bounds what an admin may set", () => {
    // Zero would rank a record with no evidence at all; the upper bound keeps
    // the setting from being used to switch ranking off entirely.
    expect(MIN_SETTLED_PICKS_FOR_RANK).toBe(1);
    expect(MAX_SETTLED_PICKS_FOR_RANK).toBe(100);
    expect(MIN_SETTLED_PICKS_FOR_RANK).toBeLessThan(STANDARD_SETTLED_PICKS_FOR_RANK);
    expect(STANDARD_SETTLED_PICKS_FOR_RANK).toBeLessThan(MAX_SETTLED_PICKS_FOR_RANK);
  });
});
