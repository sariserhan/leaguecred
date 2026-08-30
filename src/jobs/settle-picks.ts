import { sqlClient } from "@/db";
import { settlePendingPicks } from "@/services/settlement";

async function main() {
  try {
    const result = await settlePendingPicks();
    console.info(`Settlement completed: ${result.settled}/${result.candidates} candidate(s) settled.`);
  } finally {
    await sqlClient.end();
  }
}

void main().catch((error: unknown) => { console.error(error); process.exitCode = 1; });
