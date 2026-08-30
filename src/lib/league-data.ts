export type Region = "Europe" | "Americas" | "Asia" | "Africa" | "Oceania";

export type League = {
  slug: string;
  country: string;
  countryCode: string;
  flag: string;
  flagUrl?: string | null;
  logoUrl?: string | null;
  name: string;
  shortName: string;
  region: Region;
  specialistCount: number;
  status: string;
  action: string;
  available?: boolean;
  hasRecord: boolean;
  isFollowed: boolean;
  lockDue: boolean;
};
