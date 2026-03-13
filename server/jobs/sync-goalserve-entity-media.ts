import { isNotNull } from "drizzle-orm";
import { db } from "../db";
import { competitions, teams } from "@shared/schema";
import { goalserveFetch } from "../integrations/goalserve/client";
import { ingestEntityMediaFromBuffer, ingestEntityMediaFromUrl } from "../lib/entity-media-service";
import { jobFetch } from "../lib/job-observability";
import { getJobRunId } from "../lib/job-context";

const GOALSERVE_ASSET_HOST = "https://www.goalserve.com";
const GOALSERVE_LOGOTIPS_BASE =
  (process.env.GOALSERVE_LOGOTIPS_BASE_URL ?? "http://data2.goalserve.com:8084/api/v1/logotips/soccer").replace(/\/$/, "");
const GOALSERVE_FEED_BASE = "https://www.goalserve.com/getfeed";
const GOALSERVE_MIN_REQUEST_INTERVAL_MS = 1000;
const LOGOTIPS_BATCH_SIZE = Math.max(1, parseInt(process.env.GOALSERVE_LOGOTIPS_BATCH_SIZE ?? "30", 10));
let lastGoalserveRequestAtMs = 0;

interface GoalserveTeamMediaSyncResult {
  ok: boolean;
  leagueId: string;
  scanned: number;
  ingested: number;
  ingestedFromLogotips: number;
  ingestedFromTeamProfile: number;
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
  ingestedFromLogotips: number;
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

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

async function goalserveRateLimitedRequest(url: string): Promise<Response> {
  const elapsed = Date.now() - lastGoalserveRequestAtMs;
  if (elapsed < GOALSERVE_MIN_REQUEST_INTERVAL_MS) {
    await new Promise((resolve) => setTimeout(resolve, GOALSERVE_MIN_REQUEST_INTERVAL_MS - elapsed));
  }
  lastGoalserveRequestAtMs = Date.now();
  return jobFetch(getJobRunId() ?? undefined, {
    provider: "goalserve",
    url,
    method: "GET",
    timeoutMs: 30_000,
  });
}

function buildGoalserveFeedUrl(path: string): string | null {
  const key = process.env.GOALSERVE_FEED_KEY;
  if (!key) return null;
  const jsonParam = path.includes("?") ? "&json=1" : "?json=1";
  return `${GOALSERVE_FEED_BASE}/${key}/${path}${jsonParam}`;
}

function extractCandidateImageUrls(node: unknown, out = new Set<string>(), visited = new WeakSet<object>()): Set<string> {
  if (typeof node === "string") {
    const normalized = normalizeSourceUrl(node);
    if (normalized) out.add(normalized);
    return out;
  }
  if (!node || typeof node !== "object") return out;
  if (visited.has(node as object)) return out;
  visited.add(node as object);
  if (Array.isArray(node)) {
    for (const item of node) extractCandidateImageUrls(item, out, visited);
    return out;
  }
  const obj = node as Record<string, unknown>;
  for (const value of Object.values(obj)) {
    extractCandidateImageUrls(value, out, visited);
  }
  return out;
}

function tryReadImageFromObject(node: unknown): string | null {
  if (!node || typeof node !== "object") return null;
  const obj = node as Record<string, unknown>;
  const keys = [
    "logo",
    "logo_url",
    "crest",
    "crest_url",
    "badge",
    "badge_url",
    "image",
    "image_url",
    "img",
    "url",
    "href",
    "src",
    "@logo",
    "@logo_url",
    "@crest",
    "@crest_url",
    "@badge",
    "@badge_url",
    "@image",
    "@image_url",
    "@url",
    "@href",
    "@src",
  ];
  for (const key of keys) {
    const value = obj[key];
    if (typeof value === "string") {
      const normalized = normalizeSourceUrl(value);
      if (normalized) return normalized;
    }
  }
  for (const [key, value] of Object.entries(obj)) {
    if (!/(logo|crest|badge|image|img|emblem|icon)/i.test(key)) continue;
    if (typeof value !== "string") continue;
    const normalized = normalizeSourceUrl(value);
    if (normalized) return normalized;
  }
  return null;
}

function readGoalserveId(node: Record<string, unknown>): string {
  return String(node["@id"] ?? node.id ?? "").trim();
}

async function fetchLogotipsTeamImageMap(goalserveTeamIds: string[]): Promise<Map<string, string>> {
  const key = process.env.GOALSERVE_FEED_KEY;
  if (!key || goalserveTeamIds.length === 0) return new Map();

  const byTeamId = new Map<string, string>();
  const batches = chunk(goalserveTeamIds, LOGOTIPS_BATCH_SIZE);

  for (const batchIds of batches) {
    const url = `${GOALSERVE_LOGOTIPS_BASE}/teams?k=${encodeURIComponent(key)}&ids=${encodeURIComponent(batchIds.join(","))}`;
    try {
      const res = await goalserveRateLimitedRequest(url);
      if (!res.ok) continue;
      const payload = await res.json().catch(() => null);
      if (!payload) continue;

      const records: Record<string, unknown>[] = Array.isArray((payload as any)?.data)
        ? (payload as any).data
        : Array.isArray((payload as any)?.results)
          ? (payload as any).results
          : [];

      for (const record of records) {
        const id = String(record.id ?? record.team_id ?? record["@id"] ?? record["@team_id"] ?? "").trim();
        if (!id) continue;
        const image = tryReadImageFromObject(record);
        if (image) byTeamId.set(id, image);
      }

      if (batchIds.length === 1 && !byTeamId.has(batchIds[0])) {
        const firstAnyImage = Array.from(extractCandidateImageUrls(payload))[0];
        if (firstAnyImage) byTeamId.set(batchIds[0], firstAnyImage);
      }
    } catch {
      // allow fallback path
    }
  }

  return byTeamId;
}

async function fetchLogotipsCompetitionImageMap(goalserveLeagueIds: string[]): Promise<Map<string, string>> {
  const key = process.env.GOALSERVE_FEED_KEY;
  if (!key || goalserveLeagueIds.length === 0) return new Map();

  const byLeagueId = new Map<string, string>();
  const batches = chunk(goalserveLeagueIds, LOGOTIPS_BATCH_SIZE);

  for (const batchIds of batches) {
    const url = `${GOALSERVE_LOGOTIPS_BASE}/leagues?k=${encodeURIComponent(key)}&ids=${encodeURIComponent(batchIds.join(","))}`;
    try {
      const res = await goalserveRateLimitedRequest(url);
      if (!res.ok) continue;
      const payload = await res.json().catch(() => null);
      if (!payload) continue;

      const records: Record<string, unknown>[] = Array.isArray((payload as any)?.data)
        ? (payload as any).data
        : Array.isArray((payload as any)?.results)
          ? (payload as any).results
          : [];

      for (const record of records) {
        const id = String(
          record.id ??
          record.league_id ??
          record.competition_id ??
          record["@id"] ??
          record["@league_id"] ??
          record["@competition_id"] ??
          "",
        ).trim();
        if (!id) continue;
        const image = tryReadImageFromObject(record);
        if (image) byLeagueId.set(id, image);
      }

      if (batchIds.length === 1 && !byLeagueId.has(batchIds[0])) {
        const firstAnyImage = Array.from(extractCandidateImageUrls(payload))[0];
        if (firstAnyImage) byLeagueId.set(batchIds[0], firstAnyImage);
      }
    } catch {
      // continue with remaining batches
    }
  }

  return byLeagueId;
}

async function fetchTeamProfileBase64Image(goalserveTeamId: string): Promise<string | null> {
  try {
    const url = buildGoalserveFeedUrl(`soccerstats/team/${goalserveTeamId}`);
    if (!url) return null;
    const res = await goalserveRateLimitedRequest(url);
    if (!res.ok) return null;
    const response = await res.json().catch(() => null);
    if (!response) return null;
    const queue: unknown[] = [response];
    while (queue.length > 0) {
      const node = queue.shift();
      if (!node || typeof node !== "object") continue;
      if (Array.isArray(node)) {
        for (const item of node) queue.push(item);
        continue;
      }
      const obj = node as Record<string, unknown>;
      if (typeof obj.image === "string" && obj.image.trim()) return obj.image;
      if (typeof obj["@image"] === "string" && obj["@image"].trim()) return obj["@image"] as string;
      for (const value of Object.values(obj)) queue.push(value);
    }
  } catch {
    // swallow and return null
  }
  return null;
}

function decodeBase64Image(raw: string): { buffer: Buffer; mimeType: string; formatHint: string } | null {
  const value = raw.trim();
  if (!value) return null;

  const uriMatch = value.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (uriMatch) {
    const mimeType = uriMatch[1].toLowerCase();
    const payload = uriMatch[2];
    try {
      const buffer = Buffer.from(payload, "base64");
      if (!buffer.length) return null;
      const formatHint = mimeType.includes("png") ? "png" : mimeType.includes("webp") ? "webp" : mimeType.includes("svg") ? "svg" : "jpg";
      return { buffer, mimeType, formatHint };
    } catch {
      return null;
    }
  }

  try {
    const buffer = Buffer.from(value, "base64");
    if (!buffer.length) return null;
    return { buffer, mimeType: "image/jpeg", formatHint: "jpg" };
  } catch {
    return null;
  }
}

export async function syncGoalserveTeamMediaByLeague(leagueId: string): Promise<GoalserveTeamMediaSyncResult> {
  const result: GoalserveTeamMediaSyncResult = {
    ok: true,
    leagueId,
    scanned: 0,
    ingested: 0,
    ingestedFromLogotips: 0,
    ingestedFromTeamProfile: 0,
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

    const scopedGoalserveIds = Array.from(
      new Set(feedTeams.map((n) => readGoalserveId(n)).filter((id) => id && dbByGoalserveId.has(id))),
    );
    const logotipsMap = await fetchLogotipsTeamImageMap(scopedGoalserveIds);

    for (const teamNode of feedTeams) {
      const gsId = readGoalserveId(teamNode);
      if (!gsId || !dbByGoalserveId.has(gsId)) {
        result.skippedMissingTeam++;
        continue;
      }
      const entityId = dbByGoalserveId.get(gsId)!;

      const logotipUrl = logotipsMap.get(gsId) ?? null;
      if (logotipUrl) {
        const ingest = await ingestEntityMediaFromUrl({
          entityType: "team",
          entityId,
          mediaRole: "crest",
          sourceSystem: "goalserve",
          sourceUrl: logotipUrl,
          sourceRef: `goalserve:logotips:team:${gsId}`,
          makePrimary: true,
        });

        if (!ingest.ok) {
          result.failed++;
          if (ingest.error) result.errors.push(`team ${gsId} (logotips): ${ingest.error}`);
        } else if (ingest.unchanged) {
          result.unchanged++;
          continue;
        } else {
          result.ingested++;
          result.ingestedFromLogotips++;
          continue;
        }
      }

      const profileImageRaw = await fetchTeamProfileBase64Image(gsId);
      const decoded = profileImageRaw ? decodeBase64Image(profileImageRaw) : null;
      if (!decoded) {
        result.skippedMissingImage++;
        continue;
      }

      const ingestFromProfile = await ingestEntityMediaFromBuffer({
        entityType: "team",
        entityId,
        mediaRole: "crest",
        sourceSystem: "goalserve",
        sourceRef: `goalserve:soccerstats:team:${gsId}`,
        sourceFormatHint: decoded.formatHint,
        sourceMimeTypeHint: decoded.mimeType,
        makePrimary: true,
        originalBuffer: decoded.buffer,
      });

      if (!ingestFromProfile.ok) {
        result.failed++;
        if (ingestFromProfile.error) result.errors.push(`team ${gsId} (soccerstats): ${ingestFromProfile.error}`);
        continue;
      }
      if (ingestFromProfile.unchanged) {
        result.unchanged++;
      } else {
        result.ingested++;
        result.ingestedFromTeamProfile++;
      }
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
    ingestedFromLogotips: 0,
    unchanged: 0,
    failed: 0,
    skippedMissingCompetition: 0,
    skippedMissingImage: 0,
    errors: [],
  };

  try {
    const dbComps = await db
      .select({
        id: competitions.id,
        goalserveCompetitionId: competitions.goalserveCompetitionId,
      })
      .from(competitions)
      .where(isNotNull(competitions.goalserveCompetitionId));

    const goalserveIds = Array.from(new Set(dbComps.map((c) => String(c.goalserveCompetitionId)).filter(Boolean)));
    result.scanned = goalserveIds.length;

    const dbByGoalserveId = new Map(
      dbComps
        .filter((c) => !!c.goalserveCompetitionId)
        .map((c) => [String(c.goalserveCompetitionId), c.id]),
    );

    const logotipsByLeagueId = await fetchLogotipsCompetitionImageMap(goalserveIds);

    for (const goalserveLeagueId of goalserveIds) {
      const dbCompetitionId = dbByGoalserveId.get(goalserveLeagueId);
      if (!dbCompetitionId) {
        result.skippedMissingCompetition++;
        continue;
      }

      const sourceUrl = logotipsByLeagueId.get(goalserveLeagueId) ?? null;
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
        sourceRef: `goalserve:logotips:league:${goalserveLeagueId}`,
        makePrimary: true,
      });

      if (!ingest.ok) {
        result.failed++;
        if (ingest.error) result.errors.push(`competition ${goalserveLeagueId}: ${ingest.error}`);
        continue;
      }

      if (ingest.unchanged) result.unchanged++;
      else {
        result.ingested++;
        result.ingestedFromLogotips++;
      }
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
        ingestedFromLogotips: 0,
        ingestedFromTeamProfile: 0,
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
