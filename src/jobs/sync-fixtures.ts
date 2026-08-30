import { sqlClient } from "@/db";
import { ApiFootballProvider } from "@/providers/api-football";
import { synchronizeFixtures } from "@/services/fixture-sync";

async function main() {
  try {
    const result = await synchronizeFixtures(new ApiFootballProvider());
    console.info(`Fixture synchronization completed with ${result.requestCount} provider request(s).`);
  } finally {
    await sqlClient.end();
  }
}

void main().catch((error: unknown) => { console.error(error); process.exitCode = 1; });
