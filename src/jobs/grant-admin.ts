import { sqlClient } from "@/db";
import type { UserRole } from "@/db/schema";
import { describeDatabaseTarget } from "@/lib/env";

/**
 * Bootstraps the first administrator, and revokes one when needed. There is
 * deliberately no in-product way to promote an account: the first admin has to
 * come from someone with database or deployment access.
 */
async function main() {
  const email = process.argv[2];
  const revoke = process.argv.includes("--revoke");

  if (!email) {
    console.error("Usage: pnpm admin:grant <email> [--revoke]");
    process.exitCode = 1;
    return;
  }

  const role: UserRole = revoke ? "member" : "admin";

  // Granting admin against the wrong database is a silent, confusing failure,
  // so say which one is about to be changed.
  console.info(`Target database: ${describeDatabaseTarget()}`);

  try {
    const rows = await sqlClient<Array<{ id: string; email: string; role: UserRole }>>`
      update "user" set role = ${role}, updated_at = now()
      where lower(email) = lower(${email})
      returning id, email, role`;

    const updated = rows[0];
    if (!updated) {
      console.error(`No account exists for ${email}. Create the account first, then run this again.`);
      process.exitCode = 1;
      return;
    }

    console.info(`${updated.email} now has the ${updated.role} role.`);
  } finally {
    await sqlClient.end();
  }
}

void main().catch((error: unknown) => { console.error(error); process.exitCode = 1; });
