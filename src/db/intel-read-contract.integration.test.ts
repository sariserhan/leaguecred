import { describe, expect, it } from "vitest";

import { sqlClient } from "@/db";

/**
 * Runs each query as the Sports Intel reader inside a read-only transaction
 * that is always rolled back, the way that role's own sessions are.
 */
async function asReader<T>(query: (sql: typeof sqlClient) => Promise<T>) {
  let result: T | undefined;
  let failure: unknown;
  await sqlClient
    .begin(async (sql) => {
      await sql`set local role sports_intel_reader`;
      await sql`set transaction read only`;
      try {
        result = await query(sql as unknown as typeof sqlClient);
      } catch (error) {
        failure = error;
      }
      throw new Error("rollback");
    })
    .catch(() => undefined);
  if (failure) throw failure;
  return result as T;
}

describe("the Sports Intel read contract", () => {
  it("lets the reader see fixtures and identities through the contract", async () => {
    const [meta] = await asReader((sql) => sql<Array<{ contract_version: string }>>`select contract_version from intel_contract_v1.meta`);
    expect(meta?.contract_version).toBe("1.1.0");
    await expect(asReader((sql) => sql`select id, home_score, away_score, upstream_provider from intel_contract_v1.fixtures limit 1`)).resolves.toBeDefined();
    await expect(asReader((sql) => sql`select id, name, logo_url from intel_contract_v1.teams limit 1`)).resolves.toBeDefined();
    await expect(asReader((sql) => sql`select slug, logo_url from intel_contract_v1.leagues limit 1`)).resolves.toBeDefined();
  });

  it.each(["user", "session", "account", "picks", "fixtures"])("keeps the reader out of public.%s", async (table) => {
    await expect(asReader((sql) => sql.unsafe(`select 1 from public."${table}" limit 1`))).rejects.toThrow(/permission denied/);
  });

  it("holds no privilege on any public table, and cannot write through a view", async () => {
    const [row] = await sqlClient<Array<{ granted: number }>>`
      select count(*)::int as granted from pg_tables
      where schemaname = 'public'
        and has_table_privilege('sports_intel_reader', format('%I.%I', schemaname, tablename), 'select,insert,update,delete,truncate')`;
    expect(row?.granted).toBe(0);
    await expect(asReader((sql) => sql`update intel_contract_v1.teams set name = name`)).rejects.toThrow();
  });
});
