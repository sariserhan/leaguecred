import type { RosterBatch, RosterTeam } from "@/providers/football-data-uk-rosters";

function shortName(name: string) {
  const words = name.replace(/[^\p{L}\p{N} ]/gu, " ").trim().split(/\s+/).filter(Boolean);
  return (words.length === 1 ? words[0]!.slice(0, 3) : words.map((word) => word[0]).join("").slice(0, 4)).toUpperCase();
}

function externalId(slug: string, name: string) {
  return `${slug}:${name.normalize("NFKD").replace(/\p{Diacritic}/gu, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}`;
}

function teams(slug: string, names: readonly string[]): RosterTeam[] {
  return names.map((name) => ({ externalId: externalId(slug, name), name, shortName: shortName(name) }));
}

function batch(input: Omit<RosterBatch, "sourceCode" | "teams"> & {
  names: readonly string[];
}): RosterBatch {
  return {
    leagueSlug: input.leagueSlug,
    provider: input.provider,
    sourceCode: input.leagueSlug,
    expectedTeamCount: input.expectedTeamCount,
    sourceUrl: input.sourceUrl,
    teams: teams(input.leagueSlug, input.names),
  };
}

export const VERIFIED_WEB_ROSTERS: RosterBatch[] = [
  batch({
    leagueSlug: "saudi-arabia-pro-league",
    provider: "saudi-pro-league-official",
    expectedTeamCount: 18,
    sourceUrl: "https://www.spl.com.sa/en/news/spl-announces-2026-27-rsl-fixture-schedule",
    names: [
      "Al Nassr", "Al Hilal", "Al Ahli", "Al Qadsiah", "Al Ittihad", "Al Taawoun",
      "Al Ettifaq", "Al Fateh", "Al Khaleej", "Al Shabab", "NEOM Sports Club",
      "Al Hazem", "Al Fayha", "Al Kholood", "Al Riyadh", "Abha", "Al Faisaly", "Diriyah FC",
    ],
  }),
  batch({
    leagueSlug: "europa-league",
    provider: "uefa-official",
    expectedTeamCount: 36,
    sourceUrl: "https://www.uefa.com/uefaeuropaleague/news/02a8-217364fd42e6-7e49801d8daf-1000--2026-27-europa-league-who-has-qualified-for-the-league-phase/",
    names: [
      "Crystal Palace", "Bournemouth", "Sunderland", "Milan", "Juventus", "Real Sociedad",
      "Celta Vigo", "Hoffenheim", "Bayer Leverkusen", "Marseille", "Rennes", "AZ Alkmaar",
      "Torreense", "Celje", "Celtic", "Dinamo Zagreb", "Hapoel Be'er Sheva", "Levski Sofia",
      "Lyon", "NEC Nijmegen", "Olympiacos", "Sparta Prague", "Sturm Graz", "Union Saint-Gilloise",
      "Anderlecht", "Ararat-Armenia", "Benfica", "Beşiktaş", "Ferencváros", "Jagiellonia",
      "Lech Poznań", "Lillestrøm", "OFI Crete", "Omonia", "Red Bull Salzburg", "Viktoria Plzeň",
    ],
  }),
  batch({
    leagueSlug: "uefa-conference-league",
    provider: "uefa-official",
    expectedTeamCount: 36,
    sourceUrl: "https://www.uefa.com/uefaconferenceleague/news/02a8-2173721761ef-f7d2ad211af2-1000--2026-27-conference-league-who-has-qualified-for-the-league-phase/",
    names: [
      "Egnatia", "Freiburg", "Inter Club d'Escaldes", "Brighton and Hove Albion", "Gent",
      "Sint-Truidense", "Borac Banja Luka", "CSKA Sofia", "Pafos", "Hajduk Split",
      "AGF Aarhus", "FC Copenhagen", "FC Midtjylland", "FC Nordsjælland", "Heart of Midlothian",
      "Getafe", "KuPS Kuopio", "Monaco", "Iberia 1999", "Lincoln Red Imps", "Panathinaikos",
      "Atalanta", "Kairat Almaty", "Riga FC", "Kauno Žalgiris", "Brann", "Ajax", "Twente",
      "Braga", "Universitatea Craiova", "Red Star Belgrade", "Mjällby", "Lugano", "Thun",
      "Jablonec", "Trabzonspor",
    ],
  }),
  batch({
    leagueSlug: "copa-libertadores",
    provider: "conmebol-official",
    expectedTeamCount: 32,
    sourceUrl: "https://gol.conmebol.com/libertadores/en/news/road-eternal-glory-these-are-groups-2026-conmebol-libertadores",
    names: [
      "Flamengo", "Estudiantes de La Plata", "Cusco", "Independiente Medellín", "Nacional",
      "Universitario", "Coquimbo Unido", "Deportes Tolima", "Fluminense", "Bolívar",
      "Deportivo La Guaira", "Independiente Rivadavia", "Boca Juniors", "Cruzeiro",
      "Universidad Católica", "Barcelona SC", "Peñarol", "Corinthians", "Independiente Santa Fe",
      "Platense", "Palmeiras", "Cerro Porteño", "Junior", "Sporting Cristal", "LDU Quito",
      "Lanús", "Always Ready", "Mirassol", "Independiente del Valle", "Libertad",
      "Rosario Central", "Universidad Central",
    ],
  }),
];
