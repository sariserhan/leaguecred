"use server";

import { revalidatePath, updateTag } from "next/cache";
import { z } from "zod";

import { requireAdmin } from "@/lib/admin";
import {
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
  assignHistoricalLock,
  createMember,
  listAssignableFixtures,
  listAssignedLocks,
} from "@/services/member-seeding";
import { setFeatureFlag, updateSiteSettings } from "@/services/site-settings";
import { synchronizeFixtures } from "@/services/fixture-sync";
import { synchronizeMatchResults } from "@/services/result-sync";
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

  revalidatePath("/", "layout");
  return { ok: true };
}

export type LeagueRefreshResult =
  | { ok: true; requests: number; created: number; updated: number; lateAdded: number }
  | { ok: false; message: string };

/**
 * Rebuild one league's schedule from the provider: create fixtures it does not
 * have, update the ones it does, and refresh the standings table beside them.
 *
 * It reports what it did, including how many fixtures arrived into a week that
 * had already locked or taken picks. Those are written rather than dropped -
 * losing a played match is worse than a late arrival - but an operator should
 * still see it happen.
 */
export async function refreshLeagueFixtures(leagueSlug: string): Promise<LeagueRefreshResult> {
  const viewer = await requireAdmin();
  // This one calls a provider, so the limit is as much about their rate as ours.
  if (!await withinUserRateLimit("refreshLeagueFixtures", viewer.id)) {
    return { ok: false, message: "That is a lot of refreshes in a minute. Wait a moment and try again." };
  }
  const parsed = z.string().min(1).max(120).regex(/^[a-z0-9-]+$/).safeParse(leagueSlug);
  if (!parsed.success) return { ok: false, message: "That league is not valid." };

  let result: Awaited<ReturnType<typeof synchronizeFixtures>>;
  try {
    result = await synchronizeFixtures(new EspnFixtureProvider(), new Date(), parsed.data);
  } catch (error) {
    console.error("Failed to refresh league fixtures.", error);
    return { ok: false, message: "The league could not be refreshed. Please try again." };
  }

  console.info("Admin refreshed league fixtures.", { admin: viewer.id, league: parsed.data, ...result });

  // The table is fetched from ESPN and cached against its own tag, so the page
  // revalidation below does not reach it. Without this a refresh updates the
  // fixtures immediately and leaves the standings as they were. updateTag
  // rather than revalidateTag: this is a server action, and the admin who
  // pressed refresh should see the new table, not the next visitor.
  const competition = ESPN_FIXTURE_COMPETITIONS.find((entry) => entry.leagueSlug === parsed.data);
  if (competition) updateTag(espnStandingsTag(competition.externalId));

  revalidatePath(`/leagues/${parsed.data}`, "page");
  revalidatePath(`/leagues/${parsed.data}/standings`, "page");
  revalidatePath("/", "layout");

  return {
    ok: true,
    requests: result.requestCount,
    created: result.created,
    updated: result.updated,
    lateAdded: result.lateAdded,
  };
}

export type ResultPullResult =
  | { ok: true; pending: number; leagues: number; requests: number; updated: number; finished: number; settled: number; missing: number; faults: string[] }
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
    await assignHistoricalLock({ ...input, actorUserId: viewer.id });
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
