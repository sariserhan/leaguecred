export type Region = "Europe" | "Americas" | "Asia" | "Africa" | "Oceania";

export type League = {
  slug: string;
  country: string;
  countryCode: string;
  /** Undefined where the catalogue has neither an image nor an emoji for the
   *  country — a continent, usually. The explorer draws a marker instead. */
  flag?: string;
  flagUrl?: string | null;
  /** A confederation rather than a country: Europe, South America. */
  isRegion?: boolean;
  sport?: string;
  logoUrl?: string | null;
  name: string;
  shortName: string;
  region: Region;
  specialistCount: number;
  status: string;
  action: string;
  available?: boolean;
  hasExperience: boolean;
  hasTeamCatalog: boolean;
  hasRecord: boolean;
  isFollowed: boolean;
  lockDue: boolean;
};
