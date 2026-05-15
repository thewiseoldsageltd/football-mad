/**
 * Goalserve cup fixture tree traversal for /api/cup/progress.
 * Aligned with extraction patterns in server/jobs/sync-goalserve-matches.ts (extractMatchesFromGoalserveResponse)
 * and standings XML parsing (week.match vs week.matches.match).
 */

export interface CupProgressMatchRef {
  m: any;
  defaultRound: string;
  branch: string;
}

export interface CollectCupProgressRefsResult {
  refs: CupProgressMatchRef[];
  debugLines: string[];
}

function toArray(item: any): any[] {
  if (item == null) return [];
  return Array.isArray(item) ? item : [item];
}

/** Match sync job: pull match id for deduplication */
function matchNodeId(m: any): string {
  if (!m || typeof m !== "object") return "";
  const id =
    m["@_id"] ??
    m["@id"] ??
    m.id ??
    m["@static_id"] ??
    m.static_id ??
    m["@fixture_id"] ??
    "";
  return String(id).trim();
}

function weekRoundLabel(week: any, fallback: string): string {
  const label =
    week?.["@name"] ??
    week?.name ??
    week?.["@round_name"] ??
    week?.["@number"] ??
    week?.number ??
    fallback;
  const s = String(label ?? "").trim();
  return s.length > 0 ? s : "Unknown Round";
}

function pushMatchesInto(
  refs: CupProgressMatchRef[],
  matches: any,
  defaultRound: string,
  branch: string,
  debug: { branchCounts: Map<string, number>; stages: Set<string>; weekLabels: Set<string>; roundLabels: Set<string> }
): void {
  const arr = toArray(matches);
  if (arr.length === 0) return;

  const dk = branchCountsKey(branch, defaultRound);
  debug.branchCounts.set(dk, (debug.branchCounts.get(dk) ?? 0) + arr.length);
  if (defaultRound && defaultRound !== "Unknown Round") {
    debug.roundLabels.add(defaultRound);
  }

  for (const m of arr) {
    refs.push({ m, defaultRound, branch });
  }
}

function branchCountsKey(branch: string, roundLabel: string): string {
  return `${branch}::${roundLabel}`;
}

/**
 * Normalize fetch payload so extractMatches-style paths see results.tournament / fixtures.league / scores.category.
 */
export function normalizeCupProgressPayload(raw: any): any {
  if (!raw) return raw;
  if (raw.results?.tournament != null || raw.results?.scores != null) return raw;
  if (raw.res?.fixtures != null) {
    return { ...raw, results: raw.res.fixtures };
  }
  return raw;
}

/**
 * Collect raw match refs from all known Goalserve shapes used by cups + league ingestion.
 * Overlapping branches may emit duplicates; caller should dedupe by matchNodeId.
 */
export function collectCupProgressMatchRefs(rawData: any, debugEnabled: boolean): CollectCupProgressRefsResult {
  const debugLines: string[] = [];
  const debugState = {
    branchCounts: new Map<string, number>(),
    stages: new Set<string>(),
    weekLabels: new Set<string>(),
    roundLabels: new Set<string>(),
  };

  const refs: CupProgressMatchRef[] = [];
  const data = normalizeCupProgressPayload(rawData);

  const recordStage = (stage: any) => {
    const n = String(stage?.["@name"] ?? stage?.name ?? "").trim();
    if (n) debugState.stages.add(n);
  };

  // ----- scores.category (mirror sync-goalserve-matches extractMatchesFromGoalserveResponse) -----
  if (data?.scores?.category) {
    const categories = toArray(data.scores.category);
    for (const cat of categories) {
      if (!cat?.league) continue;
      const leagues = toArray(cat.league);
      for (const lg of leagues) {
        const matchData = lg?.match ?? lg?.week;
        if (!matchData) continue;
        const weeks = toArray(matchData);
        const syntheticWeeks = weeks.map((item: any) => {
          if (item?.matches?.match || item?.match) return item;
          return { match: item };
        });
        const lgName = String(lg?.["@name"] ?? lg?.name ?? cat?.["@name"] ?? cat?.name ?? "Unknown");
        for (const item of syntheticWeeks) {
          const rn = weekRoundLabel(item, lgName);
          debugState.weekLabels.add(rn);
          pushMatchesInto(refs, item.match, rn, "scores.category.item.match", debugState);
          pushMatchesInto(refs, item.matches?.match, rn, "scores.category.item.matches.match", debugState);
        }
      }
    }
  }

  // ----- leagues.league -----
  if (data?.leagues?.league) {
    const ld = data.leagues.league;
    const weekData = ld?.week ?? ld?.match;
    if (weekData) {
      const leagueName = String(ld?.["@name"] ?? ld?.name ?? "Unknown");
      const weeks = toArray(weekData);
      for (const w of weeks) {
        const rn = weekRoundLabel(w, leagueName);
        debugState.weekLabels.add(rn);
        pushMatchesInto(refs, w.match, rn, "leagues.league.week.match", debugState);
        pushMatchesInto(refs, w.matches?.match, rn, "leagues.league.week.matches.match", debugState);
      }
    }
  }

  // ----- fixtures.league -----
  if (data?.fixtures?.league) {
    const ld = data.fixtures.league;
    const weekData = ld?.week ?? ld?.match;
    if (weekData) {
      const leagueName = String(ld?.["@name"] ?? ld?.name ?? "Unknown");
      const weeks = toArray(weekData);
      for (const w of weeks) {
        const rn = weekRoundLabel(w, leagueName);
        debugState.weekLabels.add(rn);
        pushMatchesInto(refs, w.match, rn, "fixtures.league.week.match", debugState);
        pushMatchesInto(refs, w.matches?.match, rn, "fixtures.league.week.matches.match", debugState);
      }
    }
  }

  // ----- results.tournament (cup docs: stage -> week -> match; stage -> match) -----
  const results = data?.results ?? data?.res?.fixtures;
  if (!results?.tournament) {
    if (debugEnabled) {
      debugLines.push("[CupProgressTree] No results.tournament after normalize");
    }
    return finalizeDebug(refs, debugLines, debugEnabled, debugState);
  }

  const tournaments = toArray(results.tournament);
  for (const tournament of tournaments) {
    const tournamentName = String(tournament?.["@name"] ?? tournament?.name ?? "");

    // tournament.week (sync prefers this when present — full tree under week)
    for (const week of toArray(tournament.week)) {
      const rn = weekRoundLabel(week, tournamentName);
      debugState.weekLabels.add(rn);
      pushMatchesInto(refs, week.match, rn, "tournament.week.match", debugState);
      pushMatchesInto(refs, week.matches?.match, rn, "tournament.week.matches.match", debugState);
    }

    // tournament.match (matches directly on tournament)
    pushMatchesInto(
      refs,
      tournament.match,
      tournamentName || "Unknown Round",
      "tournament.match",
      debugState
    );

    for (const stage of toArray(tournament.stage)) {
      recordStage(stage);
      const stageName = String(stage?.["@name"] ?? stage?.name ?? "");

      // stage.week — critical for multi-stage FA Cup style feeds
      for (const week of toArray(stage.week)) {
        const rn = weekRoundLabel(week, stageName || tournamentName);
        debugState.weekLabels.add(rn);
        pushMatchesInto(refs, week.match, rn, "stage.week.match", debugState);
        pushMatchesInto(refs, week.matches?.match, rn, "stage.week.matches.match", debugState);
      }

      // stage.round[].match
      for (const round of toArray(stage.round)) {
        const rn = String(
          round?.["@name"] ?? round?.name ?? (stageName || tournamentName || "Unknown Round")
        );
        debugState.roundLabels.add(rn);
        pushMatchesInto(refs, round.match, rn, "stage.round.match", debugState);
      }

      // stage.group[].match (sync flattens group matches)
      for (const grp of toArray(stage.group)) {
        const rn = String(grp?.["@name"] ?? grp?.name ?? (stageName || tournamentName || "Unknown Round"));
        pushMatchesInto(refs, grp.match, rn, "stage.group.match", debugState);
      }

      // stage.aggregate[].match
      for (const agg of toArray(stage.aggregate)) {
        const rn = String(agg?.["@name"] ?? agg?.name ?? (stageName || tournamentName || "Unknown Round"));
        debugState.roundLabels.add(rn);
        pushMatchesInto(refs, agg.match, rn, "stage.aggregate.match", debugState);
      }

      // stage.match — collect even when stage.week / stage.round exist (Goalserve varies by competition)
      pushMatchesInto(refs, stage.match, stageName || tournamentName || "Unknown Round", "stage.match", debugState);
    }
  }

  return finalizeDebug(refs, debugLines, debugEnabled, debugState);
}

function finalizeDebug(
  refs: CupProgressMatchRef[],
  debugLines: string[],
  debugEnabled: boolean,
  debugState: {
    branchCounts: Map<string, number>;
    stages: Set<string>;
    weekLabels: Set<string>;
    roundLabels: Set<string>;
  }
): CollectCupProgressRefsResult {
  if (!debugEnabled) {
    return { refs, debugLines };
  }

  debugLines.push(`[CupProgressTree] Total raw refs (before dedupe): ${refs.length}`);
  debugLines.push(`[CupProgressTree] Distinct stage names: ${debugState.stages.size}`);
  if (debugState.stages.size > 0) {
    debugLines.push(`[CupProgressTree] Stages: ${Array.from(debugState.stages).slice(0, 40).join(", ")}${debugState.stages.size > 40 ? "…" : ""}`);
  }
  debugLines.push(`[CupProgressTree] Sample week/round labels: ${[...Array.from(debugState.weekLabels), ...Array.from(debugState.roundLabels)].slice(0, 30).join(" | ")}`);

  const sortedBranches = Array.from(debugState.branchCounts.entries()).sort((a, b) => b[1] - a[1]);
  for (const [key, n] of sortedBranches.slice(0, 80)) {
    debugLines.push(`[CupProgressTree] branch ${key} → ${n} matches`);
  }
  if (sortedBranches.length > 80) {
    debugLines.push(`[CupProgressTree] … ${sortedBranches.length - 80} more branch keys omitted`);
  }

  return { refs, debugLines };
}

/** Deduplicate refs by Goalserve match id (first occurrence wins; anon fallback key if no id) */
export function dedupeCupProgressRefs(refs: CupProgressMatchRef[]): CupProgressMatchRef[] {
  const out: CupProgressMatchRef[] = [];
  const seen = new Set<string>();
  for (const ref of refs) {
    const id = matchNodeId(ref.m);
    const key = id.length > 0 ? id : `anon:${ref.branch}:${JSON.stringify(ref.m?.["@date"] ?? "")}:${ref.defaultRound}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(ref);
  }
  return out;
}
