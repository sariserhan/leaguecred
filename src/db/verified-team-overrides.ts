export const verifiedTeamOverrides = [
  {
    leagueExternalId: "218",
    provider: "thesportsdb",
    providerExternalId: "137252",
    sportsDbExternalId: "137252",
    name: "Wolfsberger AC",
    shortName: "WAC",
    logoUrl: "https://r2.thesportsdb.com/images/media/team/badge/xcwuqt1568668946.png",
    membershipSourceProvider: "austrian-bundesliga-official",
    membershipSourceScope: "official-club-list",
  },
  {
    leagueExternalId: "218",
    provider: "thesportsdb",
    providerExternalId: "137807",
    sportsDbExternalId: "137807",
    name: "WSG Tirol",
    shortName: "WSG",
    logoUrl: "https://r2.thesportsdb.com/images/media/team/badge/9dmxk01685123856.png",
    membershipSourceProvider: "austrian-bundesliga-official",
    membershipSourceScope: "official-club-list",
  },
] as const;

export const verifiedTeamImportOverrides = [
  {
    leagueExternalId: "218",
    provider: "austrian-bundesliga-official",
    isComplete: true,
    teamCount: 12,
    note: "Complete 2026-27 participant list verified against the official Austrian Bundesliga club list; missing team identities and badges resolved through TheSportsDB's free team records.",
  },
] as const;
