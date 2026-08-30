import { sqlClient } from "@/db";
import { toIsoTimestamp } from "@/lib/timestamps";

// Not real client addresses: empty, IPv4/IPv6 loopback, the IPv6 unspecified
// address, and its fully-expanded form - the one Node reports for a local
// connection with no real remote address, which slipped past the shorter
// list and clustered every local dev/test account as "sharing an IP".
const NON_ADDRESS_VALUES = [
  "", "::1", "127.0.0.1", "::", "0.0.0.0",
  "0000:0000:0000:0000:0000:0000:0000:0000", "::ffff:127.0.0.1",
];

export type SharedIpCluster = {
  ipAddress: string;
  accounts: Array<{ id: string; name: string; email: string; createdAt: string }>;
};

export type SuspiciousFollow = {
  followerId: string;
  followerName: string;
  specialistId: string;
  specialistName: string;
  leagueName: string;
  sharedIpAddress: string;
};

/**
 * Session ip_address/user_agent are already captured by Better Auth for
 * every sign-in, so a cluster of accounts sharing one address is a signal
 * that already exists rather than new tracking. Loopback and empty values
 * are excluded since every local dev session would otherwise "cluster".
 */
export async function getSharedIpAccounts(minAccounts = 2): Promise<SharedIpCluster[]> {
  const rows = await sqlClient<Array<{
    ip_address: string; id: string; name: string; email: string; created_at: Date | string;
  }>>`
    with clustered as (
      select ip_address from session
      where ip_address is not null and ip_address <> all(${sqlClient.array(NON_ADDRESS_VALUES)})
      group by ip_address
      having count(distinct user_id) >= 2
    )
    select s.ip_address, u.id, u.name, u.email, u.created_at
    from session s
    join clustered c on c.ip_address = s.ip_address
    join "user" u on u.id = s.user_id
    group by s.ip_address, u.id, u.name, u.email, u.created_at
    order by s.ip_address, u.created_at`;

  const clusters = new Map<string, SharedIpCluster>();
  for (const row of rows) {
    const cluster = clusters.get(row.ip_address) ?? { ipAddress: row.ip_address, accounts: [] };
    cluster.accounts.push({ id: row.id, name: row.name, email: row.email, createdAt: toIsoTimestamp(row.created_at) });
    clusters.set(row.ip_address, cluster);
  }

  return [...clusters.values()].filter((cluster) => cluster.accounts.length >= minAccounts);
}

/**
 * A follow between two accounts that have ever signed in from the same
 * address is the concrete, checkable version of "sock puppet follows
 * itself" - not a judgment about pick quality, just shared network origin.
 */
export async function getSuspiciousFollows(): Promise<SuspiciousFollow[]> {
  const rows = await sqlClient<Array<{
    follower_id: string; follower_name: string; specialist_id: string; specialist_name: string;
    league_name: string; shared_ip: string;
  }>>`
    select distinct on (f.follower_user_id, f.specialist_user_id, f.league_id)
      f.follower_user_id as follower_id, follower.name as follower_name,
      f.specialist_user_id as specialist_id, specialist.name as specialist_name,
      l.name as league_name, fs.ip_address as shared_ip
    from league_follows f
    join "user" follower on follower.id = f.follower_user_id
    join "user" specialist on specialist.id = f.specialist_user_id
    join leagues l on l.id = f.league_id
    join session fs on fs.user_id = f.follower_user_id
    join session ss on ss.user_id = f.specialist_user_id and ss.ip_address = fs.ip_address
    where fs.ip_address is not null and fs.ip_address <> all(${sqlClient.array(NON_ADDRESS_VALUES)})
    order by f.follower_user_id, f.specialist_user_id, f.league_id`;

  return rows.map((row) => ({
    followerId: row.follower_id,
    followerName: row.follower_name,
    specialistId: row.specialist_id,
    specialistName: row.specialist_name,
    leagueName: row.league_name,
    sharedIpAddress: row.shared_ip,
  }));
}
