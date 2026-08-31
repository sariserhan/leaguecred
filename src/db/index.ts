import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "@/db/schema";
import { serverEnv } from "@/lib/env";

const globalDatabase = globalThis as typeof globalThis & {
  leagueCredSql?: ReturnType<typeof postgres>;
};

const isBuildPhase = process.env.NEXT_PHASE === "phase-production-build";
const maxConnections = isBuildPhase
  ? 1
  : process.env.DB_MAX_CONNECTIONS
    ? Number(process.env.DB_MAX_CONNECTIONS)
    : process.env.NODE_ENV === "production"
      ? 5
      : 3;

const client =
  globalDatabase.leagueCredSql ??
  postgres(serverEnv.databaseUrl, {
    max: maxConnections,
    idle_timeout: 20,
    connect_timeout: 10,
    prepare: false,
  });

if (process.env.NODE_ENV !== "production") {
  globalDatabase.leagueCredSql = client;
}

export const sqlClient = client;
export const db = drizzle(client, { schema });
