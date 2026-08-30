import { sqlClient } from "@/db";
import { seedExpandedLeagueCatalog } from "@/db/expanded-catalog";
import { seedTeamCatalog } from "@/db/seed-team-catalog";

async function main() {
  try {
    await sqlClient.begin(async (sql) => {
      await seedExpandedLeagueCatalog(sql);
      await seedTeamCatalog(sql);
    });
    console.info("Priority competition and team catalog is ready.");
  } finally {
    await sqlClient.end();
  }
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
