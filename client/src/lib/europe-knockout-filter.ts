/**
 * Filters /api/cup/progress rounds for UEFA league-phase competitions so only
 * true knockout stages appear (excludes league phase, groups, matchdays).
 */

const LEAGUE_OR_TABLE_DENY: RegExp[] = [
  /league\s*phase/i,
  /^league\s*$/i,
  /group\s*stage/i,
  /^group\s+[a-z0-9]+$/i,
  /^matchday\s*\d+/i,
  /\bmd\s*\d+\b/i,
  /regular\s*season/i,
  /\bstanding\b/i,
  /\btable\b/i,
];

function normalize(name: string): string {
  return name.trim().replace(/\s+/g, " ");
}

/**
 * Maps a round label to a stable sort index (1–5). Returns null if the round
 * should be excluded from the Europe knockout strip (league phase, qualifiers, etc.).
 */
export function getEuropeKnockoutStageOrder(name: string): number | null {
  const raw = normalize(name);
  const n = raw.toLowerCase();

  if (!raw) return null;
  if (LEAGUE_OR_TABLE_DENY.some((re) => re.test(raw))) return null;

  // Qualifying rounds (not the UEFA KO play-offs)
  if (/^(first|second|third)\s+qualifying\s+round$/i.test(raw)) return null;
  if (/qualifying\s+round/i.test(n) && !/knockout/i.test(n)) return null;

  // 1 — Knockout Round Play-offs / Playoff Round
  if (
    /knockout\s+round\s+play[- ]?offs?/i.test(raw) ||
    /knockout\s+play[- ]?offs?/i.test(raw) ||
    /^play[- ]?off\s+round$/i.test(raw) ||
    /^playoff\s+round$/i.test(raw) ||
    /^knockout\s+play[- ]?offs?$/i.test(raw) ||
    (n.includes("play-off") && n.includes("knockout")) ||
    (n.includes("playoff") && n.includes("knockout"))
  ) {
    return 1;
  }

  // 2 — Round of 16
  if (/round\s+of\s+16|1\/8[- ]?finals?|r16\b|ro16\b/i.test(n)) return 2;

  // 3 — Quarter-finals
  if (/quarter|1\/4[- ]?finals?/i.test(n)) return 3;

  // 4 — Semi-finals
  if (/semi|1\/2[- ]?finals?/i.test(n)) return 4;

  // 5 — Final (after quarter/semi checks so we don't match *-finals wrongly)
  if (/^final$/i.test(raw) || /^the\s+final$/i.test(raw)) return 5;
  if (/\bfinal\b/i.test(n) && !/semi|quarter|1\/4|1\/2|1\/8|qualifying/i.test(n)) return 5;

  return null;
}

export interface EuropeKnockoutRoundLike {
  name: string;
  order?: number;
  matches: unknown[];
}

export function filterAndSortEuropeKnockoutRounds<T extends EuropeKnockoutRoundLike>(rounds: T[]): T[] {
  const withMatches = rounds.filter((r) => Array.isArray(r.matches) && r.matches.length > 0);
  const knockout = withMatches.filter((r) => getEuropeKnockoutStageOrder(r.name) != null);

  return knockout.sort((a, b) => {
    const oa = getEuropeKnockoutStageOrder(a.name)!;
    const ob = getEuropeKnockoutStageOrder(b.name)!;
    if (oa !== ob) return oa - ob;
    return (a.order ?? 0) - (b.order ?? 0);
  });
}
