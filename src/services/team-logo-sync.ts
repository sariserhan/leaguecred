import type postgres from "postgres";

import { sqlClient } from "@/db";
import { ApiFootballProvider, type ApiFootballTeam } from "@/providers/api-football";
import { FootballDataOrgProvider, type FootballDataTeam } from "@/providers/football-data-org";
import { TheSportsDbProvider, type SportsDbTeam } from "@/providers/thesportsdb";
import { normalizeTeamName } from "@/services/team-names";

type MissingTeam = {
  id: string;
  name: string;
  short_name: string;
  country: string;
  country_id: string;
  super_lig: boolean;
};

type LogoTeam = MissingTeam & { logo_url: string; provider: string; provider_external_id: string };

const apiCountries: Record<string, string> = { "Türkiye": "Turkey" };
const searches: Record<string, string> = {
  "Ath Bilbao": "Athletic Bilbao", "Ath Madrid": "Atletico Madrid", "Buyuksehyr": "Istanbul Basaksehir",
  "Celta": "Celta Vigo", "Corum": "Corum", "Den Haag": "ADO Den Haag", "Ein Frankfurt": "Eintracht Frankfurt",
  "Espanol": "Espanyol", "For Sittard": "Fortuna Sittard", "Goztep": "Goztepe", "La Coruna": "Deportivo La Coruna",
  "M'gladbach": "Borussia Monchengladbach", "Nijmegen": "NEC Nijmegen", "Nott'm Forest": "Nottingham Forest",
  "Olympiakos": "Olympiacos", "Paris SG": "Paris Saint Germain", "Sociedad": "Real Sociedad",
  "Sp Lisbon": "Sporting CP", "St. Gilloise": "Union Saint Gilloise", "Vallecano": "Rayo Vallecano",
  "West Brom": "West Bromwich Albion", "Wolves": "Wolverhampton Wanderers", "Zwolle": "PEC Zwolle",
};
const knownApiIds: Record<string, string> = {
  Amedspor: "3579",
  "Ath Bilbao": "531",
  Buyuksehyr: "564",
  Dortmund: "165",
  Genclerbirligi: "997",
  Hull: "64",
  Kasimpasa: "1004",
  Liverpool: "40",
  "Man City": "50",
  "Man United": "33",
  Milan: "489",
  Roma: "497",
};

const footballDataCompetitions = [
  { slug: "premier-league", code: "PL" },
  { slug: "la-liga", code: "PD" },
  { slug: "serie-a", code: "SA" },
  { slug: "bundesliga", code: "BL1" },
  { slug: "ligue-1", code: "FL1" },
  { slug: "primeira-liga", code: "PPL" },
  { slug: "eredivisie", code: "DED" },
  { slug: "efl-championship", code: "ELC" },
] as const;

const sportsDbSearches: Record<string, string> = {
  Guimaraes: "Vitoria Guimaraes",
  Mechelen: "KV Mechelen",
  "RAAL La Louviere": "RAAL La Louviere",
  "St. Gilloise": "Union St Gilloise",
  Standard: "Standard Liege",
  Waregem: "Zulte Waregem",
  Westerlo: "Westerlo",
  Hearts: "Heart of Midlothian",
  Aris: "Aris",
  Levadeiakos: "Levadiakos",
  "OFI Crete": "OFI",
  "Volos NFC": "Volos",
};

const verifiedLogoFallbacks: Record<string, { logoUrl: string; provider: string }> = {
  "Oud-Heverlee Leuven": {
    logoUrl: "https://upload.wikimedia.org/wikipedia/commons/2/24/OH_LEUVEN.png",
    provider: "wikimedia-commons",
  },
  "St Truiden": {
    logoUrl: "https://media.api-sports.io/football/teams/735.png",
    provider: "api-football",
  },
};

function matchSportsDbTeam(name: string, country: string, results: SportsDbTeam[]) {
  const normalized = normalizeTeamName(name);
  const candidates = results.filter((team) => team.strSport === "Soccer" && team.strCountry === country
    && team.strBadge && !/(women|u\d\d|youth|reserves?)/i.test(team.strTeam));
  const exact = candidates.filter((team) => normalizeTeamName(team.strTeam) === normalized);
  if (exact.length === 1) return exact[0];
  const partial = candidates.filter((team) => {
    const candidate = normalizeTeamName(team.strTeam);
    return normalized.length >= 4 && (candidate.includes(normalized) || normalized.includes(candidate));
  });
  return partial.length === 1 ? partial[0] : null;
}

export async function synchronizeTheSportsDbLogos(provider = new TheSportsDbProvider()) {
  const missing = await sqlClient<Array<{ id: string; name: string; country: string }>>`
    select distinct t.id, t.name, c.name as country from teams t
    join league_team_memberships m on m.team_id = t.id
    join seasons s on s.id = m.season_id and s.is_current = true
    join countries c on c.id = t.country_id
    where t.logo_url is null order by t.name`;

  const fetched: Array<{ team: typeof missing[number]; logoUrl: string; provider: string } | null> = [];
  for (const [index, team] of missing.entries()) {
    const fallback = verifiedLogoFallbacks[team.name];
    if (fallback) {
      fetched.push({ team, ...fallback });
      continue;
    }
    if (index > 0) await new Promise((resolve) => setTimeout(resolve, 300));
    const results = await provider.searchTeams(sportsDbSearches[team.name] ?? team.name);
    const match = matchSportsDbTeam(team.name, team.country, results);
    fetched.push(match?.strBadge ? { team, logoUrl: match.strBadge, provider: "thesportsdb" } : null);
  }

  const resolved = fetched.filter((entry) => entry !== null);
  await sqlClient.begin(async (sql) => {
    for (const entry of resolved) {
      await sql`update teams set logo_url = ${entry.logoUrl}, logo_provider = ${entry.provider}, updated_at = now()
        where id = ${entry.team.id} and logo_url is null`;
    }
  });
  return {
    requestCount: missing.length - missing.filter((team) => verifiedLogoFallbacks[team.name]).length,
    updated: resolved.length,
    unresolved: missing.filter((team) => !resolved.some((entry) => entry.team.id === team.id)).map((team) => team.name),
  };
}

function matchFootballDataTeam(name: string, roster: FootballDataTeam[]) {
  const normalized = normalizeTeamName(name);
  const exact = roster.filter((team) => normalizeTeamName(team.name) === normalized);
  if (exact.length === 1) return exact[0];
  const partial = roster.filter((team) => {
    const candidate = normalizeTeamName(team.name);
    return normalized.length >= 4 && (candidate.includes(normalized) || normalized.includes(candidate));
  });
  return partial.length === 1 ? partial[0] : null;
}

export async function synchronizeFootballDataOrgLogos(provider = new FootballDataOrgProvider()) {
  const slugs = footballDataCompetitions.map((entry) => entry.slug);
  const configs = await sqlClient<Array<{ slug: string; league_id: string; season_id: string; provider_season: string }>>`
    select l.slug, l.id as league_id, s.id as season_id, s.provider_season
    from leagues l join seasons s on s.league_id = l.id and s.is_current = true
    where l.slug in ${sqlClient(slugs)}`;
  const configBySlug = new Map(configs.map((config) => [config.slug, config]));

  // Fetch all external data before opening a transaction.
  const batches = await Promise.all(footballDataCompetitions.map(async (competition) => {
    const config = configBySlug.get(competition.slug);
    if (!config) return null;
    const payload = await provider.fetchTeams({ competitionExternalId: competition.code, season: config.provider_season });
    return { config, teams: payload.teams };
  }));

  let updated = 0;
  const unresolved: string[] = [];
  for (const batch of batches) {
    if (!batch) continue;
    const missing = await sqlClient<Array<{ id: string; name: string }>>`
      select distinct t.id, t.name from teams t
      join league_team_memberships m on m.team_id = t.id
      where m.league_id = ${batch.config.league_id} and m.season_id = ${batch.config.season_id}
        and t.logo_url is null`;
    const matches = missing.map((team) => ({ team, providerTeam: matchFootballDataTeam(team.name, batch.teams) }));
    unresolved.push(...matches.filter((match) => !match.providerTeam?.crest)
      .map((match) => `${batch.config.slug}:${match.team.name}`));

    await sqlClient.begin(async (sql) => {
      for (const match of matches) {
        if (!match.providerTeam?.crest) continue;
        const result = await sql`update teams set logo_url = ${match.providerTeam.crest},
          logo_provider = 'football-data-org', updated_at = now()
          where id = ${match.team.id} and logo_url is null returning id`;
        updated += result.count;
      }
    });
  }
  return { requestCount: batches.filter(Boolean).length, updated, unresolved };
}

function isSeniorTeam(team: ApiFootballTeam) {
  return !/(^|\s)(u\d\d|w|women|b|ii|reserves?|youth)(\s|$)/i.test(team.name);
}

function selectResult(source: MissingTeam, results: ApiFootballTeam[]) {
  const country = apiCountries[source.country] ?? source.country;
  const senior = results.filter((team) => team.country === country && isSeniorTeam(team) && team.logo);
  const expected = normalizeTeamName(searches[source.name] ?? source.name);
  const exact = senior.filter((team) => normalizeTeamName(team.name) === expected);
  if (exact.length === 1) return exact[0];
  return senior.length === 1 ? senior[0] : null;
}

async function mergeTeam(sql: postgres.TransactionSql, source: MissingTeam, target: LogoTeam) {
  if (source.id === target.id) return;
  await sql`update teams set country_id = coalesce(country_id, ${source.country_id}), updated_at = now()
    where id = ${target.id}`;
  await sql`insert into league_team_memberships (league_id, season_id, team_id, source_provider, source_scope)
    select league_id, season_id, ${target.id}, source_provider, source_scope
    from league_team_memberships where team_id = ${source.id}
    on conflict (league_id, season_id, team_id) do nothing`;
  await sql`delete from league_team_memberships where team_id = ${source.id}`;
  await sql`update team_provider_aliases set team_id = ${target.id}, updated_at = now() where team_id = ${source.id}`;
  await sql`update fixtures set home_team_id = ${target.id}, updated_at = now() where home_team_id = ${source.id}`;
  await sql`update fixtures set away_team_id = ${target.id}, updated_at = now() where away_team_id = ${source.id}`;
  await sql`update fixtures set winner_team_id = ${target.id}, updated_at = now() where winner_team_id = ${source.id}`;
  await sql`update picks set selected_team_id = ${target.id}, updated_at = now() where selected_team_id = ${source.id}`;
  await sql`delete from teams where id = ${source.id}`;
}

async function saveApiTeam(source: MissingTeam, apiTeam: ApiFootballTeam) {
  await sqlClient.begin(async (sql) => {
    let [target] = await sql<LogoTeam[]>`
      select id, name, short_name, country_id, ${source.country}::text as country, logo_url, provider, provider_external_id
      from teams where provider = 'api-football' and provider_external_id = ${String(apiTeam.id)} limit 1`;
    if (!target) {
      await sql`update teams set name = ${apiTeam.name}, short_name = ${apiTeam.code || source.short_name},
        logo_url = ${apiTeam.logo}, logo_provider = 'api-football', updated_at = now() where id = ${source.id}`;
      [target] = await sql<LogoTeam[]>`
        select id, name, short_name, country_id, ${source.country}::text as country, logo_url, provider, provider_external_id
        from teams where id = ${source.id}`;
    } else {
      await sql`update teams set logo_url = coalesce(${apiTeam.logo}::text, logo_url),
        logo_provider = case when ${apiTeam.logo}::text is not null then 'api-football' else logo_provider end,
        updated_at = now() where id = ${target.id}`;
      await mergeTeam(sql, source, target);
    }
    if (!target) throw new Error(`Could not save ${source.name}.`);
    await sql`insert into team_provider_aliases (provider, provider_external_id, team_id, source_name)
      values ('api-football', ${String(apiTeam.id)}, ${target.id}, ${apiTeam.name})
      on conflict (provider, provider_external_id) do update set
        team_id = excluded.team_id, source_name = excluded.source_name, updated_at = now()`;
  });
}

export async function synchronizeMissingTeamLogos(input: { maxRequests?: number } = {}) {
  const maxRequests = input.maxRequests ?? 90;
  const missing = await sqlClient<MissingTeam[]>`
    select t.id, t.name, t.short_name, c.name as country, t.country_id,
      bool_or(l.slug = 'super-lig') as super_lig
    from teams t
    join league_team_memberships ltm on ltm.team_id = t.id
    join seasons s on s.id = ltm.season_id and s.is_current = true
    join leagues l on l.id = ltm.league_id
    join countries c on c.id = t.country_id
    where t.logo_url is null and t.provider = 'football-data-uk'
    group by t.id, t.name, t.short_name, c.name, t.country_id
    order by bool_or(l.slug = 'super-lig') desc, min(l.priority), t.name`;
  const logoTeams = await sqlClient<LogoTeam[]>`
    select t.id, t.name, t.short_name, coalesce(c.name, '') as country, t.country_id,
      t.logo_url, t.provider, t.provider_external_id
    from teams t left join countries c on c.id = t.country_id where t.logo_url is not null`;

  const locallyMatched: MissingTeam[] = [];
  const unresolved: MissingTeam[] = [];
  for (const source of missing) {
    const candidates = logoTeams.filter((target) => (target.country_id === source.country_id || !target.country_id)
      && normalizeTeamName(target.name) === normalizeTeamName(source.name));
    if (candidates.length === 1) {
      await sqlClient.begin((sql) => mergeTeam(sql, source, candidates[0]));
      locallyMatched.push(source);
    } else {
      unresolved.push(source);
    }
  }

  const provider = new ApiFootballProvider();
  const fetched: string[] = [];
  const ambiguous: string[] = [];
  for (const [index, source] of unresolved.slice(0, maxRequests).entries()) {
    if (index > 0) await new Promise((resolve) => setTimeout(resolve, 6_500));
    const knownId = knownApiIds[source.name];
    if (knownId) {
      const apiTeam = await provider.fetchTeam(knownId);
      if (apiTeam?.logo) {
        await saveApiTeam(source, apiTeam);
        fetched.push(source.name);
      } else {
        ambiguous.push(source.name);
      }
      continue;
    }
    let results: ApiFootballTeam[];
    try {
      results = await provider.searchTeams(searches[source.name] ?? source.name);
    } catch (error) {
      if (!(error instanceof Error) || !error.message.includes("429")) throw error;
      await new Promise((resolve) => setTimeout(resolve, 7_000));
      results = await provider.searchTeams(searches[source.name] ?? source.name);
    }
    const apiTeam = selectResult(source, results);
    if (!apiTeam) {
      ambiguous.push(source.name);
      continue;
    }
    await saveApiTeam(source, apiTeam);
    fetched.push(source.name);
  }

  return {
    missingAtStart: missing.length,
    localMatches: locallyMatched.length,
    apiRequests: Math.min(unresolved.length, maxRequests),
    fetched: fetched.length,
    ambiguous,
    deferred: unresolved.slice(maxRequests).map((team) => team.name),
  };
}
