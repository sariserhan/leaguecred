import { describe, expect, it } from "vitest";

import { sqlClient } from "@/db";
import { getAdminAuditLog } from "@/services/admin-audit-log";
import { setFeatureFlag, updateSiteSettings } from "@/services/site-settings";

async function createUser(id: string) {
  await sqlClient`insert into "user" (id, name, email, email_verified) values (${id}, ${id}, ${`${id}@test.local`}, true)`;
}

async function latestEntryFor(target: string) {
  const [entry] = await getAdminAuditLog(200).then((entries) =>
    entries.filter((row) => row.target === target),
  );
  return entry;
}

describe("admin audit log", () => {
  it("records a site settings change with the prior values as before", async () => {
    const adminId = `test-admin-${crypto.randomUUID()}`;
    await createUser(adminId);

    await updateSiteSettings(
      { minimumSettledPicksForRank: 10, maintenanceEnabled: false, maintenanceMessage: null, bannerEnabled: false, bannerMessage: null, bannerTone: "info" },
      adminId,
    );
    await updateSiteSettings(
      { minimumSettledPicksForRank: 10, maintenanceEnabled: true, maintenanceMessage: "Back soon", bannerEnabled: false, bannerMessage: null, bannerTone: "info" },
      adminId,
    );

    const entry = await latestEntryFor("global");
    expect(entry).toBeDefined();
    expect(entry!.action).toBe("site_settings_updated");
    expect(entry!.actorName).toBe(adminId);
    expect((entry!.after as { maintenanceEnabled: boolean }).maintenanceEnabled).toBe(true);
    expect((entry!.before as { maintenanceEnabled: boolean }).maintenanceEnabled).toBe(false);
  });

  it("records a feature flag toggle with the prior enabled state as before", async () => {
    const adminId = `test-admin-${crypto.randomUUID()}`;
    const flagKey = `test-flag-${crypto.randomUUID()}`;
    await createUser(adminId);

    await setFeatureFlag(flagKey, false, "Test flag", "A flag created only for this test.", adminId);
    await setFeatureFlag(flagKey, true, "Test flag", "A flag created only for this test.", adminId);

    const entry = await latestEntryFor(flagKey);
    expect(entry).toBeDefined();
    expect(entry!.action).toBe("feature_flag_toggled");
    expect(entry!.before).toEqual({ enabled: false });
    expect(entry!.after).toEqual({ enabled: true });
  });
});
