import { sqlClient } from "@/db";
import { synchronizeMatchResults } from "@/services/result-sync";
import { settlePendingPicks } from "@/services/settlement";

async function main() {
  try {
    const results = await synchronizeMatchResults();
    console.info(`Result sync completed: ${results.updated} fixture(s) updated, ${results.finished} finished, ${results.requestCount} request(s) across ${results.leagues} league(s).`);
    if (results.faults.length) console.warn("Faults:", results.faults.join(" | "));
    const settlement = await settlePendingPicks();
    console.info(`Settlement completed: ${settlement.settled}/${settlement.candidates} candidate(s) settled.`);
  } finally {
    await sqlClient.end();
  }
}

void main().catch((error: unknown) => { console.error(error); process.exitCode = 1; });
