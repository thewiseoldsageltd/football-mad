/**
 * Normalize + group fixtures into matchweeks/matchdays across:
 * - Domestic leagues (Goalserve XML uses <week number="X">)
 * - Europe comps (often uses matchday/round/stage labels)
 *
 * Returns:
 * - rounds: ["MW1","MW2",...]
 * - matchesByRound: Record<"MWx", Match[]>
 * - defaultSelectedRound: latest round with fixtures/results (never MW0)
 * - helpers for prev/next navigation
 */

type AnyMatch = Record<string, any>;

const toInt = (v: any): number | null => {
  if (v === null || v === undefined) return null;
  const n = Number(String(v).trim());
  return Number.isFinite(n) ? n : null;
};

const extractRoundNumber = (m: AnyMatch): number | null => {
  const candidates = [
    m.week,
    m["@week"],
    m.week_number,
    m.weekNo,
    m.weekno,
    m.week?.number,
    m.week?.["@number"],
    m.matchweek,
    m.matchday,
    m["@matchday"],
    m.round,
    m["@round"],
    m.round_id,
    m.round_number,
    m.round_name,
    m.week_name,
    m.name,
    m["@name"],
  ];

  for (const c of candidates) {
    const n = toInt(c);
    if (n !== null && n > 0) return n;

    if (typeof c === "string") {
      const s = c.trim();
      const match = s.match(/(?:mw|md|matchweek|matchday|round|week)\s*([0-9]{1,3})/i);
      if (match?.[1]) {
        const parsed = toInt(match[1]);
        if (parsed !== null && parsed > 0) return parsed;
      }
    }
  }

  return null;
};

const extractMatchDateTime = (m: AnyMatch): { date?: string; time?: string } => {
  const date = (m["@date"] ?? m.date ?? m.match_date ?? m.kickoffDate ?? "").toString().trim() || undefined;
  const time = (m["@time"] ?? m.time ?? m.match_time ?? m.kickoffTime ?? "").toString().trim() || undefined;
  return { date, time };
};

const isFinishedOrScheduled = (m: AnyMatch): boolean => {
  const status = String(m["@status"] ?? m.status ?? "").toLowerCase();
  return (
    status.includes("scheduled") ||
    status.includes("not started") ||
    status.includes("fixture") ||
    status.includes("ft") ||
    status.includes("full") ||
    status.includes("finished") ||
    status.includes("played") ||
    status.includes("half") ||
    status.includes("live") ||
    (!!(m.localteam || m.visitorteam || m.hometeam || m.awayteam))
  );
};

export function buildMatchweekModel(allMatches: AnyMatch[]) {
  const matches = (allMatches ?? []).filter((m) => m && typeof m === "object" && isFinishedOrScheduled(m));

  const matchesByRound: Record<string, AnyMatch[]> = {};
  for (const m of matches) {
    const n = extractRoundNumber(m);
    if (!n) continue;

    const key = `MW${n}`;
    if (!matchesByRound[key]) matchesByRound[key] = [];
    matchesByRound[key].push(m);
  }

  const rounds = Object.keys(matchesByRound)
    .map((k) => ({ k, n: toInt(k.replace("MW", "")) ?? 0 }))
    .filter((x) => x.n > 0)
    .sort((a, b) => a.n - b.n)
    .map((x) => x.k);

  let defaultSelectedRound = rounds[rounds.length - 1] ?? null;

  const hasScheduled = (m: AnyMatch) => {
    const status = String(m["@status"] ?? m.status ?? "").toLowerCase();
    return status.includes("scheduled") || status.includes("not started") || status.includes("fixture");
  };

  for (let i = rounds.length - 1; i >= 0; i--) {
    const r = rounds[i];
    const arr = matchesByRound[r] ?? [];
    if (arr.some(hasScheduled)) {
      defaultSelectedRound = r;
      break;
    }
  }

  for (const r of rounds) {
    matchesByRound[r].sort((a, b) => {
      const A = extractMatchDateTime(a);
      const B = extractMatchDateTime(b);
      const adt = `${A.date ?? ""} ${A.time ?? ""}`.trim();
      const bdt = `${B.date ?? ""} ${B.time ?? ""}`.trim();
      return adt.localeCompare(bdt);
    });
  }

  const getRoundIndex = (roundKey: string) => rounds.indexOf(roundKey);

  const getPrevRound = (roundKey: string) => {
    const idx = getRoundIndex(roundKey);
    if (idx <= 0) return null;
    return rounds[idx - 1];
  };

  const getNextRound = (roundKey: string) => {
    const idx = getRoundIndex(roundKey);
    if (idx < 0 || idx >= rounds.length - 1) return null;
    return rounds[idx + 1];
  };

  const roundLabel = (roundKey: string, labelPrefix = "Matchweek") => {
    const n = toInt(roundKey.replace("MW", ""));
    return `${labelPrefix} ${n ?? ""}`.trim();
  };

  return {
    rounds,
    matchesByRound,
    defaultSelectedRound,
    getPrevRound,
    getNextRound,
    roundLabel,
  };
}
