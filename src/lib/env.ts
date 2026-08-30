const LOCAL_DATABASE_URL =
  "postgresql://leaguecred:leaguecred@localhost:54329/leaguecred";

/**
 * A blank variable means unset, not an empty value.
 *
 * `DATABASE_URL="$UNSET_VAR"` expands to an empty string, which `??` happily
 * accepts. Postgres.js then falls back to its own defaults and connects to
 * localhost as the operating-system user, so a command aimed at production
 * quietly points somewhere else instead of failing.
 */
function optionalEnv(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export const serverEnv = {
  databaseUrl: optionalEnv(process.env.DATABASE_URL) ?? LOCAL_DATABASE_URL,
  betterAuthUrl: optionalEnv(process.env.BETTER_AUTH_URL) ?? "http://localhost:3000",
  apiFootballKey: optionalEnv(process.env.API_FOOTBALL_KEY),
  apiFootballBaseUrl:
    optionalEnv(process.env.API_FOOTBALL_BASE_URL) ?? "https://v3.football.api-sports.io",
  footballDataApiKey: optionalEnv(process.env.FOOTBALL_DATA_API_KEY),
  footballDataBaseUrl:
    optionalEnv(process.env.FOOTBALL_DATA_BASE_URL) ?? "https://api.football-data.org/v4",
  cronSecret: optionalEnv(process.env.CRON_SECRET),
  resendApiKey: optionalEnv(process.env.RESEND_API_KEY),
  // Optional override for every sender, used while a domain is still unverified.
  resendFromEmail: optionalEnv(process.env.RESEND_FROM_EMAIL),
};

/** Host and database only; never the credentials. */
export function describeDatabaseTarget(url = serverEnv.databaseUrl) {
  try {
    const parsed = new URL(url);
    return `${parsed.hostname}${parsed.port ? `:${parsed.port}` : ""}${parsed.pathname}`;
  } catch {
    return "an unparseable DATABASE_URL";
  }
}

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

export function requireFootballDataApiKey() {
  if (!serverEnv.footballDataApiKey) {
    throw new Error("FOOTBALL_DATA_API_KEY is required to synchronize Champions League fixtures.");
  }

  return serverEnv.footballDataApiKey;
}

