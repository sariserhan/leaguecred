import type postgres from "postgres";

import { sqlClient } from "@/db";
import { FootballDataOrgProvider, type FootballDataTeam } from "@/providers/football-data-org";
import { normalizeTeamName } from "@/services/team-names";
import { teamSlug } from "@/lib/team-path";

type CompetitionConfig = {
  league_id: string;
  season_id: string;
  provider_season: string;
  country_id: string;
};

function shortName(team: FootballDataTeam) {
  return team.tla || team.shortName || team.name.slice(0, 3).toUpperCase();
}

async function resolveFootballDataTeam(
  sql: postgres.TransactionSql,
  team: FootballDataTeam,
  config: CompetitionConfig,
) {
  let [resolved] = await sql<Array<{ id: string }>>`
    select team_id as id from team_provider_aliases
    where provider = 'football-data-org' and provider_external_id = ${String(team.id)}`;

  if (!resolved) {
    const candidates = await sql<Array<{ id: string; name: string }>>`
      select distinct t.id, t.name from teams t
      left join league_team_memberships ltm on ltm.team_id = t.id
      where t.country_id = ${config.country_id} or ltm.league_id = ${config.league_id}`;
    const matches = candidates.filter((candidate) => normalizeTeamName(candidate.name) === normalizeTeamName(team.name));
    if (matches.length === 1) resolved = matches[0];
  }

  if (!resolved) {
    [resolved] = await sql<Array<{ id: string }>>`
      insert into teams (provider, provider_external_id, name, slug, short_name, logo_url, logo_provider, country_id)
      values ('football-data-org', ${String(team.id)}, ${team.name}, ${teamSlug(team.name)}, ${shortName(team)}, ${team.crest},
        ${team.crest ? "football-data-org" : null}, ${config.country_id})
      on conflict (provider, provider_external_id) do update set
        name = excluded.name, short_name = excluded.short_name,
        logo_url = coalesce(excluded.logo_url, teams.logo_url),
        logo_provider = coalesce(excluded.logo_provider, teams.logo_provider), updated_at = now()
      returning id`;
  } else if (team.crest) {
    await sql`update teams set logo_url = ${team.crest}, logo_provider = 'football-data-org', updated_at = now()
      where id = ${resolved.id} and logo_url is null`;
  }
  if (!resolved) throw new Error(`Could not resolve ${team.name}.`);

  await sql`insert into team_provider_aliases (provider, provider_external_id, team_id, source_name)
    values ('football-data-org', ${String(team.id)}, ${resolved.id}, ${team.name})
    on conflict (provider, provider_external_id) do update set
      team_id = excluded.team_id, source_name = excluded.source_name, updated_at = now()`;
  return resolved.id;
}

export async function synchronizeChampionsLeagueTeams(provider = new FootballDataOrgProvider()) {
  const [config] = await sqlClient<CompetitionConfig[]>`
    select l.id as league_id, s.id as season_id, s.provider_season, l.country_id
    from leagues l join seasons s on s.league_id = l.id and s.is_current = true
    where l.slug = 'uefa-champions-league' and l.enabled = true limit 1`;
  if (!config) return { status: "skipped" as const, reason: "Champions League is not configured." };

  // Keep the external request outside the transaction so it never holds database locks.
  const payload = await provider.fetchTeams({ competitionExternalId: "CL", season: config.provider_season });
  if (payload.teams.length === 0) {
    return { status: "pending" as const, teamCount: 0, reason: "The official participant list is not published yet." };
  }

  await sqlClient.begin(async (sql) => {
    const teamIds: string[] = [];
    for (const team of payload.teams) teamIds.push(await resolveFootballDataTeam(sql, team, config));

    await sql`delete from league_team_memberships where league_id = ${config.league_id} and season_id = ${config.season_id}`;
    for (const teamId of teamIds) {
      await sql`insert into league_team_memberships
        (league_id, season_id, team_id, source_provider, source_scope)
        values (${config.league_id}, ${config.season_id}, ${teamId}, 'football-data-org', 'official-participant-list')
        on conflict (league_id, season_id, team_id) do update set
          source_provider = excluded.source_provider, source_scope = excluded.source_scope, updated_at = now()`;
    }
    await sql`delete from league_team_imports where league_id = ${config.league_id} and season_id = ${config.season_id}`;
    await sql`insert into league_team_imports
      (league_id, season_id, provider, is_complete, team_count, note, fetched_at)
      values (${config.league_id}, ${config.season_id}, 'football-data-org', true, ${teamIds.length},
        'Official competition participant list for the configured season.', now())`;
  });

  return { status: "succeeded" as const, teamCount: payload.teams.length };
}
