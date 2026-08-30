import type postgres from "postgres";

import {
  teamCatalogEntries,
  teamImportEntries,
  teamMembershipEntries,
} from "@/db/team-catalog-data";
import {
  verifiedTeamImportOverrides,
  verifiedTeamOverrides,
} from "@/db/verified-team-overrides";

export async function seedTeamCatalog(sql: postgres.TransactionSql) {
  const leagueExternalIds = [...new Set(teamImportEntries.map((entry) => entry.leagueExternalId))];
  const leagueIdValues = sql(leagueExternalIds) as postgres.Helper<unknown>;
  const leagueSeasons = await sql<Array<{ league_id: string; season_id: string; external_id: string }>>`
    select l.id as league_id, s.id as season_id, l.provider_external_id as external_id
    from leagues l
    join seasons s on s.league_id = l.id and s.is_current = true
    where l.provider = 'api-football'
      and l.provider_external_id in ${leagueIdValues}
  `;
  const seasonByLeague = new Map(leagueSeasons.map((row) => [row.external_id, row]));
  if (seasonByLeague.size !== teamImportEntries.length) {
    throw new Error(`Expected ${teamImportEntries.length} league seasons, found ${seasonByLeague.size}.`);
  }

  const teamRows = teamCatalogEntries.map((entry) => ({
    provider: "api-football",
    provider_external_id: entry.apiFootballId,
    sports_db_external_id: entry.sportsDbId,
    name: entry.name,
    short_name: entry.shortName,
    logo_url: entry.logoUrl,
    logo_provider: "thesportsdb",
  }));
  const teamValues = sql(teamRows,
    "provider", "provider_external_id", "sports_db_external_id", "name",
    "short_name", "logo_url", "logo_provider") as postgres.Helper<unknown>;
  const teams = await sql<Array<{ id: string; provider_external_id: string }>>`
    insert into teams ${teamValues}
    on conflict (provider, provider_external_id) do update set
      sports_db_external_id = excluded.sports_db_external_id,
      name = excluded.name,
      short_name = excluded.short_name,
      logo_url = excluded.logo_url,
      logo_provider = excluded.logo_provider,
      updated_at = now()
    returning id, provider_external_id
  `;
  const teamIds = new Map(teams.map((team) => [team.provider_external_id, team.id]));

  const currentSeasonIds = sql(leagueSeasons.map((row) => row.season_id)) as postgres.Helper<unknown>;
  await sql`
    delete from league_team_memberships
    where source_provider = 'thesportsdb'
      and season_id in ${currentSeasonIds}
  `;
  // Event samples are not participant lists. Never reintroduce the old inferred UCL roster.
  await sql`delete from league_team_memberships
    where source_provider = 'thesportsdb'
      and league_id in (select id from leagues where slug = 'uefa-champions-league')`;
  await sql`delete from league_team_imports
    where provider = 'thesportsdb'
      and league_id in (select id from leagues where slug = 'uefa-champions-league')`;

  const membershipRows = teamMembershipEntries.map((entry) => {
    const leagueSeason = seasonByLeague.get(entry.leagueExternalId);
    const teamId = teamIds.get(entry.apiFootballTeamId);
    if (!leagueSeason || !teamId) throw new Error(`Could not resolve membership ${entry.leagueExternalId}:${entry.apiFootballTeamId}.`);
    return {
      league_id: leagueSeason.league_id,
      season_id: leagueSeason.season_id,
      team_id: teamId,
      source_provider: "thesportsdb",
      source_scope: entry.sourceScope,
    };
  });
  const membershipValues = sql(membershipRows,
    "league_id", "season_id", "team_id", "source_provider", "source_scope") as postgres.Helper<unknown>;
  await sql`
    insert into league_team_memberships ${membershipValues}
    on conflict (league_id, season_id, team_id) do update set
      source_provider = excluded.source_provider,
      source_scope = excluded.source_scope,
      updated_at = now()
  `;

  const importRows = teamImportEntries.map((entry) => {
    const leagueSeason = seasonByLeague.get(entry.leagueExternalId);
    if (!leagueSeason) throw new Error(`Could not resolve import ${entry.leagueExternalId}.`);
    return {
      league_id: leagueSeason.league_id,
      season_id: leagueSeason.season_id,
      provider: "thesportsdb",
      is_complete: entry.isComplete,
      team_count: entry.teamCount,
      note: entry.note,
      fetched_at: new Date().toISOString(),
    };
  });
  const importValues = sql(importRows,
    "league_id", "season_id", "provider", "is_complete", "team_count", "note", "fetched_at") as postgres.Helper<unknown>;
  await sql`
    insert into league_team_imports ${importValues}
    on conflict (league_id, season_id, provider) do update set
      is_complete = excluded.is_complete,
      team_count = excluded.team_count,
      note = excluded.note,
      fetched_at = excluded.fetched_at,
      updated_at = now()
  `;

  for (const entry of verifiedTeamOverrides) {
    const leagueSeason = seasonByLeague.get(entry.leagueExternalId);
    if (!leagueSeason) throw new Error(`Could not resolve verified team override league ${entry.leagueExternalId}.`);

    const [team] = await sql<Array<{ id: string }>>`
      insert into teams (
        provider, provider_external_id, sports_db_external_id, name, short_name,
        logo_url, logo_provider, country_id
      )
      values (
        ${entry.provider}, ${entry.providerExternalId}, ${entry.sportsDbExternalId},
        ${entry.name}, ${entry.shortName}, ${entry.logoUrl}, 'thesportsdb',
        (select country_id from leagues where id = ${leagueSeason.league_id})
      )
      on conflict (provider, provider_external_id) do update set
        sports_db_external_id = excluded.sports_db_external_id,
        name = excluded.name,
        short_name = excluded.short_name,
        logo_url = excluded.logo_url,
        logo_provider = excluded.logo_provider,
        country_id = excluded.country_id,
        updated_at = now()
      returning id
    `;
    if (!team) throw new Error(`Could not upsert verified team override ${entry.name}.`);

    await sql`
      insert into league_team_memberships (
        league_id, season_id, team_id, source_provider, source_scope
      )
      values (
        ${leagueSeason.league_id}, ${leagueSeason.season_id}, ${team.id},
        ${entry.membershipSourceProvider}, ${entry.membershipSourceScope}
      )
      on conflict (league_id, season_id, team_id) do update set
        source_provider = excluded.source_provider,
        source_scope = excluded.source_scope,
        updated_at = now()
    `;
  }

  for (const entry of verifiedTeamImportOverrides) {
    const leagueSeason = seasonByLeague.get(entry.leagueExternalId);
    if (!leagueSeason) throw new Error(`Could not resolve verified import override league ${entry.leagueExternalId}.`);

    await sql`
      insert into league_team_imports (
        league_id, season_id, provider, is_complete, team_count, note, fetched_at
      )
      values (
        ${leagueSeason.league_id}, ${leagueSeason.season_id}, ${entry.provider},
        ${entry.isComplete}, ${entry.teamCount}, ${entry.note}, now()
      )
      on conflict (league_id, season_id, provider) do update set
        is_complete = excluded.is_complete,
        team_count = excluded.team_count,
        note = excluded.note,
        fetched_at = excluded.fetched_at,
        updated_at = now()
    `;
  }
}
