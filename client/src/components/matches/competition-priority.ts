const PRIORITY_IDS: string[] = [
  // World Cup
  "231",
  // European competitions
  "1005", // UEFA Champions League
  "1007", // UEFA Europa League
  "18853", // Europa Conference League
  // English
  "1204", // Premier League
  "1205", // Championship
  "1206", // League One
  "1197", // League Two
  "1198", // National League
  "1371", // FA Cup
  "1369", // EFL Cup
  // Scottish
  "1221", // Scottish Premiership
  "1264", // Division1
  "1269", // Division2
  "1515", // Division3
  "1372", // FA Cup Scotland
  "1373", // League Cup Scotland
  // Spanish
  "1399", // Primera / LaLiga
  "1375", // Copa del Rey
  // Italian
  "1199", // Serie A
  "1376", // Coppa Italia
  // German
  "1229", // Bundesliga
  "1370", // DFB-Pokal
  // French
  "1203", // Ligue 1
  "1260", // Coupe de France
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
  return normalizeName(a.name).localeCompare(normalizeName(b.name));
}
