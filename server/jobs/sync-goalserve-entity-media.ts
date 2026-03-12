import { inArray, isNotNull } from "drizzle-orm";
import { db } from "../db";
import { competitions, teams } from "@shared/schema";
import { goalserveFetch } from "../integrations/goalserve/client";
import { ingestEntityMediaFromUrl } from "../lib/entity-media-service";

const GOALSERVE_ASSET_HOST = "https://www.goalserve.com";

interface GoalserveTeamMediaSyncResult {
  ok: boolean;
  leagueId: string;
  scanned: number;
  ingested: number;
  unchanged: number;
  failed: number;
  skippedMissingTeam: number;
  skippedMissingImage: number;
  errors: string[];
}

interface GoalserveCompetitionMediaSyncResult {
  ok: boolean;
  scanned: number;
  ingested: number;
  unchanged: number;
  failed: number;
  skippedMissingCompetition: number;
  skippedMissingImage: number;
  errors: string[];
}

function normalizeSourceUrl(rawUrl: string): string | null {
  const value = rawUrl.trim();
  if (!value) return null;
  if (value.startsWith("data:")) return null;
  if (value.startsWith("http://") || value.startsWith("https://")) return value;
  if (value.startsWith("//")) return `https:${value}`;
  if (value.startsWith("/")) return `${GOALSERVE_ASSET_HOST}${value}`;
  if (/^[a-z0-9/_\-\.]+\.(png|jpg|jpeg|gif|webp|svg)$/i.test(value)) {
    return `${GOALSERVE_ASSET_HOST}/${value.replace(/^\//, "")}`;
  }
  return null;
}

function tryExtractString(node: unknown): string | null {
  if (typeof node === "string") return node;
  if (!node || typeof node !== "object") return null;
  const obj = node as Record<string, unknown>;
  const directKeys = ["url", "href", "src", "path", "value", "@url", "@href", "@src"];
  for (const key of directKeys) {
    const candidate = obj[key];
    if (typeof candidate === "string" && candidate.trim()) return candidate;
  }
  return null;
}

function extractImageCandidateFromObject(node: unknown): string | null {
  if (!node || typeof node !== "object") return null;
  const obj = node as Record<string, unknown>;
  const preferredKeys = [
    "logo",
    "logo_url",
    "crest",
    "crest_url",
    "badge",
    "badge_url",
    "image",
    "image_url",
    "img",
    "@logo",
    "@crest",
    "@badge",
    "@image",
    "@logo_url",
    "@crest_url",
    "@badge_url",
    "@image_url",
  ];

  for (const key of preferredKeys) {
    const candidate = tryExtractString(obj[key]);
    if (!candidate) continue;
    const normalized = normalizeSourceUrl(candidate);
    if (normalized) return normalized;
  }

  // Fallback: shallow scan any likely media-ish key.
  for (const [key, value] of Object.entries(obj)) {
    const k = key.toLowerCase();
    if (!/(logo|crest|badge|image|img|emblem|icon)/.test(k)) continue;
    const candidate = tryExtractString(value);
    if (!candidate) continue;
    const normalized = normalizeSourceUrl(candidate);
    if (normalized) return normalized;
  }

  return null;
}

type NormalizedCompetitionNode = {
  goalserveCompetitionId: string;
  rawNode: Record<string, unknown>;
};

function extractCompetitionNodes(obj: unknown, out: NormalizedCompetitionNode[], visited = new WeakSet<object>()): void {
  if (!obj || typeof obj !== "object") return;
  if (visited.has(obj as object)) return;
  visited.add(obj as object);

  if (Array.isArray(obj)) {
    for (const item of obj) extractCompetitionNodes(item, out, visited);
    return;
  }

  const node = obj as Record<string, unknown>;
  const attrs = (node.$ as Record<string, unknown> | undefined) ?? {};
  const idRaw =
    node.id ??
    node.league_id ??
    node.competition_id ??
    node["@id"] ??
    node["@league_id"] ??
    node["@competition_id"] ??
    attrs.id ??
    attrs.league_id ??
    attrs.competition_id;

  if (idRaw != null) {
    out.push({
      goalserveCompetitionId: String(idRaw),
      rawNode: node,
    });
  }

  for (const value of Object.values(node)) {
    extractCompetitionNodes(value, out, visited);
  }
}

export async function syncGoalserveTeamMediaByLeague(leagueId: string): Promise<GoalserveTeamMediaSyncResult> {
  const result: GoalserveTeamMediaSyncResult = {
    ok: true,
    leagueId,
    scanned: 0,
    ingested: 0,
    unchanged: 0,
    failed: 0,
    skippedMissingTeam: 0,
    skippedMissingImage: 0,
    errors: [],
  };

  try {
    const response = await goalserveFetch(`soccerleague/${leagueId}`);
    const rawTeams = response?.league?.team;
    const feedTeams: Record<string, unknown>[] = Array.isArray(rawTeams) ? rawTeams : rawTeams ? [rawTeams] : [];
    result.scanned = feedTeams.length;

    const dbTeams = await db
      .select({ id: teams.id, goalserveTeamId: teams.goalserveTeamId })
      .from(teams)
      .where(isNotNull(teams.goalserveTeamId));
    const dbByGoalserveId = new Map(dbTeams.map((t) => [String(t.goalserveTeamId), t.id]));

    for (const teamNode of feedTeams) {
      const gsId = String((teamNode["@id"] as string | undefined) ?? (teamNode.id as string | undefined) ?? "").trim();
      if (!gsId || !dbByGoalserveId.has(gsId)) {
        result.skippedMissingTeam++;
        continue;
      }

      const sourceUrl = extractImageCandidateFromObject(teamNode);
      if (!sourceUrl) {
        result.skippedMissingImage++;
        continue;
      }

      const ingest = await ingestEntityMediaFromUrl({
        entityType: "team",
        entityId: dbByGoalserveId.get(gsId)!,
        mediaRole: "crest",
        sourceSystem: "goalserve",
        sourceUrl,
        sourceRef: `goalserve:team:${gsId}`,
        makePrimary: true,
      });

      if (!ingest.ok) {
        result.failed++;
        if (ingest.error) result.errors.push(`team ${gsId}: ${ingest.error}`);
        continue;
      }

      if (ingest.unchanged) result.unchanged++;
      else result.ingested++;
    }
  } catch (err) {
    result.ok = false;
    result.errors.push(err instanceof Error ? err.message : String(err));
  }

  return result;
}

export async function syncGoalserveCompetitionMedia(): Promise<GoalserveCompetitionMediaSyncResult> {
  const result: GoalserveCompetitionMediaSyncResult = {
    ok: true,
    scanned: 0,
    ingested: 0,
    unchanged: 0,
    failed: 0,
    skippedMissingCompetition: 0,
    skippedMissingImage: 0,
    errors: [],
  };

  try {
    const response = await goalserveFetch("soccerfixtures/data/mapping");
    const nodes: NormalizedCompetitionNode[] = [];
    extractCompetitionNodes(response, nodes);

    const deduped = Array.from(
      new Map(nodes.map((n) => [n.goalserveCompetitionId, n])).values(),
    );
    result.scanned = deduped.length;

    const goalserveIds = deduped.map((d) => d.goalserveCompetitionId);
    const dbComps = goalserveIds.length
      ? await db
          .select({
            id: competitions.id,
            goalserveCompetitionId: competitions.goalserveCompetitionId,
          })
          .from(competitions)
          .where(inArray(competitions.goalserveCompetitionId, goalserveIds))
      : [];
    const dbByGoalserveId = new Map(
      dbComps
        .filter((c) => !!c.goalserveCompetitionId)
        .map((c) => [String(c.goalserveCompetitionId), c.id]),
    );

    for (const node of deduped) {
      const dbCompetitionId = dbByGoalserveId.get(node.goalserveCompetitionId);
      if (!dbCompetitionId) {
        result.skippedMissingCompetition++;
        continue;
      }

      const sourceUrl = extractImageCandidateFromObject(node.rawNode);
      if (!sourceUrl) {
        result.skippedMissingImage++;
        continue;
      }

      const ingest = await ingestEntityMediaFromUrl({
        entityType: "competition",
        entityId: dbCompetitionId,
        mediaRole: "logo",
        sourceSystem: "goalserve",
        sourceUrl,
        sourceRef: `goalserve:competition:${node.goalserveCompetitionId}`,
        makePrimary: true,
      });

      if (!ingest.ok) {
        result.failed++;
        if (ingest.error) result.errors.push(`competition ${node.goalserveCompetitionId}: ${ingest.error}`);
        continue;
      }

      if (ingest.unchanged) result.unchanged++;
      else result.ingested++;
    }
  } catch (err) {
    result.ok = false;
    result.errors.push(err instanceof Error ? err.message : String(err));
  }

  return result;
}

export async function syncGoalserveEntityMedia(params: {
  leagueId?: string;
  includeTeams?: boolean;
  includeCompetitions?: boolean;
}): Promise<{
  ok: boolean;
  teams?: GoalserveTeamMediaSyncResult;
  competitions?: GoalserveCompetitionMediaSyncResult;
}> {
  const includeTeams = params.includeTeams ?? true;
  const includeCompetitions = params.includeCompetitions ?? true;
  const output: {
    ok: boolean;
    teams?: GoalserveTeamMediaSyncResult;
    competitions?: GoalserveCompetitionMediaSyncResult;
  } = { ok: true };

  if (includeCompetitions) {
    output.competitions = await syncGoalserveCompetitionMedia();
    if (!output.competitions.ok) output.ok = false;
  }

  if (includeTeams) {
    if (!params.leagueId) {
      output.ok = false;
      output.teams = {
        ok: false,
        leagueId: "",
        scanned: 0,
        ingested: 0,
        unchanged: 0,
        failed: 0,
        skippedMissingTeam: 0,
        skippedMissingImage: 0,
        errors: ["leagueId is required for team media sync"],
      };
    } else {
      output.teams = await syncGoalserveTeamMediaByLeague(params.leagueId);
      if (!output.teams.ok) output.ok = false;
    }
  }

  return output;
}
