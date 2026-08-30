const LOCAL_DATABASE_URL =
  "postgresql://leaguecred:leaguecred@localhost:54329/leaguecred";

export const serverEnv = {
  databaseUrl: process.env.DATABASE_URL ?? LOCAL_DATABASE_URL,
  betterAuthUrl: process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
  apiFootballKey: process.env.API_FOOTBALL_KEY,
  apiFootballBaseUrl:
    process.env.API_FOOTBALL_BASE_URL ?? "https://v3.football.api-sports.io",
  cronSecret: process.env.CRON_SECRET,
};

export function requireBetterAuthSecret() {
  const secret = process.env.BETTER_AUTH_SECRET;

  if (secret) return secret;

  if (process.env.NEXT_PHASE === "phase-production-build") {
    return "leaguecred-build-only-secret-never-used-at-runtime";
  }

  throw new Error("BETTER_AUTH_SECRET is required at runtime.");
}

export function requireApiFootballKey() {
  if (!serverEnv.apiFootballKey) {
    throw new Error("API_FOOTBALL_KEY is required to synchronize fixtures.");
  }

  return serverEnv.apiFootballKey;
}
