"use server";

import { revalidatePath, updateTag } from "next/cache";
import { z } from "zod";

import { requireAdmin } from "@/lib/admin";
import {
  FEATURE_FLAGS_TAG,
  LEAGUE_NAV_TAG,
  BANNER_MESSAGE_MAX_LENGTH,
  MAINTENANCE_MESSAGE_MAX_LENGTH,
  MAX_SETTLED_PICKS_FOR_RANK,
  MIN_SETTLED_PICKS_FOR_RANK,
  featureFlagDefinitions,
  normalizeAdminMessage,
} from "@/lib/site-settings";
import {
  type AssignableFixture,
  type AssignedLock,
  assignMemberLock,
  createMember,
  listAssignableFixtures,
  listAssignedLocks,
} from "@/services/member-seeding";
import { setFeatureFlag, updateSiteSettings } from "@/services/site-settings";
import { synchronizeFixtures } from "@/services/fixture-sync";
import { synchronizeMatchResults } from "@/services/result-sync";
import {
  applyTeamMerge,
  buildDedupeReport,
  findPlannedMerge,
  mergeNamedTeams,
  type DedupeReport,
} from "@/services/team-dedupe-plan";
import { settlePendingPicks } from "@/services/settlement";
import { ESPN_FIXTURE_COMPETITIONS, EspnFixtureProvider } from "@/providers/espn-fixtures";
import { espnStandingsTag } from "@/providers/espn-standings";
import { withinUserRateLimit } from "@/services/rate-limit";

export type AdminActionResult = { ok: true } | { ok: false; message: string };

const siteSettingsSchema = z.object({
  minimumSettledPicksForRank: z.coerce.number().int()
    .min(MIN_SETTLED_PICKS_FOR_RANK).max(MAX_SETTLED_PICKS_FOR_RANK),
  maintenanceEnabled: z.boolean(),
  maintenanceMessage: z.string().max(2000).nullable(),
  bannerEnabled: z.boolean(),
  bannerMessage: z.string().max(2000).nullable(),
  bannerTone: z.enum(["info", "warning", "critical"]),
});

export async function saveSiteSettings(
  input: z.input<typeof siteSettingsSchema>,
): Promise<AdminActionResult> {
  const viewer = await requireAdmin();

  const parsed = siteSettingsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Those site settings are invalid." };

  const bannerMessage = normalizeAdminMessage(parsed.data.bannerMessage, BANNER_MESSAGE_MAX_LENGTH);
  if (parsed.data.bannerEnabled && !bannerMessage) {
    return { ok: false, message: "A banner needs a message before it can be shown." };
  }

  try {
    await updateSiteSettings(
      {
        minimumSettledPicksForRank: parsed.data.minimumSettledPicksForRank,
        maintenanceEnabled: parsed.data.maintenanceEnabled,
        maintenanceMessage: normalizeAdminMessage(
          parsed.data.maintenanceMessage,
          MAINTENANCE_MESSAGE_MAX_LENGTH,
        ),
        bannerEnabled: parsed.data.bannerEnabled,
        bannerMessage,
        bannerTone: parsed.data.bannerTone,
      },
      viewer.id,
    );
  } catch (error) {
    console.error("Failed to save site settings.", error);
    return { ok: false, message: "The site settings could not be saved. Please try again." };
  }

  // No updateTag here: the settings are read fresh on every request rather than
  // cached, precisely so the maintenance switch cannot be left waiting on one.
  revalidatePath("/", "layout");
  return { ok: true };
}

export type LeagueRefreshResult =
  | { ok: true; requests: number; leagues: number; created: number; updated: number; lateAdded: number; adopted: number; faults: string[] }
  | { ok: false; message: string };

/**
 * Rebuild a league's schedule from the provider: create fixtures it does not
 * have, update the ones it does, and refresh the standings table beside them.
 * Without a league it covers every enabled one, which is the same work the
 * nightly job does and the way to sweep a stuck row out of all of them at once.
 *
 * It reports what it did, including how many fixtures arrived into a week that
 * had already locked or taken picks. Those are written rather than dropped -
 * losing a played match is worse than a late arrival - but an operator should
 * still see it happen.
 */
export async function refreshLeagueFixtures(leagueSlug?: string | null): Promise<LeagueRefreshResult> {
  const viewer = await requireAdmin();
  // This one calls a provider, so the limit is as much about their rate as ours.
  if (!await withinUserRateLimit("refreshLeagueFixtures", viewer.id)) {
    return { ok: false, message: "That is a lot of refreshes in a minute. Wait a moment and try again." };
  }
  const parsed = z.string().min(1).max(120).regex(/^[a-z0-9-]+$/).nullish().safeParse(leagueSlug ?? null);
  if (!parsed.success) return { ok: false, message: "That league is not valid." };

  let result: Awaited<ReturnType<typeof synchronizeFixtures>>;
  try {
    result = await synchronizeFixtures(new EspnFixtureProvider(), new Date(), parsed.data ?? undefined);
  } catch (error) {
    console.error("Failed to refresh league fixtures.", error);
    return { ok: false, message: "The league could not be refreshed. Please try again." };
  }

  console.info("Admin refreshed league fixtures.", { admin: viewer.id, league: parsed.data ?? "all", ...result });

  // The table is fetched from ESPN and cached against its own tag, so the page
  // revalidation below does not reach it. Without this a refresh updates the
  // fixtures immediately and leaves the standings as they were. updateTag
  // rather than revalidateTag: this is a server action, and the admin who
  // pressed refresh should see the new table, not the next visitor.
  const competitions = parsed.data
    ? ESPN_FIXTURE_COMPETITIONS.filter((entry) => entry.leagueSlug === parsed.data)
    : ESPN_FIXTURE_COMPETITIONS;
  for (const competition of competitions) updateTag(espnStandingsTag(competition.externalId));
  // The header's league list is the enabled leagues that have a current season
  // with clubs in it, which a refresh can bring into existence.
  updateTag(LEAGUE_NAV_TAG);

  for (const competition of competitions) {
    revalidatePath(`/leagues/${competition.leagueSlug}`, "page");
    revalidatePath(`/leagues/${competition.leagueSlug}/standings`, "page");
  }
  revalidatePath("/", "layout");

  return {
    ok: true,
    requests: result.requestCount,
    created: result.created,
    updated: result.updated,
    leagues: result.leagues,
    lateAdded: result.lateAdded,
    adopted: result.adopted,
    faults: result.faults,
  };
}

export type DedupeScanResult =
  | { ok: true; report: DedupeReport }
  | { ok: false; message: string };

/**
 * What the catalogue thinks is duplicated, on demand. Every query behind it
 * walks the whole team table, so it runs when an operator asks rather than on
 * every admin page load.
 */
export async function scanDuplicateClubs(): Promise<DedupeScanResult> {
  const viewer = await requireAdmin();
  if (!await withinUserRateLimit("teamDedupe", viewer.id)) {
    return { ok: false, message: "That is a lot of scans in a minute. Wait a moment and try again." };
  }

  try {
    return { ok: true, report: await buildDedupeReport() };
  } catch (error) {
    console.error("Failed to scan for duplicate clubs.", error);
    return { ok: false, message: "The catalogue could not be scanned. Please try again." };
  }
}

export type MergeClubsResult =
  | { ok: true; canonical: string; merged: number }
  | { ok: false; message: string };

/**
 * Merges one group the scan proposed. Destructive and irreversible: the
 * duplicate rows are deleted, and every fixture, pick and alias that pointed at
 * them is moved onto the survivor. So the plan is rebuilt from current rows
 * rather than trusted from the browser, and a group the evidence no longer
 * supports is refused rather than applied on the strength of a stale page.
 */
export async function mergeDuplicateClubs(canonicalId: string): Promise<MergeClubsResult> {
  const viewer = await requireAdmin();
  if (!await withinUserRateLimit("teamDedupe", viewer.id)) {
    return { ok: false, message: "That is a lot of merges in a minute. Wait a moment and try again." };
  }

  const parsed = z.string().uuid().safeParse(canonicalId);
  if (!parsed.success) return { ok: false, message: "That club is not valid." };

  try {
    const merge = await findPlannedMerge(parsed.data);
    if (!merge) return { ok: false, message: "That merge is no longer proposed. Scan again." };

    await applyTeamMerge(merge);
    console.info("Admin merged duplicate clubs.", {
      admin: viewer.id,
      canonical: merge.canonical.slug,
      duplicates: merge.duplicates.map((team) => team.slug),
    });

    revalidatePath("/", "layout");
    return { ok: true, canonical: merge.canonical.name, merged: merge.duplicates.length };
  } catch (error) {
    console.error("Failed to merge duplicate clubs.", error);
    return { ok: false, message: "The clubs could not be merged. Please try again." };
  }
}

/**
 * Merges two clubs on an operator's say-so, for the pairs the evidence cannot
 * decide. Nothing here checks whether they are the same club, because nothing
 * can: that is the whole reason these pairs are shown to a person.
 */
export async function mergeClubsByHand(canonicalId: string, duplicateId: string): Promise<MergeClubsResult> {
  const viewer = await requireAdmin();
  if (!await withinUserRateLimit("teamDedupe", viewer.id)) {
    return { ok: false, message: "That is a lot of merges in a minute. Wait a moment and try again." };
  }

  const parsed = z.object({ canonicalId: z.string().uuid(), duplicateId: z.string().uuid() })
    .safeParse({ canonicalId, duplicateId });
  if (!parsed.success) return { ok: false, message: "Those clubs are not valid." };

  try {
    const merged = await mergeNamedTeams(parsed.data.canonicalId, parsed.data.duplicateId);
    console.info("Admin merged two clubs by hand.", {
      admin: viewer.id,
      kept: merged.canonical.slug,
      merged: merged.duplicate.slug,
    });

    revalidatePath("/", "layout");
    return { ok: true, canonical: merged.canonical.name, merged: 1 };
  } catch (error) {
    console.error("Failed to merge two clubs by hand.", error);
    // This one's failures are the operator's to read - a fixture listing both
    // clubs, a row already merged away - rather than an internal detail.
    return { ok: false, message: error instanceof Error ? error.message : "The clubs could not be merged." };
  }
}

export type ResultPullResult =
  | { ok: true; pending: number; leagues: number; requests: number; updated: number; finished: number; settled: number; adopted: number; missing: number; faults: string[] }
  | { ok: false; message: string };

/**
 * The hourly results job, run by hand. Same pair as the cron - pull the scores
 * for fixtures already waiting on one, then settle the picks they decide - so
 * an admin never has to wait for the next hour to see a finished match land.
 *
 * Left without a league, it covers every league that played; named one, it asks
 * about that league alone. Either way it asks only about matches already on the
 * schedule, so it cannot be used to build one.
 */
export async function pullMatchResults(leagueSlug?: string | null): Promise<ResultPullResult> {
  const viewer = await requireAdmin();
  if (!await withinUserRateLimit("pullMatchResults", viewer.id)) {
    return { ok: false, message: "That is a lot of pulls in a minute. Wait a moment and try again." };
  }

  const parsed = z.string().min(1).max(120).regex(/^[a-z0-9-]+$/).nullish().safeParse(leagueSlug ?? null);
  if (!parsed.success) return { ok: false, message: "That league is not valid." };

  try {
    // Probing costs one extra request and only when a single league is named,
    // which is exactly when an operator is asking why a match is not showing.
    const results = await synchronizeMatchResults(
      new EspnFixtureProvider(),
      new Date(),
      parsed.data ?? undefined,
      Boolean(parsed.data),
    );
    const settlement = await settlePendingPicks();

    if (parsed.data) {
      revalidatePath(`/leagues/${parsed.data}`, "page");
    }
    revalidatePath("/live-locks", "page");
    revalidatePath("/", "layout");

    // Also written to the runtime log, so a pull that changed nothing can still
    // be traced afterwards from the Vercel logs rather than only from the panel.
    console.info("Admin pulled match results.", {
      admin: viewer.id,
      league: parsed.data ?? "all",
      ...results,
      settled: settlement.settled,
    });

    return {
      ok: true,
      pending: results.pending,
      leagues: results.leagues,
      requests: results.requestCount,
      updated: results.updated,
      finished: results.finished,
      settled: settlement.settled,
      adopted: results.adopted,
      missing: results.missing,
      faults: results.faults,
    };
  } catch (error) {
    console.error("Failed to pull match results.", error);
    return { ok: false, message: "The results could not be pulled. Please try again." };
  }
}

export async function toggleFeatureFlag(
  key: string,
  enabled: boolean,
): Promise<AdminActionResult> {
  const viewer = await requireAdmin();

  const parsed = z.object({ key: z.string().min(1).max(120), enabled: z.boolean() })
    .safeParse({ key, enabled });
  if (!parsed.success) return { ok: false, message: "That feature flag is invalid." };

  const definition = featureFlagDefinitions.find((item) => item.key === parsed.data.key);
  if (!definition) return { ok: false, message: "That feature flag is not defined in the application." };

  try {
    await setFeatureFlag(
      definition.key,
      parsed.data.enabled,
      definition.label,
      definition.description,
      viewer.id,
    );
  } catch (error) {
    console.error("Failed to toggle a feature flag.", error);
    return { ok: false, message: "The flag could not be saved. Please try again." };
  }

  // A flag decides whether a route exists at all, so a stale one is a 404 on a
  // link the navigation is still drawing.
  updateTag(FEATURE_FLAGS_TAG);
  revalidatePath("/", "layout");
  return { ok: true };
}

/**
 * Creating a member, and recording locks for them against matches already
 * played. Both write records the rest of the product treats as genuine, so both
 * are admin-only and both leave an audit row naming the admin who did it.
 */
export async function createMemberAction(name: string): Promise<AdminActionResult> {
  const viewer = await requireAdmin();

  try {
    await createMember({ name, actorUserId: viewer.id });
  } catch (error) {
    console.error("Failed to create a member.", error);
    return { ok: false, message: error instanceof Error ? error.message : "That member could not be created." };
  }

  revalidatePath("/admin");
  return { ok: true };
}

export async function assignLockAction(input: {
  userId: string;
  fixtureId: string;
  selectedTeamId: string;
}): Promise<AdminActionResult> {
  const viewer = await requireAdmin();

  try {
    await assignMemberLock({ ...input, actorUserId: viewer.id });
  } catch (error) {
    console.error("Failed to assign a lock.", error);
    // A second lock on a date the member already holds one for trips the unique
    // index, which is the one failure an admin is likely to cause by hand.
    const duplicate = error instanceof Error && error.message.includes("picks_user_league_date_unique");
    return {
      ok: false,
      message: duplicate
        ? "That member already holds a lock in this league on that date."
        : error instanceof Error ? error.message : "That lock could not be recorded.",
    };
  }

  revalidatePath("/admin");
  revalidatePath("/specialists", "layout");
  return { ok: true };
}

export async function loadAssignableFixtures(
  userId: string,
  leagueSlug: string,
): Promise<AssignableFixture[]> {
  await requireAdmin();
  return listAssignableFixtures({ userId, leagueSlug });
}

export async function loadAssignedLocks(userId: string): Promise<AssignedLock[]> {
  await requireAdmin();
  return listAssignedLocks(userId);
}
