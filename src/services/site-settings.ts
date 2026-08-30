import { cache } from "react";

import { sqlClient } from "@/db";
import type { BannerTone } from "@/db/schema";
import {
  defaultSiteSettings,
  resolveFeatureFlags,
  type ResolvedFeatureFlag,
  type SiteSettings,
} from "@/lib/site-settings";

type SettingsRow = {
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
      select maintenance_enabled, maintenance_message, banner_enabled, banner_message, banner_tone
      from app_settings where id = 'global'`;
    if (!row) return defaultSiteSettings;

    return {
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

export async function updateSiteSettings(
  input: {
    maintenanceEnabled: boolean;
    maintenanceMessage: string | null;
    bannerEnabled: boolean;
    bannerMessage: string | null;
    bannerTone: BannerTone;
  },
  updatedByUserId: string,
) {
  await sqlClient`
    insert into app_settings (
      id, maintenance_enabled, maintenance_message, banner_enabled, banner_message, banner_tone, updated_by_user_id
    ) values (
      'global', ${input.maintenanceEnabled}, ${input.maintenanceMessage}, ${input.bannerEnabled},
      ${input.bannerMessage}, ${input.bannerTone}, ${updatedByUserId}
    )
    on conflict (id) do update set
      maintenance_enabled = excluded.maintenance_enabled,
      maintenance_message = excluded.maintenance_message,
      banner_enabled = excluded.banner_enabled,
      banner_message = excluded.banner_message,
      banner_tone = excluded.banner_tone,
      updated_by_user_id = excluded.updated_by_user_id,
      updated_at = now()`;
}

export async function setFeatureFlag(
  key: string,
  enabled: boolean,
  label: string,
  description: string,
  updatedByUserId: string,
) {
  await sqlClient`
    insert into feature_flags (key, label, description, enabled, updated_by_user_id)
    values (${key}, ${label}, ${description}, ${enabled}, ${updatedByUserId})
    on conflict (key) do update set
      enabled = excluded.enabled,
      label = excluded.label,
      description = excluded.description,
      updated_by_user_id = excluded.updated_by_user_id,
      updated_at = now()`;
}
