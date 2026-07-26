/**
 * Sync special / exhibition competitions that are not covered by is_priority leagues
 * or the filtered Club Friendlies feed.
 *
 * Discovery is mapping-driven (name patterns) plus a small stable allow-list so
 * competitions like Emirates Cup are re-checked when Goalserve publishes a new season.
 * No club-specific logic.
 */
import { goalserveFetch } from "../integrations/goalserve/client";
import { syncGoalserveMatches } from "./sync-goalserve-matches";
import {
  CLUB_FRIENDLIES_GOALSERVE_LEAGUE_ID,
  ENGLAND_SUPER_CUP_GOALSERVE_LEAGUE_ID,
  syncGoalserveEnglandSuperCup,
} from "./sync-goalserve-club-friendlies";

/** Stable IDs always refreshed even if mapping name/season lags. */
export const SPECIAL_COMPETITION_ALLOWLIST = [
  ENGLAND_SUPER_CUP_GOALSERVE_LEAGUE_ID, // England Super Cup / Community Shield
  "1759", // Emirates Cup (World) — seasons endpoint currently lists through 2025 only
] as const;

const MAPPING_NAME_PATTERNS: RegExp[] = [
  /^Emirates Cup$/i,
  /^Community Shield$/i,
];

function asArray<T>(v: T | T[] | null | undefined): T[] {
  if (v == null) return [];
  return Array.isArray(v) ? v : [v];
}

function collectMappingCompetitions(node: unknown, out: Array<{ id: string; name: string; country: string }> = []): typeof out {
  if (!node || typeof node !== "object") return out;
  if (Array.isArray(node)) {
    for (const item of node) collectMappingCompetitions(item, out);
    return out;
  }
  const obj = node as Record<string, unknown>;
  const id = String(obj["@id"] ?? obj.id ?? "").trim();
  const name = String(obj["@name"] ?? obj.name ?? "").trim();
  const country = String(obj["@country"] ?? obj.country ?? "").trim();
  if (id && name) out.push({ id, name, country });
  for (const value of Object.values(obj)) collectMappingCompetitions(value, out);
  return out;
}

export async function discoverSpecialCompetitionIdsFromMapping(
  runId?: string,
): Promise<Array<{ id: string; name: string; country: string; reason: string }>> {
  const mapping = await goalserveFetch("soccerfixtures/data/mapping", runId);
  const comps = collectMappingCompetitions(mapping);
  const seen = new Set<string>();
  const found: Array<{ id: string; name: string; country: string; reason: string }> = [];

  for (const comp of comps) {
    if (seen.has(comp.id)) continue;
    if (comp.id === CLUB_FRIENDLIES_GOALSERVE_LEAGUE_ID) continue;
    const matched = MAPPING_NAME_PATTERNS.find((re) => re.test(comp.name));
    if (!matched) continue;
    // Prefer World / England for these exhibition cups to avoid unrelated homonyms.
    if (
      comp.country &&
      !/^(World|England)$/i.test(comp.country) &&
      !/^Emirates Cup$/i.test(comp.name)
    ) {
      continue;
    }
    seen.add(comp.id);
    found.push({ ...comp, reason: `mapping name ~ ${matched}` });
  }

  return found;
}

export type SpecialCompetitionSyncResult = {
  ok: boolean;
  discovered: Array<{ id: string; name: string; country: string; reason: string }>;
  synced: Array<Awaited<ReturnType<typeof syncGoalserveMatches>> & { source: string }>;
  errors: string[];
};

export async function syncGoalserveSpecialCompetitions(
  runId?: string,
): Promise<SpecialCompetitionSyncResult> {
  const errors: string[] = [];
  let discovered: SpecialCompetitionSyncResult["discovered"] = [];
  try {
    discovered = await discoverSpecialCompetitionIdsFromMapping(runId);
  } catch (e) {
    errors.push(`mapping discovery failed: ${e instanceof Error ? e.message : String(e)}`);
  }

  const toSync = new Map<string, string>();
  for (const id of SPECIAL_COMPETITION_ALLOWLIST) {
    toSync.set(id, "allowlist");
  }
  for (const row of discovered) {
    if (!toSync.has(row.id)) toSync.set(row.id, row.reason);
  }

  const synced: SpecialCompetitionSyncResult["synced"] = [];

  for (const [leagueId, source] of Array.from(toSync.entries())) {
    try {
      const result =
        leagueId === ENGLAND_SUPER_CUP_GOALSERVE_LEAGUE_ID
          ? await syncGoalserveEnglandSuperCup(undefined, runId)
          : await syncGoalserveMatches(leagueId, undefined, runId);
      synced.push({ ...result, source });
      if (!result.ok && result.error) errors.push(`league ${leagueId}: ${result.error}`);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      errors.push(`league ${leagueId}: ${message}`);
      synced.push({
        ok: false,
        leagueId,
        totalFromGoalserve: 0,
        inserted: 0,
        updated: 0,
        skippedNoStaticId: 0,
        skippedNoKickoff: 0,
        competitionId: null,
        seasonKey: null,
        error: message,
        source,
      });
    }
  }

  return {
    ok: errors.length === 0,
    discovered,
    synced,
    errors,
  };
}
