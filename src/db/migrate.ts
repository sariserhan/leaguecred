import { migrate } from "drizzle-orm/postgres-js/migrator";

import { db, sqlClient } from "@/db";

async function main() {
  try {
    await migrate(db, { migrationsFolder: "drizzle" });
    console.info("Database migrations applied.");
  } finally {
    await sqlClient.end();
  }
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
