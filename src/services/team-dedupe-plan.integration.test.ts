import { describe, expect, it } from "vitest";

import { sqlClient } from "@/db";
import { applyTeamMerge, mergeNamedTeams } from "@/services/team-dedupe-plan";
import type { TeamRow } from "@/services/team-dedupe-plan";

const superLig = "10000000-0000-4000-8000-000000000001";

async function createTeam(name: string, slug: string, provider: string) {
  const [row] = await sqlClient<Array<{ id: string; created_at: Date }>>`
    insert into teams (provider, provider_external_id, name, slug, short_name)
    values (${provider}, ${`${provider}-external`}, ${name}, ${slug}, 'TST')
    returning id, created_at`;
  return row!;
}

function asDedupeTeam(id: string, name: string, slug: string, provider: string): TeamRow {
  return {
    id, name, slug, provider,
    provider_external_id: `${provider}-external`,
    country_id: null,
    country_is_region: false,
    regions: ["Europe"],
    memberships: 1,
    domestic_memberships: 1,
    created_at: 0,
    logo_url: null,
    logo_provider: null,
    sports_db_external_id: null,
  };
}

describe("applyTeamMerge", () => {
  // Destructive and irreversible, and the panel now offers it on a button, so
  // what it moves and what it deletes is pinned here rather than trusted.
  it("moves fixtures and aliases onto the survivor and deletes the duplicate", async () => {
    const suffix = crypto.randomUUID();
    const keeperProvider = `test-keeper-${suffix}`;
    const duplicateProvider = `test-duplicate-${suffix}`;
    const keeper = await createTeam(`Merge Club ${suffix}`, `merge-club-${suffix}`, keeperProvider);
    const duplicate = await createTeam(`Merge Club ${suffix}`, `merge-club-dup-${suffix}`, duplicateProvider);
    const opponent = await createTeam(`Merge Opponent ${suffix}`, `merge-opponent-${suffix}`, `test-opponent-${suffix}`);

    const [season] = await sqlClient<Array<{ id: string }>>`
      select id from seasons where league_id = ${superLig} and is_current = true limit 1`;
    const [matchweek] = await sqlClient<Array<{ id: string }>>`
      insert into matchweeks (league_id, season_id, provider_round_name, display_name, start_at, lock_at, end_at)
      values (${superLig}, ${season!.id}, ${`merge-round-${suffix}`}, ${`Merge week ${suffix}`},
        now() + interval '30 days', now() + interval '30 days', now() + interval '31 days')
      returning id`;
    const [fixture] = await sqlClient<Array<{ id: string }>>`
      insert into fixtures (provider, provider_external_id, league_id, season_id, matchweek_id,
        home_team_id, away_team_id, kickoff_at, last_synced_at)
      values (${duplicateProvider}, ${`merge-fixture-${suffix}`}, ${superLig}, ${season!.id}, ${matchweek!.id},
        ${duplicate.id}, ${opponent.id}, now() + interval '30 days', now())
      returning id`;

    await applyTeamMerge({
      canonical: asDedupeTeam(keeper.id, `Merge Club ${suffix}`, `merge-club-${suffix}`, keeperProvider),
      duplicates: [asDedupeTeam(duplicate.id, `Merge Club ${suffix}`, `merge-club-dup-${suffix}`, duplicateProvider)],
    });

    const [movedFixture] = await sqlClient<Array<{ home_team_id: string }>>`
      select home_team_id from fixtures where id = ${fixture!.id}`;
    expect(movedFixture?.home_team_id).toBe(keeper.id);

    const [gone] = await sqlClient<Array<{ id: string }>>`select id from teams where id = ${duplicate.id}`;
    expect(gone).toBeUndefined();

    // The deleted row's provider key becomes an alias, so the next sync from
    // that provider finds the survivor instead of recreating what was merged.
    const [alias] = await sqlClient<Array<{ team_id: string }>>`
      select team_id from team_provider_aliases
      where provider = ${duplicateProvider} and provider_external_id = ${`${duplicateProvider}-external`}`;
    expect(alias?.team_id).toBe(keeper.id);
  });

  // The pairs a person decides get no evidence check by design, but they still
  // must not produce a club playing itself - the schema forbids it, and the
  // merge would fail half-applied rather than be refused.
  it("refuses a hand-made merge when a fixture lists both clubs", async () => {
    const suffix = crypto.randomUUID();
    const left = await createTeam(`Rival A ${suffix}`, `rival-a-${suffix}`, `test-rival-a-${suffix}`);
    const right = await createTeam(`Rival B ${suffix}`, `rival-b-${suffix}`, `test-rival-b-${suffix}`);

    const [season] = await sqlClient<Array<{ id: string }>>`
      select id from seasons where league_id = ${superLig} and is_current = true limit 1`;
    const [matchweek] = await sqlClient<Array<{ id: string }>>`
      insert into matchweeks (league_id, season_id, provider_round_name, display_name, start_at, lock_at, end_at)
      values (${superLig}, ${season!.id}, ${`rival-round-${suffix}`}, ${`Rival week ${suffix}`},
        now() + interval '60 days', now() + interval '60 days', now() + interval '61 days')
      returning id`;
    await sqlClient`
      insert into fixtures (provider, provider_external_id, league_id, season_id, matchweek_id,
        home_team_id, away_team_id, kickoff_at, last_synced_at)
      values (${`test-rival-${suffix}`}, ${`rival-fixture-${suffix}`}, ${superLig}, ${season!.id}, ${matchweek!.id},
        ${left.id}, ${right.id}, now() + interval '60 days', now())`;

    await expect(mergeNamedTeams(left.id, right.id)).rejects.toThrow(/play itself/);

    const [survivor] = await sqlClient<Array<{ id: string }>>`select id from teams where id = ${right.id}`;
    expect(survivor).toBeDefined();
  });
});