import { sqlClient } from "@/db";
import { sendLockReminders } from "@/services/lock-reminders";

async function main() {
  try {
    const result = await sendLockReminders();
    console.info(`Lock reminders sent: ${result.sent}/${result.candidates}.`);
  } finally {
    await sqlClient.end();
  }
}

void main().catch((error: unknown) => { console.error(error); process.exitCode = 1; });
