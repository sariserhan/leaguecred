import { sqlClient } from "@/db";
import { sendSpecialistLockNotifications } from "@/services/specialist-lock-notifications";

async function main() {
  try {
    const result = await sendSpecialistLockNotifications();
    console.info(`Specialist lock notifications sent: ${result.sent}/${result.candidates}.`);
  } finally {
    await sqlClient.end();
  }
}

void main().catch((error: unknown) => { console.error(error); process.exitCode = 1; });
