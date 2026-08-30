export type Region = "Europe" | "Americas" | "Asia";

export type League = {
  slug: string;
  country: string;
  countryCode: string;
  flag: string;
  logoUrl?: string | null;
  name: string;
  shortName: string;
  region: Region;
  specialistCount: number;
  status: string;
  action: string;
};

export type Fixture = {
  id: string;
  home: string;
  homeCode: string;
  away: string;
  awayCode: string;
  kickoff: string;
};

export type Specialist = {
  id: string;
  name: string;
  initials: string;
  accuracy: number;
  record: string;
  picks: number;
  followers: number;
  lock: string;
};

export const leagues: League[] = [
  {
    slug: "super-lig",
    country: "Türkiye",
    countryCode: "TR",
    flag: "🇹🇷",
    name: "Süper Lig",
    shortName: "SÜL",
    region: "Europe",
    specialistCount: 126,
    status: "Your record 78.3%",
    action: "Open league",
  },
  {
    slug: "premier-league",
    country: "England",
    countryCode: "GB",
    flag: "🏴",
    name: "Premier League",
    shortName: "PL",
    region: "Europe",
    specialistCount: 482,
    status: "3 specialists followed",
    action: "View picks",
  },
  {
    slug: "canadian-premier-league",
    country: "Canada",
    countryCode: "CA",
    flag: "🇨🇦",
    name: "Canadian Premier League",
    shortName: "CPL",
    region: "Americas",
    specialistCount: 34,
    status: "Following Liam",
    action: "View specialists",
  },
  {
    slug: "serie-a",
    country: "Italy",
    countryCode: "IT",
    flag: "🇮🇹",
    name: "Serie A",
    shortName: "SA",
    region: "Europe",
    specialistCount: 211,
    status: "No record yet",
    action: "Explore league",
  },
  {
    slug: "liga-mx",
    country: "Mexico",
    countryCode: "MX",
    flag: "🇲🇽",
    name: "Liga MX",
    shortName: "LMX",
    region: "Americas",
    specialistCount: 96,
    status: "No specialists followed",
    action: "Find a specialist",
  },
  {
    slug: "j1-league",
    country: "Japan",
    countryCode: "JP",
    flag: "🇯🇵",
    name: "J1 League",
    shortName: "J1",
    region: "Asia",
    specialistCount: 84,
    status: "No record yet",
    action: "Explore league",
  },
];

export const superLigFixtures: Fixture[] = [
  {
    id: "gal-kas",
    home: "Galatasaray",
    homeCode: "GS",
    away: "Kasımpaşa",
    awayCode: "KAS",
    kickoff: "Saturday · 14:00",
  },
  {
    id: "fen-ant",
    home: "Fenerbahçe",
    homeCode: "FB",
    away: "Antalyaspor",
    awayCode: "ANT",
    kickoff: "Saturday · 17:00",
  },
  {
    id: "bes-kon",
    home: "Beşiktaş",
    homeCode: "BJK",
    away: "Konyaspor",
    awayCode: "KON",
    kickoff: "Sunday · 16:00",
  },
  {
    id: "tra-riz",
    home: "Trabzonspor",
    homeCode: "TS",
    away: "Rizespor",
    awayCode: "RIZ",
    kickoff: "Sunday · 19:00",
  },
];

export const superLigSpecialists: Specialist[] = [
  {
    id: "aylin",
    name: "Aylin",
    initials: "AY",
    accuracy: 84.2,
    record: "48–9",
    picks: 57,
    followers: 1284,
    lock: "Galatasaray",
  },
  {
    id: "serhan",
    name: "Serhan",
    initials: "SE",
    accuracy: 81.6,
    record: "40–9",
    picks: 49,
    followers: 936,
    lock: "Fenerbahçe",
  },
  {
    id: "efe",
    name: "Efe",
    initials: "EF",
    accuracy: 79.4,
    record: "27–7",
    picks: 34,
    followers: 612,
    lock: "Galatasaray",
  },
];

export function getLeagueBySlug(slug: string) {
  return leagues.find((league) => league.slug === slug);
}
