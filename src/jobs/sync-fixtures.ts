import { sqlClient } from "@/db";
import { synchronizeFreeFixtureSources } from "@/services/free-fixture-sync";

async function main() {
  try {
    const result = await synchronizeFreeFixtureSources();
    console.info("Free fixture synchronization completed.", result.providers);
  } finally {
    await sqlClient.end();
  }
}

void main().catch((error: unknown) => { console.error(error); process.exitCode = 1; });
