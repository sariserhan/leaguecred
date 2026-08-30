import { afterEach, describe, expect, it, vi } from "vitest";

async function loadEnv() {
  vi.resetModules();
  return import("@/lib/env");
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("databaseUrl", () => {
  // The failure this guards: DATABASE_URL="$UNSET_VAR" expands to "", which
  // Postgres.js turns into localhost as the OS user, so a command aimed at
  // production silently hits a different database.
  it("treats a blank value as unset rather than as an empty url", async () => {
    vi.stubEnv("DATABASE_URL", "");
    expect((await loadEnv()).serverEnv.databaseUrl).toContain("localhost:54329");

    vi.stubEnv("DATABASE_URL", "   ");
    expect((await loadEnv()).serverEnv.databaseUrl).toContain("localhost:54329");
  });

  it("uses a real value and trims stray whitespace", async () => {
    vi.stubEnv("DATABASE_URL", "  postgresql://u:p@db.example.com/app  ");
    expect((await loadEnv()).serverEnv.databaseUrl).toBe("postgresql://u:p@db.example.com/app");
  });
});

describe("describeDatabaseTarget", () => {
  it("names the host and database without exposing credentials", async () => {
    const { describeDatabaseTarget } = await loadEnv();
    const described = describeDatabaseTarget("postgresql://owner:hunter2@db.neon.tech/neondb");

    expect(described).toBe("db.neon.tech/neondb");
    expect(described).not.toContain("hunter2");
    expect(described).not.toContain("owner");
  });

  it("does not throw on an unparseable url", async () => {
    const { describeDatabaseTarget } = await loadEnv();
    expect(describeDatabaseTarget("not a url")).toBe("an unparseable DATABASE_URL");
  });
});

describe("optional secrets", () => {
  it("reads a blank secret as absent", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    vi.stubEnv("CRON_SECRET", "  ");
    const { serverEnv } = await loadEnv();
    expect(serverEnv.resendApiKey).toBeUndefined();
    expect(serverEnv.cronSecret).toBeUndefined();
  });
});
