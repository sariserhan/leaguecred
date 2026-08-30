const aliases: Record<string, string> = {
  athbilbao: "athleticbilbao",
  athmadrid: "atleticomadrid",
  acmilan: "milan",
  bayernmunchen: "bayernmunich",
  borussiadortmund: "dortmund",
  betis: "realbetis",
  brighton: "brightonandhovealbion",
  buyuksehyr: "istanbulbasaksehir",
  celtavigo: "celta",
  clubatleticodemadrid: "atleticomadrid",
  deportivodeacoruna: "lacoruna",
  einfrankfurt: "eintrachtfrankfurt",
  internazionalemilano: "inter",
  forsittard: "fortunasittard",
  goztep: "goztepe",
  mancity: "manchestercity",
  manunited: "manchesterunited",
  mgladbach: "borussiamonchengladbach",
  nijmegen: "nec",
  nottmforest: "nottinghamforest",
  olympiakos: "olympiacos",
  parissg: "parissaintgermain",
  psv: "psveindhoven",
  realbetisbalompie: "realbetis",
  sociedad: "realsociedad",
  spbraga: "braga",
  splisbon: "sportinglisbon",
  sportingclubedeportugal: "sportinglisbon",
  stgilloise: "unionsaintgilloise",
  tottenham: "tottenhamhotspur",
  vallecano: "rayovallecano",
  westbrom: "westbromwichalbion",
  wolves: "wolverhamptonwanderers",
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
