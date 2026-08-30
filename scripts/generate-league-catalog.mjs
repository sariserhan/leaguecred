import { readFileSync } from "node:fs";

const inputPath = process.argv[2];
if (!inputPath) throw new Error("Usage: node scripts/generate-league-catalog.mjs <api-response.json>");

const competitions = JSON.parse(readFileSync(inputPath, "utf8"));

const corrections = new Map([
  ["Azerbaijan", 419], ["Canada", 479], ["Estonia", 329],
  ["Faroe-Islands", 367], ["Georgia", 327], ["Guatemala", 339],
  ["Israel", 383], ["Kazakhstan", 389], ["Latvia", 365],
  ["Lithuania", 362], ["Malta", 393], ["New-Zealand", 955],
  ["Northern-Ireland", 408], ["Paraguay", 252],
]);

const excludedNames = /women|femeni|feminina|féminine|female|ladies|girl|u-?\d\d|under ?\d\d|youth|junior|reserve|primavera|development|academy|amateur|regional|state league|county|isthmian|northern|southern|non league|play-offs|relegation|promotion|apertura|clausura|opening|closing|championship round|relegation round/i;

const regions = new Map();
function assign(region, countries) {
  for (const country of countries) regions.set(country, region);
}

assign("Europe", [
  "Albania", "Andorra", "Armenia", "Austria", "Azerbaijan", "Belarus", "Belgium",
  "Bosnia", "Bulgaria", "Croatia", "Cyprus", "Czech-Republic", "Denmark", "England",
  "Estonia", "Faroe-Islands", "Finland", "France", "Georgia", "Germany", "Gibraltar",
  "Greece", "Hungary", "Iceland", "Ireland", "Israel", "Italy", "Kazakhstan", "Kosovo",
  "Latvia", "Lithuania", "Luxembourg", "Macedonia", "Malta", "Moldova", "Montenegro",
  "Netherlands", "Northern-Ireland", "Norway", "Poland", "Portugal", "Romania", "Russia",
  "San-Marino", "Scotland", "Serbia", "Slovakia", "Slovenia", "Spain", "Sweden",
  "Switzerland", "Turkey", "Ukraine", "Wales",
]);
assign("Americas", [
  "Antigua-And-Barbuda", "Argentina", "Aruba", "Barbados", "Belize", "Bermuda", "Bolivia",
  "Brazil", "Canada", "Chile", "Colombia", "Costa-Rica", "Cuba", "Curacao",
  "Dominican-Republic", "Ecuador", "El-Salvador", "Grenada", "Guadeloupe", "Guatemala",
  "Haiti", "Honduras", "Jamaica", "Mexico", "Nicaragua", "Panama", "Paraguay", "Peru",
  "Suriname", "Trinidad-And-Tobago", "Uruguay", "USA", "Venezuela",
]);
assign("Asia", [
  "Bahrain", "Bangladesh", "Bhutan", "Cambodia", "China", "Chinese-Taipei", "Hong-Kong",
  "India", "Indonesia", "Iran", "Iraq", "Japan", "Jordan", "Kuwait", "Kyrgyzstan", "Laos",
  "Lebanon", "Macao", "Malaysia", "Maldives", "Mongolia", "Myanmar", "Nepal", "Oman",
  "Pakistan", "Palestine", "Philippines", "Qatar", "Saudi-Arabia", "Singapore", "South-Korea",
  "Syria", "Tajikistan", "Thailand", "Turkmenistan", "United-Arab-Emirates", "Uzbekistan",
  "Vietnam", "Yemen",
]);
assign("Africa", [
  "Algeria", "Angola", "Benin", "Botswana", "Burkina-Faso", "Burundi", "Cameroon", "Congo",
  "Congo-DR", "Egypt", "Eswatini", "Ethiopia", "Gabon", "Gambia", "Ghana", "Guinea",
  "Ivory-Coast", "Kenya", "Lesotho", "Liberia", "Libya", "Malawi", "Mali", "Mauritania",
  "Mauritius", "Morocco", "Namibia", "Nigeria", "Rwanda", "Senegal", "Somalia",
  "South-Africa", "Sudan", "Tanzania", "Togo", "Tunisia", "Uganda", "Zambia", "Zimbabwe",
]);
assign("Oceania", ["Australia", "Fiji", "New-Zealand"]);

const displayCountries = new Map([
  ["Antigua-And-Barbuda", "Antigua and Barbuda"],
  ["Czech-Republic", "Czech Republic"], ["Faroe-Islands", "Faroe Islands"],
  ["Ivory-Coast", "Ivory Coast"], ["New-Zealand", "New Zealand"],
  ["Northern-Ireland", "Northern Ireland"], ["Saudi-Arabia", "Saudi Arabia"],
  ["South-Africa", "South Africa"], ["South-Korea", "South Korea"],
  ["Trinidad-And-Tobago", "Trinidad and Tobago"], ["Turkey", "Türkiye"],
  ["United-Arab-Emirates", "United Arab Emirates"], ["USA", "United States"],
]);
const countryCodes = new Map([["England", "GB"], ["USA", "US"]]);
const displayLeagues = new Map([
  [71, "Brasileirão Série A"], [197, "Super League Greece"],
  [252, "Paraguayan Primera División"], [955, "New Zealand National League"],
]);
const slugOverrides = new Map([
  [39, "premier-league"], [71, "brasileirao-serie-a"], [78, "bundesliga"],
  [88, "eredivisie"], [94, "primeira-liga"], [98, "j1-league"], [128, "liga-profesional-argentina"],
  [135, "serie-a"], [140, "la-liga"], [197, "super-league-greece"], [203, "super-lig"],
  [253, "major-league-soccer"], [262, "liga-mx"], [479, "canadian-premier-league"],
]);
const shortNameOverrides = new Map([
  [39, "PL"], [71, "BRA"], [78, "BUN"], [88, "ERE"], [94, "PRI"], [98, "J1"],
  [128, "LPA"], [135, "SA"], [140, "LAL"], [197, "SLG"], [203, "SÜL"],
  [253, "MLS"], [262, "LMX"], [479, "CPL"],
]);
const priorityIds = [203, 135, 39, 140, 78, 88, 94, 197, 128, 71, 253, 479];

function slugify(value) {
  return value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function shortName(value) {
  const words = value.replace(/[^\p{L}\p{N} ]/gu, " ").split(/\s+/).filter(Boolean);
  if (words.length === 1) return words[0].slice(0, 4).toUpperCase();
  return words.map((word) => word[0]).join("").slice(0, 4).toUpperCase();
}

const leagueItems = competitions.filter((item) =>
  item.league.type === "League" && item.country.name && item.country.name !== "World"
);
const byCountry = Map.groupBy(leagueItems, (item) => item.country.name);
const selected = [];

for (const [country, candidates] of byCountry) {
  const correctedId = corrections.get(country);
  const item = correctedId
    ? candidates.find((candidate) => candidate.league.id === correctedId)
    : candidates.filter((candidate) => !excludedNames.test(candidate.league.name))
      .sort((a, b) => a.league.id - b.league.id)[0];
  if (!item) continue;
  const season = item.seasons.find((candidate) => candidate.current);
  const region = regions.get(country);
  if (!season) throw new Error(`No current season for ${country}: ${item.league.name}`);
  if (!region) throw new Error(`No region assigned for ${country}`);
  selected.push({ item, season, region });
}

const priority = new Map(priorityIds.map((id, index) => [id, index + 1]));
selected.sort((a, b) => {
  const aPriority = priority.get(a.item.league.id) ?? Number.MAX_SAFE_INTEGER;
  const bPriority = priority.get(b.item.league.id) ?? Number.MAX_SAFE_INTEGER;
  return aPriority - bPriority || a.item.country.name.localeCompare(b.item.country.name);
});

const entries = selected.map(({ item, season, region }, index) => {
  const country = displayCountries.get(item.country.name) ?? item.country.name.replaceAll("-", " ");
  const name = displayLeagues.get(item.league.id) ?? item.league.name;
  const seasonName = Number(season.end.slice(0, 4)) > season.year
    ? `${season.year}–${String(season.year + 1).slice(-2)}`
    : String(season.year);
  return {
    externalId: String(item.league.id),
    country,
    countryCode: countryCodes.get(item.country.name) ?? item.country.code,
    flagUrl: item.country.flag,
    name,
    slug: slugOverrides.get(item.league.id) ?? slugify(`${country}-${name}`),
    shortName: shortNameOverrides.get(item.league.id) ?? shortName(name),
    region,
    priority: index + 1,
    providerSeason: String(season.year),
    seasonName,
    startDate: season.start,
    endDate: season.end,
    logoUrl: item.league.logo,
  };
});

if (entries.length < 168) throw new Error(`Expected at least 168 top flights, received ${entries.length}`);
if (new Set(entries.map((entry) => entry.countryCode)).size !== entries.length) throw new Error("Country codes are not unique");
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
