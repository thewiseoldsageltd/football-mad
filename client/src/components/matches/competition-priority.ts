const DISPLAY_ALIAS_BY_ID = new Map<string, string>([
  ["1204", "Premier League"],
  ["1205", "Championship"],
  ["1206", "League One"],
  ["1197", "League Two"],
  ["1203", "National League"],
  ["1198", "FA Cup"],
  ["1199", "EFL Cup"],
  ["1370", "Premiership"],
  ["1373", "Championship"],
  ["1376", "League Two"],
  ["1375", "League Three"],
  ["1371", "FA Cup"],
  ["1372", "League Cup"],
  ["1399", "La Liga"],
  ["202", "Copa del Rey"],
  ["1269", "Serie A"],
  ["1264", "Coppa Italia"],
  ["1229", "Bundesliga"],
  ["221", "DFB-Pokal"],
  ["1221", "Ligue 1"],
  ["231", "Coupe de France"],
  ["1005", "UEFA Champions League"],
  ["1007", "UEFA Europa League"],
  ["18853", "UEFA Europa Conference League"],
]);

const COUNTRY_BY_ID = new Map<string, string>([
  // England
  ["1204", "England"],
  ["1205", "England"],
  ["1206", "England"],
  ["1197", "England"],
  ["1203", "England"],
  ["1198", "England"],
  ["1199", "England"],
  // Scotland
  ["1370", "Scotland"],
  ["1373", "Scotland"],
  ["1376", "Scotland"],
  ["1375", "Scotland"],
  ["1371", "Scotland"],
  ["1372", "Scotland"],
  // Spain
  ["1399", "Spain"],
  ["202", "Spain"],
  // Italy
  ["1269", "Italy"],
  ["1264", "Italy"],
  // Germany
  ["1229", "Germany"],
  ["221", "Germany"],
  // France
  ["1221", "France"],
  ["231", "France"],
  // Europe (neutral; no country flag override)
  ["1005", ""],
  ["1007", ""],
  ["18853", ""],
]);

const PRIORITY_IDS: string[] = [
  // World Cup (resolved by name matcher first)
  // European competitions
  "1005",
  "1007",
  "18853",
  // English leagues/cups
  "1204",
  "1205",
  "1206",
  "1197",
  "1203",
  "1198",
  "1199",
  // Scottish leagues/cups
  "1370",
  "1373",
  "1376",
  "1375",
  "1371",
  "1372",
  // Spanish leagues/cups
  "1399",
  "202",
  // Italian leagues/cups
  "1269",
  "1264",
  // German leagues/cups
  "1229",
  "221",
  // French leagues/cups
  "1221",
  "231",
];

const PRIORITY_INDEX_BY_ID = new Map(PRIORITY_IDS.map((id, idx) => [id, idx]));

const NAME_MATCHERS: Array<{ pattern: RegExp; rank: number }> = [
  { pattern: /fifa world cup/i, rank: 0 },

  { pattern: /uefa champions league/i, rank: 1 },
  { pattern: /uefa europa league/i, rank: 2 },
  { pattern: /europa conference league/i, rank: 3 },

  { pattern: /^premier league$/i, rank: 4 },
  { pattern: /^championship$/i, rank: 5 },
  { pattern: /^league one$/i, rank: 6 },
  { pattern: /^league two$/i, rank: 7 },
  { pattern: /^national league$/i, rank: 8 },
  { pattern: /^fa cup$/i, rank: 9 },
  { pattern: /^efl cup$/i, rank: 10 },

  { pattern: /scottish premiership|premier league scotland/i, rank: 11 },
  { pattern: /^division1$/i, rank: 12 },
  { pattern: /^division2$/i, rank: 13 },
  { pattern: /^division3$/i, rank: 14 },
  { pattern: /fa cup scotland/i, rank: 15 },
  { pattern: /league cup scotland/i, rank: 16 },

  { pattern: /laliga|primera/i, rank: 17 },
  { pattern: /copa del rey/i, rank: 18 },

  { pattern: /^serie a$/i, rank: 19 },
  { pattern: /coppa italia/i, rank: 20 },

  { pattern: /bundesliga/i, rank: 21 },
  { pattern: /dfb[- ]?pokal/i, rank: 22 },

  { pattern: /ligue 1/i, rank: 23 },
  { pattern: /coupe de france/i, rank: 24 },
];

function normalizeName(name: string | null | undefined): string {
  return String(name ?? "").trim();
}

function cleanCompetitionDisplayName(value: string): string {
  return value
    .replace(/\s*\[\d+\]\s*$/, "")
    .replace(/\s*\((Eurocups|England|Germany|Spain|Italy|France|Netherlands|Portugal|Scotland|Turkey|Belgium|Austria|Switzerland)\)\s*$/i, "")
    .trim();
}

export function getPublicCompetitionDisplayName(
  name: string | null | undefined,
  goalserveCompetitionId?: string | null,
): string {
  const normalizedId = String(goalserveCompetitionId ?? "").trim();
  if (normalizedId && DISPLAY_ALIAS_BY_ID.has(normalizedId)) {
    return DISPLAY_ALIAS_BY_ID.get(normalizedId)!;
  }

  const normalizedName = normalizeName(name);
  if (/fifa world cup/i.test(normalizedName)) return "FIFA World Cup";
  return cleanCompetitionDisplayName(normalizedName || "Unknown");
}

export function getCompetitionCountryById(goalserveCompetitionId?: string | null): string | null {
  const normalizedId = String(goalserveCompetitionId ?? "").trim();
  if (!normalizedId) return null;
  const country = COUNTRY_BY_ID.get(normalizedId);
  if (!country) return null;
  return country.trim() || null;
}

export function getCompetitionDisplayRank(name: string | null | undefined, goalserveCompetitionId?: string | null): number {
  const byId = goalserveCompetitionId ? PRIORITY_INDEX_BY_ID.get(String(goalserveCompetitionId).trim()) : undefined;
  if (typeof byId === "number") return byId;

  const normalizedName = normalizeName(name);
  for (const matcher of NAME_MATCHERS) {
    if (matcher.pattern.test(normalizedName)) return matcher.rank;
  }

  return Number.POSITIVE_INFINITY;
}

export function compareCompetitionsByPriority(
  a: { name: string | null | undefined; goalserveCompetitionId?: string | null },
  b: { name: string | null | undefined; goalserveCompetitionId?: string | null },
): number {
  const rankA = getCompetitionDisplayRank(a.name, a.goalserveCompetitionId);
  const rankB = getCompetitionDisplayRank(b.name, b.goalserveCompetitionId);
  if (rankA !== rankB) return rankA - rankB;
  return getPublicCompetitionDisplayName(a.name, a.goalserveCompetitionId).localeCompare(
    getPublicCompetitionDisplayName(b.name, b.goalserveCompetitionId),
  );
}
