import { readFileSync } from "node:fs";

const [basePath, domesticPath, cupsPath, searchesPath] = process.argv.slice(2);
if (!searchesPath) {
  throw new Error("Usage: node scripts/generate-team-catalog.mjs <base.json> <domestic.json> <cups.json> <searches.json>");
}

const base = JSON.parse(readFileSync(basePath, "utf8"));
const domesticFallbacks = JSON.parse(readFileSync(domesticPath, "utf8"));
const cupResponses = JSON.parse(readFileSync(cupsPath, "utf8"));
const searches = JSON.parse(readFileSync(searchesPath, "utf8"));
const cupLeagueIds = new Map([
  ["uel-events", "3"],
  ["libertadores-events", "13"], ["conference-events", "848"],
]);

function normalize(value) {
  return value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function fallbackShortName(name) {
  return name.replace(/[^\p{L}\p{N} ]/gu, " ").split(/\s+/).filter(Boolean)
    .map((word) => word[0]).join("").slice(0, 4).toUpperCase();
}

const teamsByApiFootballId = new Map();
const teamsByName = new Map();
function registerTeam(team, requestedName) {
  if (!team?.idAPIfootball || !team.idTeam || !team.strBadge) return null;
  const entry = {
    apiFootballId: String(team.idAPIfootball),
    sportsDbId: String(team.idTeam),
    name: team.strTeam,
    shortName: team.strTeamShort || fallbackShortName(team.strTeam),
    logoUrl: team.strBadge,
  };
  teamsByApiFootballId.set(entry.apiFootballId, entry);
  teamsByName.set(normalize(entry.name), entry);
  if (requestedName) teamsByName.set(normalize(requestedName), entry);
  return entry;
}

for (const response of [...base, ...domesticFallbacks]) {
  for (const team of response.teams) registerTeam(team);
}
for (const result of searches) registerTeam(result.team, result.name);

const memberships = new Map();
const imports = [];
function addMembership(leagueExternalId, team, sourceScope) {
  if (!team) return;
  memberships.set(`${leagueExternalId}:${team.apiFootballId}`, {
    leagueExternalId: String(leagueExternalId),
    apiFootballTeamId: team.apiFootballId,
    sourceScope,
  });
}

for (const response of base.filter((candidate) => candidate.teams.length > 0)) {
  for (const rawTeam of response.teams) addMembership(response.apiFootballId, registerTeam(rawTeam), "league-list");
  imports.push({
    leagueExternalId: String(response.apiFootballId),
    isComplete: false,
    teamCount: response.teams.length,
    note: "TheSportsDB free league list; capped at 10 returned teams.",
  });
}
for (const response of domesticFallbacks) {
  for (const rawTeam of response.teams) addMembership(response.leagueId, registerTeam(rawTeam), "league-list");
  imports.push({
    leagueExternalId: String(response.leagueId),
    isComplete: false,
    teamCount: response.teams.length,
    note: "TheSportsDB free league list; incomplete until verified by football-data.org or a paid current-season source.",
  });
}

for (const response of cupResponses) {
  const leagueExternalId = cupLeagueIds.get(response.key);
  if (!leagueExternalId) continue;
  const before = memberships.size;
  for (const event of response.events) {
    addMembership(leagueExternalId, teamsByName.get(normalize(event.strHomeTeam)), "event-sample");
    addMembership(leagueExternalId, teamsByName.get(normalize(event.strAwayTeam)), "event-sample");
  }
  imports.push({
    leagueExternalId,
    isComplete: false,
    teamCount: memberships.size - before,
    note: "TheSportsDB free current-season event sample; limited to 15 events and not a complete participant list.",
  });
}

const teams = [...teamsByApiFootballId.values()].sort((a, b) => a.name.localeCompare(b.name));
const membershipRows = [...memberships.values()].sort((a, b) =>
  Number(a.leagueExternalId) - Number(b.leagueExternalId) || a.apiFootballTeamId.localeCompare(b.apiFootballTeamId)
);
imports.sort((a, b) => Number(a.leagueExternalId) - Number(b.leagueExternalId));

if (teams.length !== 290) throw new Error(`Expected 290 teams, received ${teams.length}`);
if (membershipRows.length < 272) throw new Error(`Expected at least 272 memberships, received ${membershipRows.length}`);

const output = [
  "export const teamCatalogEntries = [",
  ...teams.map((entry) => `  ${JSON.stringify(entry)},`),
  "] as const;",
  "",
  "export const teamMembershipEntries = [",
  ...membershipRows.map((entry) => `  ${JSON.stringify(entry)},`),
  "] as const;",
  "",
  "export const teamImportEntries = [",
  ...imports.map((entry) => `  ${JSON.stringify(entry)},`),
  "] as const;",
  "",
].join("\n");

process.stdout.write(output);
