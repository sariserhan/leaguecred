import type postgres from "postgres";

import { sqlClient } from "@/db";
import type { AdminAuditAction } from "@/db/schema";
import { toIsoTimestamp } from "@/lib/timestamps";

export type AdminAuditEntry = {
  id: string;
  actorName: string;
  action: AdminAuditAction;
  target: string;
  before: unknown;
  after: unknown;
  createdAt: string;
};

/**
 * Runs inside the same transaction as the change it records, so a change and
 * its audit row are never split by a crash between the two statements.
 *
 * Serializes with JSON.stringify + an explicit ::jsonb cast rather than
 * sql.json(): drizzle(client, { schema }) in src/db/index.ts mutates the
 * shared postgres client in a way that makes sql.json() corrupt the wire
 * protocol on this connection. A bare string parameter sidesteps it.
 */
export async function recordAdminAudit(
  sql: postgres.TransactionSql,
  input: { actorUserId: string; action: AdminAuditAction; target: string; before: unknown; after: unknown },
) {
  const before = input.before === null || input.before === undefined ? null : JSON.stringify(input.before);
  const after = input.after === null || input.after === undefined ? null : JSON.stringify(input.after);

  await sql`
    insert into admin_audit_log (actor_user_id, action, target, before, after)
    values (${input.actorUserId}, ${input.action}, ${input.target}, ${before}::jsonb, ${after}::jsonb)`;
}

export async function getAdminAuditLog(limit = 20): Promise<AdminAuditEntry[]> {
  const rows = await sqlClient<Array<{
    id: string;
    actor_name: string;
    action: AdminAuditAction;
    target: string;
    before: unknown;
    after: unknown;
    created_at: Date | string;
  }>>`
    select log.id, account.name as actor_name, log.action, log.target, log.before, log.after, log.created_at
    from admin_audit_log log
    join "user" account on account.id = log.actor_user_id
    order by log.created_at desc
    limit ${limit}`;

  return rows.map((row) => ({
    id: row.id,
    actorName: row.actor_name,
    action: row.action,
    target: row.target,
    before: row.before,
    after: row.after,
    createdAt: toIsoTimestamp(row.created_at),
  }));
}
