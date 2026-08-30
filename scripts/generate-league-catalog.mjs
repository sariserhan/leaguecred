import { readFileSync } from "node:fs";

const inputPath = process.argv[2];
if (!inputPath) throw new Error("Usage: node scripts/generate-league-catalog.mjs <api-response.json>");

const competitions = JSON.parse(readFileSync(inputPath, "utf8"));
const byId = new Map(competitions.map((item) => [item.league.id, item]));

const requested = [
  { id: 39, name: "Premier League", slug: "premier-league", shortName: "PL", region: "Europe", country: "England", countryCode: "GB" },
  { id: 2, name: "UEFA Champions League", slug: "uefa-champions-league", shortName: "UCL", region: "Europe", country: "Europe", countryCode: "EU", flagUrl: null },
  { id: 140, name: "La Liga", slug: "la-liga", shortName: "LAL", region: "Europe" },
  { id: 135, name: "Serie A", slug: "serie-a", shortName: "SA", region: "Europe" },
  { id: 78, name: "Bundesliga", slug: "bundesliga", shortName: "BUN", region: "Europe" },
  { id: 61, name: "Ligue 1", slug: "ligue-1", shortName: "L1", region: "Europe" },
  { id: 3, name: "Europa League", slug: "europa-league", shortName: "UEL", region: "Europe", country: "Europe", countryCode: "EU", flagUrl: null },
  { id: 71, name: "Brasileirão Série A", slug: "brasileirao-serie-a", shortName: "BRA", region: "Americas" },
  { id: 203, name: "Süper Lig", slug: "super-lig", shortName: "SÜL", region: "Europe", country: "Türkiye" },
  { id: 94, name: "Liga Portugal", slug: "primeira-liga", shortName: "LP", region: "Europe" },
  { id: 88, name: "Eredivisie", slug: "eredivisie", shortName: "ERE", region: "Europe" },
  { id: 40, name: "EFL Championship", slug: "efl-championship", shortName: "EFL", region: "Europe", country: "England", countryCode: "GB" },
  { id: 262, name: "Liga MX", slug: "liga-mx", shortName: "LMX", region: "Americas" },
  { id: 253, name: "MLS", slug: "major-league-soccer", shortName: "MLS", region: "Americas", country: "United States / Canada", countryCode: "US-CA", flagUrl: null },
  { id: 128, name: "Argentine Primera División", slug: "liga-profesional-argentina", shortName: "ARG", region: "Americas" },
  { id: 307, name: "Saudi Pro League", slug: "saudi-arabia-pro-league", shortName: "SPL", region: "Asia", country: "Saudi Arabia" },
  { id: 144, name: "Belgian Pro League", slug: "belgium-jupiler-pro-league", shortName: "BPL", region: "Europe" },
  { id: 179, name: "Scottish Premiership", slug: "scotland-premiership", shortName: "SCP", region: "Europe" },
  { id: 13, name: "Copa Libertadores", slug: "copa-libertadores", shortName: "LIB", region: "Americas", country: "South America", countryCode: "CONMEBOL", flagUrl: null },
  { id: 848, name: "UEFA Conference League", slug: "uefa-conference-league", shortName: "UECL", region: "Europe", country: "Europe", countryCode: "EU", flagUrl: null },
  { id: 197, name: "Greek Super League", slug: "super-league-greece", shortName: "GSL", region: "Europe" },
  { id: 218, name: "Austrian Bundesliga", slug: "austria-bundesliga", shortName: "ABL", region: "Europe" },
  { id: 207, name: "Swiss Super League", slug: "switzerland-super-league", shortName: "SSL", region: "Europe" },
  { id: 119, name: "Danish Superliga", slug: "denmark-superliga", shortName: "DSL", region: "Europe" },
  { id: 345, name: "Czech First League", slug: "czech-republic-czech-liga", shortName: "CFL", region: "Europe", country: "Czech Republic" },
];

const entries = requested.map((config, index) => {
  const item = byId.get(config.id);
  if (!item) throw new Error(`API-Football competition ${config.id} is missing`);
  const season = item.seasons.find((candidate) => candidate.current);
  if (!season) throw new Error(`No current season for ${config.name}`);
  const seasonName = Number(season.end.slice(0, 4)) > season.year
    ? `${season.year}–${String(season.year + 1).slice(-2)}`
    : String(season.year);
  return {
    externalId: String(config.id),
    country: config.country ?? item.country.name.replaceAll("-", " "),
    countryCode: config.countryCode ?? item.country.code,
    flagUrl: Object.hasOwn(config, "flagUrl") ? config.flagUrl : item.country.flag,
    name: config.name,
    slug: config.slug,
    shortName: config.shortName,
    region: config.region,
    priority: index + 1,
    providerSeason: String(season.year),
    seasonName,
    startDate: season.start,
    endDate: season.end,
    logoUrl: item.league.logo,
  };
});

if (entries.length !== 25) throw new Error(`Expected 25 competitions, received ${entries.length}`);
if (new Set(entries.map((entry) => entry.slug)).size !== entries.length) throw new Error("League slugs are not unique");

const output = [
  'export type CatalogRegion = "Europe" | "Americas" | "Asia" | "Africa" | "Oceania";',
  "",
  "export type CatalogEntry = {",
  "  externalId: string; country: string; countryCode: string; flagUrl: string | null;",
  "  name: string; slug: string; shortName: string; region: CatalogRegion; priority: number;",
  "  providerSeason: string; seasonName: string; startDate: string; endDate: string; logoUrl: string | null;",
  "};",
  "",
  "export const catalogEntries: CatalogEntry[] = [",
  ...entries.map((entry) => `  ${JSON.stringify(entry)},`),
  "];",
  "",
].join("\n");

process.stdout.write(output);
