import { sqlClient } from "@/db";
import {
  fetchFootballDataUkRosters,
  type RosterBatch,
  type RosterTeam,
} from "@/providers/football-data-uk-rosters";
import { normalizeTeamName } from "@/services/team-names";
import { teamSlug } from "@/lib/team-path";
import { VERIFIED_WEB_ROSTERS } from "@/services/verified-rosters";

type LeagueConfig = {
  league_id: string;
  season_id: string;
  slug: string;
  provider_season: string;
  country_id: string;
};

type Candidate = {
  id: string;
  name: string;
  provider: string;
  country_id: string | null;
  logo_url: string | null;
  current_member: boolean;
};

const providerPriority: Record<string, number> = {
  "api-football": 5,
  thesportsdb: 4,
  "football-data-org": 3,
  "football-data-uk": 1,
};

function selectCandidate(team: RosterTeam, candidates: Candidate[], config: LeagueConfig) {
  const normalized = normalizeTeamName(team.name);
  return candidates
    .filter((candidate) => normalizeTeamName(candidate.name) === normalized)
    .toSorted((left, right) => {
      const score = (candidate: Candidate) =>
        (candidate.current_member ? 100 : 0)
        + (candidate.country_id === config.country_id ? 20 : 0)
        + (candidate.logo_url ? 10 : 0)
        + (providerPriority[candidate.provider] ?? 0);
      return score(right) - score(left) || left.name.localeCompare(right.name);
    })[0];
}

async function synchronizeRoster(batch: RosterBatch, config: LeagueConfig) {
  if (batch.teams.length !== batch.expectedTeamCount) {
    return {
      leagueSlug: batch.leagueSlug,
      status: "pending" as const,
      expected: batch.expectedTeamCount,
      received: batch.teams.length,
    };
  }

  const candidates = await sqlClient<Candidate[]>`
    select t.id, t.name, t.provider, t.country_id, t.logo_url,
      exists(
        select 1 from league_team_memberships current_membership
        where current_membership.team_id = t.id
          and current_membership.league_id = ${config.league_id}
          and current_membership.season_id = ${config.season_id}
      ) as current_member
    from teams t`;
  const resolved = batch.teams.map((team) => ({
    team,
    candidate: selectCandidate(team, candidates, config),
  }));

  await sqlClient.begin(async (sql) => {
    const teamIds = new Map<string, string>();
    for (const entry of resolved) {
      if (entry.candidate) {
        teamIds.set(entry.team.externalId, entry.candidate.id);
        continue;
      }
      const [inserted] = await sql<Array<{ id: string }>>`
        insert into teams (
          provider, provider_external_id, name, slug, short_name, logo_url, logo_provider, country_id
        )
        values (
          ${batch.provider}, ${entry.team.externalId}, ${entry.team.name}, ${teamSlug(entry.team.name)}, ${entry.team.shortName},
          null, null, ${config.country_id}
        )
        on conflict (provider, provider_external_id) do update set
          name = excluded.name,
          short_name = excluded.short_name,
          country_id = coalesce(teams.country_id, excluded.country_id),
          updated_at = now()
        returning id`;
      if (!inserted) throw new Error(`Could not resolve roster team ${entry.team.name}.`);
      teamIds.set(entry.team.externalId, inserted.id);
    }

    for (const entry of resolved) {
      const teamId = teamIds.get(entry.team.externalId);
      if (!teamId) throw new Error(`Missing resolved roster team ${entry.team.name}.`);
      await sql`update teams set country_id = coalesce(country_id, ${config.country_id}), updated_at = now()
        where id = ${teamId}`;
      await sql`insert into team_provider_aliases (
          provider, provider_external_id, team_id, source_name
        ) values (
          ${batch.provider}, ${entry.team.externalId}, ${teamId}, ${entry.team.name}
        )
        on conflict (provider, provider_external_id) do update set
          team_id = excluded.team_id,
          source_name = excluded.source_name,
          updated_at = now()`;
    }

    await sql`delete from league_team_memberships
      where league_id = ${config.league_id} and season_id = ${config.season_id}`;
    for (const entry of resolved) {
      const teamId = teamIds.get(entry.team.externalId)!;
      await sql`insert into league_team_memberships (
          league_id, season_id, team_id, source_provider, source_scope
        ) values (
          ${config.league_id}, ${config.season_id}, ${teamId}, ${batch.provider}, 'verified-current-roster'
        )
        on conflict (league_id, season_id, team_id) do update set
          source_provider = excluded.source_provider,
          source_scope = excluded.source_scope,
          updated_at = now()`;
    }

    await sql`delete from league_team_imports
      where league_id = ${config.league_id} and season_id = ${config.season_id}`;
    await sql`insert into league_team_imports (
        league_id, season_id, provider, is_complete, team_count, note, fetched_at
      ) values (
        ${config.league_id}, ${config.season_id}, ${batch.provider}, true,
        ${batch.teams.length}, ${`Complete current roster verified from ${batch.sourceUrl}`}, now()
      )
      on conflict (league_id, season_id, provider) do update set
        is_complete = excluded.is_complete,
        team_count = excluded.team_count,
        note = excluded.note,
        fetched_at = excluded.fetched_at,
        updated_at = now()`;
  });

  return {
    leagueSlug: batch.leagueSlug,
    status: "succeeded" as const,
    teamCount: batch.teams.length,
  };
}

export async function synchronizeCurrentRosters() {
  const configs = await sqlClient<LeagueConfig[]>`
    select l.id as league_id, s.id as season_id, l.slug, s.provider_season, l.country_id
    from leagues l
    join seasons s on s.league_id = l.id and s.is_current = true
    where l.enabled = true`;
  const configBySlug = new Map(configs.map((config) => [config.slug, config]));
  const providerSeasonBySlug = new Map(configs.map((config) => [config.slug, config.provider_season]));

  // Every HTTP request completes before any write transaction starts.
  const freeRosters = await fetchFootballDataUkRosters(providerSeasonBySlug);
  const batches = [...freeRosters, ...VERIFIED_WEB_ROSTERS];
  const results = [];
  for (const batch of batches) {
    const config = configBySlug.get(batch.leagueSlug);
    if (!config) continue;
    results.push(await synchronizeRoster(batch, config));
  }
  return results;
}
