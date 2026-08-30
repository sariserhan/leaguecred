import type { BannerTone } from "@/db/schema";

export const LEAGUE_LEADERBOARD_FLAG = "league_leaderboard";
export const LEAGUE_TEAM_CATALOG_FLAG = "league_team_catalog";

export const BANNER_MESSAGE_MAX_LENGTH = 280;
export const MAINTENANCE_MESSAGE_MAX_LENGTH = 500;

export type FeatureFlagDefinition = {
  key: string;
  label: string;
  description: string;
  defaultEnabled: boolean;
};

/**
 * Every flag listed here is read by real UI. A flag that toggles nothing is
 * worse than no flag at all, so adding an entry means wiring it at the same time.
 */
export const featureFlagDefinitions: readonly FeatureFlagDefinition[] = [
  {
    key: LEAGUE_LEADERBOARD_FLAG,
    label: "League leaderboards",
    description:
      "Shows the current-season and career leaderboard on every league page.",
    defaultEnabled: true,
  },
  {
    key: LEAGUE_TEAM_CATALOG_FLAG,
    label: "League team catalog",
    description:
      "Shows the partial team and badge catalog underneath each league page.",
    defaultEnabled: true,
  },
] as const;

export type SiteSettings = {
  maintenanceEnabled: boolean;
  maintenanceMessage: string | null;
  bannerEnabled: boolean;
  bannerMessage: string | null;
  bannerTone: BannerTone;
};

export const defaultSiteSettings: SiteSettings = {
  maintenanceEnabled: false,
  maintenanceMessage: null,
  bannerEnabled: false,
  bannerMessage: null,
  bannerTone: "info",
};

export type ResolvedFeatureFlag = FeatureFlagDefinition & {
  enabled: boolean;
  /** False for a row that survives in the database after its definition was removed. */
  known: boolean;
};

/**
 * Definitions are the source of truth for which flags exist. A stored row only
 * overrides the default, so a flag that has never been toggled still resolves.
 */
export function resolveFeatureFlags(
  rows: readonly { key: string; enabled: boolean }[],
): ResolvedFeatureFlag[] {
  const stored = new Map(rows.map((row) => [row.key, row.enabled]));

  const defined = featureFlagDefinitions.map((definition) => ({
    ...definition,
    enabled: stored.get(definition.key) ?? definition.defaultEnabled,
    known: true,
  }));

  const orphaned = rows
    .filter((row) => !featureFlagDefinitions.some((item) => item.key === row.key))
    .map((row) => ({
      key: row.key,
      label: row.key,
      description: "Stored flag with no definition in the application.",
      defaultEnabled: false,
      enabled: row.enabled,
      known: false,
    }));

  return [...defined, ...orphaned];
}

export function isFeatureEnabled(
  flags: readonly ResolvedFeatureFlag[],
  key: string,
) {
  return flags.find((flag) => flag.key === key)?.enabled ?? false;
}

/**
 * Admins keep browsing the real site during maintenance, otherwise turning it
 * off again would mean editing the database by hand.
 */
export function shouldServeMaintenance(input: {
  maintenanceEnabled: boolean;
  viewerIsAdmin: boolean;
}) {
  return input.maintenanceEnabled && !input.viewerIsAdmin;
}

export function normalizeAdminMessage(value: string | null | undefined, maxLength: number) {
  if (typeof value !== "string") return null;

  const collapsed = value.replace(/\s+/g, " ").trim();
  if (!collapsed) return null;

  return collapsed.slice(0, maxLength);
}
