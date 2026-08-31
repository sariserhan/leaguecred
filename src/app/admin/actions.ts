"use server";

import { revalidatePath } from "next/cache";
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
import { setFeatureFlag, updateSiteSettings } from "@/services/site-settings";
import { synchronizeFixtures } from "@/services/fixture-sync";
import { EspnFixtureProvider } from "@/providers/espn-fixtures";

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

export async function refreshLeagueFixtures(leagueSlug: string): Promise<void> {
  await requireAdmin();
  const parsed = z.string().min(1).max(120).regex(/^[a-z0-9-]+/).safeParse(leagueSlug);
  if (!parsed.success) return;
  try {
    await synchronizeFixtures(new EspnFixtureProvider(), new Date(), parsed.data);
  } catch (error) {
    console.error("Failed to refresh league fixtures.", error);
    return;
  }
  revalidatePath(`/leagues/${parsed.data}`, "page");
  revalidatePath(`/leagues/${parsed.data}/standings`, "page");
  revalidatePath("/", "layout");
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
