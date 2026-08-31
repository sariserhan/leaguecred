import { cache } from "react";

import { sqlClient } from "@/db";
import type { BannerTone } from "@/db/schema";
import {
  defaultSiteSettings,
  resolveFeatureFlags,
  type ResolvedFeatureFlag,
  type SiteSettings,
} from "@/lib/site-settings";
import { recordAdminAudit } from "@/services/admin-audit-log";

type SettingsRow = {
  minimum_settled_picks_for_rank: number;
  maintenance_enabled: boolean;
  maintenance_message: string | null;
  banner_enabled: boolean;
  banner_message: string | null;
  banner_tone: BannerTone;
};

/**
 * The root layout reads this on every request, so a database problem must not
 * take the whole site down. Falling back to the defaults fails open: no
 * maintenance wall and no banner, which is the safer direction to fail in.
 */
export const getSiteSettings = cache(async (): Promise<SiteSettings> => {
  try {
    const [row] = await sqlClient<SettingsRow[]>`
      select minimum_settled_picks_for_rank, maintenance_enabled, maintenance_message,
        banner_enabled, banner_message, banner_tone
      from app_settings where id = 'global'`;
    if (!row) return defaultSiteSettings;

    return {
      minimumSettledPicksForRank: row.minimum_settled_picks_for_rank,
      maintenanceEnabled: row.maintenance_enabled,
      maintenanceMessage: row.maintenance_message,
      bannerEnabled: row.banner_enabled,
      bannerMessage: row.banner_message,
      bannerTone: row.banner_tone,
    };
  } catch (error) {
    console.error("Failed to read site settings; falling back to defaults.", error);
    return defaultSiteSettings;
  }
});

export const getFeatureFlags = cache(async (): Promise<ResolvedFeatureFlag[]> => {
  try {
    const rows = await sqlClient<Array<{ key: string; enabled: boolean }>>`
      select key, enabled from feature_flags`;
    return resolveFeatureFlags(rows);
  } catch (error) {
    console.error("Failed to read feature flags; falling back to defaults.", error);
    return resolveFeatureFlags([]);
  }
});

/**
 * Settled independent Daily Locks a record needs before it is ranked and can
 * be followed. Read from the settings rather than fixed, because a founding
 * season has nobody who can reach the standard bar for ten gameweeks.
 *
 * Cached per request like the settings it reads, so the dozen queries that gate
 * on it do not each make their own round trip.
 */
export const getRankThreshold = cache(async (): Promise<number> => {
  const settings = await getSiteSettings();
  return settings.minimumSettledPicksForRank;
});

export async function updateSiteSettings(
  input: {
    minimumSettledPicksForRank: number;
    maintenanceEnabled: boolean;
    maintenanceMessage: string | null;
    bannerEnabled: boolean;
    bannerMessage: string | null;
    bannerTone: BannerTone;
  },
  updatedByUserId: string,
) {
  await sqlClient.begin(async (sql) => {
    const [before] = await sql<SettingsRow[]>`
      select minimum_settled_picks_for_rank, maintenance_enabled, maintenance_message,
        banner_enabled, banner_message, banner_tone
      from app_settings where id = 'global' for update`;

    await sql`
      insert into app_settings (
        id, minimum_settled_picks_for_rank, maintenance_enabled, maintenance_message,
        banner_enabled, banner_message, banner_tone, updated_by_user_id
      ) values (
        'global', ${input.minimumSettledPicksForRank}, ${input.maintenanceEnabled}, ${input.maintenanceMessage},
        ${input.bannerEnabled}, ${input.bannerMessage}, ${input.bannerTone}, ${updatedByUserId}
      )
      on conflict (id) do update set
        minimum_settled_picks_for_rank = excluded.minimum_settled_picks_for_rank,
        maintenance_enabled = excluded.maintenance_enabled,
        maintenance_message = excluded.maintenance_message,
        banner_enabled = excluded.banner_enabled,
        banner_message = excluded.banner_message,
        banner_tone = excluded.banner_tone,
        updated_by_user_id = excluded.updated_by_user_id,
        updated_at = now()`;

    await recordAdminAudit(sql, {
      actorUserId: updatedByUserId,
      action: "site_settings_updated",
      target: "global",
      before: before
        ? {
            maintenanceEnabled: before.maintenance_enabled,
            maintenanceMessage: before.maintenance_message,
            bannerEnabled: before.banner_enabled,
            bannerMessage: before.banner_message,
            bannerTone: before.banner_tone,
          }
        : null,
      after: input,
    });
  });
}

export async function setFeatureFlag(
  key: string,
  enabled: boolean,
  label: string,
  description: string,
  updatedByUserId: string,
) {
  await sqlClient.begin(async (sql) => {
    const [before] = await sql<Array<{ enabled: boolean }>>`
      select enabled from feature_flags where key = ${key} for update`;

    await sql`
      insert into feature_flags (key, label, description, enabled, updated_by_user_id)
      values (${key}, ${label}, ${description}, ${enabled}, ${updatedByUserId})
      on conflict (key) do update set
        enabled = excluded.enabled,
        label = excluded.label,
        description = excluded.description,
        updated_by_user_id = excluded.updated_by_user_id,
        updated_at = now()`;

    await recordAdminAudit(sql, {
      actorUserId: updatedByUserId,
      action: "feature_flag_toggled",
      target: key,
      before: before ? { enabled: before.enabled } : null,
      after: { enabled },
    });
  });
}
