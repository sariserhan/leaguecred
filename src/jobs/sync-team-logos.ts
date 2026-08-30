import { sqlClient } from "@/db";
import { synchronizeMissingTeamLogos } from "@/services/team-logo-sync";

async function main() {
  try {
    const maxRequests = Number(process.argv[2] ?? "90");
    const result = await synchronizeMissingTeamLogos({ maxRequests });
    console.info(JSON.stringify(result, null, 2));
  } finally {
    await sqlClient.end();
  }
}

void main().catch((error: unknown) => { console.error(error); process.exitCode = 1; });
