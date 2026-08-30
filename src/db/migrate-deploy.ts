import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

import { describeDatabaseTarget } from "@/lib/env";
import { assertMigrationsReachable } from "@/db/migration-preflight-check";

/**
 * Runs committed migrations as part of a deploy, so shipping schema and
 * shipping the code that needs it stop being two separate acts someone has to
 * remember to pair.
 *
 * Two guards, both deliberate:
 *
 * - Only a production build migrates. DATABASE_URL is scoped to Preview as well
 *   as Production and both point at the same database, so without this a
 *   preview of an unmerged branch would apply its schema to production before
 *   the production deploy ever ran.
 * - Nothing happens without a configured database, so a local `next build` and
 *   any environment without one succeed instead of failing on a connection.
 *
 * A migration that fails takes the deploy down with it, which is the point:
 * code that needs a column should never go live without the column.
 */
function migrationUrl() {
  // A pooler is the wrong place for DDL, so prefer the direct connection.
  const direct = process.env.DATABASE_URL_UNPOOLED?.trim();
  const pooled = process.env.DATABASE_URL?.trim();
  return direct || pooled || undefined;
}

async function main() {
  const vercelEnv = process.env.VERCEL_ENV;
  if (vercelEnv && vercelEnv !== "production") {
    console.info(`Skipping migrations: VERCEL_ENV is "${vercelEnv}", not production.`);
    return;
  }

  const url = migrationUrl();
  if (!url) {
    console.info("Skipping migrations: no DATABASE_URL is configured for this build.");
    return;
  }

  console.info(`Applying migrations to ${describeDatabaseTarget(url)} ...`);
  const client = postgres(url, { max: 1, prepare: false });
  try {
    // The migrator silently ignores a migration timed below what the database
    // has already applied, so check before trusting it to run them.
    await assertMigrationsReachable(client, "drizzle");
    await migrate(drizzle(client), { migrationsFolder: "drizzle" });
    console.info("Database migrations applied.");
  } finally {
    await client.end();
  }
}

void main().catch((error: unknown) => {
  console.error("Deploy migrations failed; the build will not continue.", error);
  process.exitCode = 1;
});
