const aliases: Record<string, string> = {
  "1fsvmainz05": "mainz",
  acmilan: "milan",
  adodenhaag: "denhaag",
  asroma: "roma",
  athbilbao: "athleticbilbao",
  athmadrid: "atleticomadrid",
  bayernmunchen: "bayernmunich",
  betis: "realbetis",
  birminghamcity: "birmingham",
  blackburnrovers: "blackburn",
  boltonwanderers: "bolton",
  borussiadortmund: "dortmund",
  brighton: "brightonandhovealbion",
  buyuksehyr: "istanbulbasaksehir",
  cardiffcity: "cardiff",
  celtavigo: "celta",
  charltonathletic: "charlton",
  clubatleticodemadrid: "atleticomadrid",
  deportivodeacoruna: "lacoruna",
  derbycounty: "derby",
  einfrankfurt: "eintrachtfrankfurt",
  forsittard: "fortunasittard",
  goztep: "goztepe",
  heartofmidlothian: "hearts",
  hullcity: "hull",
  internazionalemilano: "inter",
  lincolncity: "lincoln",
  mancity: "manchestercity",
  manunited: "manchesterunited",
  mgladbach: "borussiamonchengladbach",
  necnijmegen: "nec",
  nijmegen: "nec",
  norwichcity: "norwich",
  nottmforest: "nottinghamforest",
  olympiakos: "olympiacos",
  parissg: "parissaintgermain",
  prestonnorthend: "preston",
  psv: "psveindhoven",
  queensparkrangers: "qpr",
  realbetisbalompie: "realbetis",
  sociedad: "realsociedad",
  spbraga: "braga",
  splisbon: "sportinglisbon",
  sportingclubedeportugal: "sportinglisbon",
  stgilloise: "unionsaintgilloise",
  stokecity: "stoke",
  standardliege: "standard",
  swanseacity: "swansea",
  tottenham: "tottenhamhotspur",
  vallecano: "rayovallecano",
  levadiakos: "levadeiakos",
  oficrete: "ofi",
  vitoriadeguimaraes: "guimaraes",
  volosnfc: "volos",
  vfbstuttgart: "stuttgart",
  vitoriasc: "guimaraes",
  westbrom: "westbromwichalbion",
  westhamunited: "westham",
  wolves: "wolverhamptonwanderers",
  zultewaregem: "waregem",
  zwolle: "peczwolle",
};

export function normalizeTeamName(value: string) {
  const normalized = value
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/\b(fc|cf|afc|sk|fk|sc|ssc|pae)\b/g, " ")
    .replace(/[^a-z0-9]+/g, "")
    .replace(/^(club|clube)/, "");
  return aliases[normalized] ?? normalized;
}

export function teamNamesMatch(left: string, right: string) {
  return normalizeTeamName(left) === normalizeTeamName(right);
}
