import { and, eq, gt, inArray, isNotNull, isNull, or } from "drizzle-orm";
import { db } from "../db";
import { competitionTeamMemberships, competitions, managers, playerTeamMemberships, players, teamManagers, teams } from "@shared/schema";
import { goalserveFetch } from "../integrations/goalserve/client";
import { ingestEntityMediaFromBuffer, ingestEntityMediaFromUrl } from "../lib/entity-media-service";
import { jobFetch } from "../lib/job-observability";
import { getJobRunId } from "../lib/job-context";
import { MvpGraphBoundary } from "../lib/mvp-graph-boundary";

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
  ingestedFromLogotipsBase64: number;
  ingestedFromLogotipsUrl: number;
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
  ingestedFromLogotipsBase64: number;
  ingestedFromLogotipsUrl: number;
  unchanged: number;
  failed: number;
  skippedMissingCompetition: number;
  skippedMissingImage: number;
  errors: string[];
}

interface GoalservePersonMediaSyncResult {
  ok: boolean;
  scope: "premier_league" | "mvp";
  leagueId: string;
  entityType: "player" | "manager";
  dryRun: boolean;
  scanned: number;
  withGoalserveId: number;
  attempted: number;
  ingested: number;
  unchanged: number;
  failed: number;
  skippedMissingImage: number;
  skippedMissingGoalserveId: number;
  skippedUnsupportedGoalserveId: number;
  ingestedFromUrl: number;
  ingestedFromBase64: number;
  discoveredImageFields: string[];
  errors: string[];
}

interface LogotipsAssetSource {
  url: string | null;
  base64: string | null;
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

async function fetchLogotipsTeamImageMap(goalserveTeamIds: string[]): Promise<Map<string, LogotipsAssetSource>> {
  const key = process.env.GOALSERVE_FEED_KEY;
  if (!key || goalserveTeamIds.length === 0) return new Map();

  const byTeamId = new Map<string, LogotipsAssetSource>();
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
        const imageUrl = tryReadImageFromObject(record);
        const base64 = typeof record.base64 === "string" && record.base64.trim() ? record.base64 : null;
        if (imageUrl || base64) {
          byTeamId.set(id, { url: imageUrl, base64 });
        }
      }

      if (batchIds.length === 1 && !byTeamId.has(batchIds[0])) {
        const firstAnyImage = Array.from(extractCandidateImageUrls(payload))[0];
        if (firstAnyImage) byTeamId.set(batchIds[0], { url: firstAnyImage, base64: null });
      }
    } catch {
      // allow fallback path
    }
  }

  return byTeamId;
}

async function fetchLogotipsCompetitionImageMap(goalserveLeagueIds: string[]): Promise<Map<string, LogotipsAssetSource>> {
  const key = process.env.GOALSERVE_FEED_KEY;
  if (!key || goalserveLeagueIds.length === 0) return new Map();

  const byLeagueId = new Map<string, LogotipsAssetSource>();
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
        const imageUrl = tryReadImageFromObject(record);
        const base64 = typeof record.base64 === "string" && record.base64.trim() ? record.base64 : null;
        if (imageUrl || base64) {
          byLeagueId.set(id, { url: imageUrl, base64 });
        }
      }

      if (batchIds.length === 1 && !byLeagueId.has(batchIds[0])) {
        const firstAnyImage = Array.from(extractCandidateImageUrls(payload))[0];
        if (firstAnyImage) byLeagueId.set(batchIds[0], { url: firstAnyImage, base64: null });
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
    // Infer image type from common signatures where possible.
    if (buffer.length >= 8 && buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
      return { buffer, mimeType: "image/png", formatHint: "png" };
    }
    if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
      return { buffer, mimeType: "image/jpeg", formatHint: "jpg" };
    }
    if (
      buffer.length >= 12 &&
      buffer[0] === 0x52 &&
      buffer[1] === 0x49 &&
      buffer[2] === 0x46 &&
      buffer[3] === 0x46 &&
      buffer[8] === 0x57 &&
      buffer[9] === 0x45 &&
      buffer[10] === 0x42 &&
      buffer[11] === 0x50
    ) {
      return { buffer, mimeType: "image/webp", formatHint: "webp" };
    }
    if (buffer.length >= 6) {
      const ascii = buffer.slice(0, 6).toString("ascii");
      if (ascii === "GIF87a" || ascii === "GIF89a") {
        return { buffer, mimeType: "image/gif", formatHint: "gif" };
      }
    }
    const prefix = buffer.slice(0, 200).toString("utf8").trimStart();
    if (prefix.startsWith("<svg") || prefix.startsWith("<?xml")) {
      return { buffer, mimeType: "image/svg+xml", formatHint: "svg" };
    }
    return { buffer, mimeType: "image/jpeg", formatHint: "jpg" };
  } catch {
    return null;
  }
}

type HeadshotCandidate = {
  url: string | null;
  base64: string | null;
  fieldPath: string | null;
};

const HEADSHOT_FIELD_KEYWORDS = [
  "headshot",
  "photo",
  "portrait",
  "avatar",
  "image",
  "img",
  "thumb",
  "picture",
  "pic",
  "base64",
];

function extractGoalservePersonImageFastPath(payload: unknown): HeadshotCandidate | null {
  if (!payload || typeof payload !== "object") return null;

  const playersNode = (payload as Record<string, unknown>).players;
  if (!playersNode || typeof playersNode !== "object") return null;

  const playerNode = (playersNode as Record<string, unknown>).player;
  if (!playerNode) return null;

  if (Array.isArray(playerNode)) {
    for (const row of playerNode) {
      if (!row || typeof row !== "object") continue;
      const image = (row as Record<string, unknown>).image;
      if (typeof image === "string" && image.trim()) {
        return { url: null, base64: image, fieldPath: "$.players.player.image" };
      }
    }
    return null;
  }

  if (typeof playerNode === "object") {
    const image = (playerNode as Record<string, unknown>).image;
    if (typeof image === "string" && image.trim()) {
      return { url: null, base64: image, fieldPath: "$.players.player.image" };
    }
  }

  return null;
}

function collectHeadshotCandidate(node: unknown): HeadshotCandidate {
  const queue: Array<{ value: unknown; path: string }> = [{ value: node, path: "$" }];
  const seen = new WeakSet<object>();

  while (queue.length > 0) {
    const current = queue.shift()!;
    const value = current.value;
    if (!value || typeof value !== "object") continue;
    if (seen.has(value as object)) continue;
    seen.add(value as object);

    if (Array.isArray(value)) {
      value.forEach((item, idx) => queue.push({ value: item, path: `${current.path}[${idx}]` }));
      continue;
    }

    const obj = value as Record<string, unknown>;
    for (const [rawKey, child] of Object.entries(obj)) {
      const key = String(rawKey);
      const normalizedKey = key.replace(/^@/, "").toLowerCase();
      const childPath = `${current.path}.${key}`;

      if (typeof child === "string" && child.trim()) {
        const url = normalizeSourceUrl(child);
        if (url && HEADSHOT_FIELD_KEYWORDS.some((term) => normalizedKey.includes(term))) {
          return { url, base64: null, fieldPath: childPath };
        }
        const decoded = decodeBase64Image(child);
        if (decoded && HEADSHOT_FIELD_KEYWORDS.some((term) => normalizedKey.includes(term))) {
          return { url: null, base64: child, fieldPath: childPath };
        }
      }
    }

    for (const [rawKey, child] of Object.entries(obj)) {
      const key = String(rawKey);
      const childPath = `${current.path}.${key}`;
      if (typeof child === "string" && child.trim()) {
        const url = normalizeSourceUrl(child);
        if (url) return { url, base64: null, fieldPath: childPath };
      } else if (child && typeof child === "object") {
        queue.push({ value: child, path: childPath });
      }
    }
  }

  return { url: null, base64: null, fieldPath: null };
}

async function fetchGoalserveJson(path: string): Promise<unknown | null> {
  try {
    const url = buildGoalserveFeedUrl(path);
    if (!url) return null;
    const res = await goalserveRateLimitedRequest(url);
    if (!res.ok) return null;
    return await res.json().catch(() => null);
  } catch {
    return null;
  }
}

async function fetchGoalserveManagerProfile(goalserveManagerId: string): Promise<unknown | null> {
  // Goalserve manager IDs typically resolve via soccerstats/coach/:id.
  const paths = [`soccerstats/coach/${goalserveManagerId}`, `soccerstats/manager/${goalserveManagerId}`];
  for (const path of paths) {
    const payload = await fetchGoalserveJson(path);
    if (payload) return payload;
  }
  return null;
}

async function ingestTeamMediaForScope(
  scopedTeams: Array<{ entityId: string; goalserveTeamId: string }>,
  result: GoalserveTeamMediaSyncResult,
): Promise<void> {
  if (scopedTeams.length === 0) return;

  const logotipsMap = await fetchLogotipsTeamImageMap(scopedTeams.map((t) => t.goalserveTeamId));

  for (const scopedTeam of scopedTeams) {
    const gsId = scopedTeam.goalserveTeamId;
    const entityId = scopedTeam.entityId;

    const logotipsAsset = logotipsMap.get(gsId) ?? null;
    if (logotipsAsset?.base64) {
      const decodedLogotips = decodeBase64Image(logotipsAsset.base64);
      if (decodedLogotips) {
        const ingestFromLogotipsBase64 = await ingestEntityMediaFromBuffer({
          entityType: "team",
          entityId,
          mediaRole: "crest",
          sourceSystem: "goalserve",
          sourceRef: `goalserve:logotips:team:${gsId}`,
          sourceFormatHint: decodedLogotips.formatHint,
          sourceMimeTypeHint: decodedLogotips.mimeType,
          makePrimary: true,
          originalBuffer: decodedLogotips.buffer,
        });
        if (!ingestFromLogotipsBase64.ok) {
          result.failed++;
          if (ingestFromLogotipsBase64.error) result.errors.push(`team ${gsId} (logotips base64): ${ingestFromLogotipsBase64.error}`);
        } else if (ingestFromLogotipsBase64.unchanged) {
          result.unchanged++;
          continue;
        } else {
          result.ingested++;
          result.ingestedFromLogotips++;
          result.ingestedFromLogotipsBase64++;
          continue;
        }
      }
    }

    if (logotipsAsset?.url) {
      const ingest = await ingestEntityMediaFromUrl({
        entityType: "team",
        entityId,
        mediaRole: "crest",
        sourceSystem: "goalserve",
        sourceUrl: logotipsAsset.url,
        sourceRef: `goalserve:logotips:team:${gsId}`,
        makePrimary: true,
      });

      if (!ingest.ok) {
        result.failed++;
        if (ingest.error) result.errors.push(`team ${gsId} (logotips url): ${ingest.error}`);
      } else if (ingest.unchanged) {
        result.unchanged++;
        continue;
      } else {
        result.ingested++;
        result.ingestedFromLogotips++;
        result.ingestedFromLogotipsUrl++;
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
}

export async function syncGoalserveTeamMediaByLeague(leagueId: string): Promise<GoalserveTeamMediaSyncResult> {
  const result: GoalserveTeamMediaSyncResult = {
    ok: true,
    leagueId,
    scanned: 0,
    ingested: 0,
    ingestedFromLogotips: 0,
    ingestedFromLogotipsBase64: 0,
    ingestedFromLogotipsUrl: 0,
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

    const scopedTeams: Array<{ entityId: string; goalserveTeamId: string }> = [];

    for (const teamNode of feedTeams) {
      const gsId = readGoalserveId(teamNode);
      if (!gsId || !dbByGoalserveId.has(gsId)) {
        result.skippedMissingTeam++;
        continue;
      }
      scopedTeams.push({ entityId: dbByGoalserveId.get(gsId)!, goalserveTeamId: gsId });
    }

    await ingestTeamMediaForScope(scopedTeams, result);
  } catch (err) {
    result.ok = false;
    result.errors.push(err instanceof Error ? err.message : String(err));
  }

  return result;
}

export async function syncGoalserveTeamMediaForMvpSet(): Promise<GoalserveTeamMediaSyncResult> {
  const result: GoalserveTeamMediaSyncResult = {
    ok: true,
    leagueId: "mvp",
    scanned: 0,
    ingested: 0,
    ingestedFromLogotips: 0,
    ingestedFromLogotipsBase64: 0,
    ingestedFromLogotipsUrl: 0,
    ingestedFromTeamProfile: 0,
    unchanged: 0,
    failed: 0,
    skippedMissingTeam: 0,
    skippedMissingImage: 0,
    errors: [],
  };

  try {
    const boundary = new MvpGraphBoundary();
    const mvpTeamIds = Array.from(await boundary.getMvpTeamIds());
    if (mvpTeamIds.length === 0) return result;

    const mvpTeams = await db
      .select({
        id: teams.id,
        goalserveTeamId: teams.goalserveTeamId,
      })
      .from(teams)
      .where(inArray(teams.id, mvpTeamIds));

    result.scanned = mvpTeams.length;

    const scopedTeams: Array<{ entityId: string; goalserveTeamId: string }> = [];
    for (const t of mvpTeams) {
      if (!t.goalserveTeamId) {
        result.skippedMissingTeam++;
        continue;
      }
      scopedTeams.push({ entityId: t.id, goalserveTeamId: String(t.goalserveTeamId) });
    }

    await ingestTeamMediaForScope(scopedTeams, result);
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
    ingestedFromLogotipsBase64: 0,
    ingestedFromLogotipsUrl: 0,
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

      const logotipsAsset = logotipsByLeagueId.get(goalserveLeagueId) ?? null;
      if (!logotipsAsset?.base64 && !logotipsAsset?.url) {
        result.skippedMissingImage++;
        continue;
      }

      if (logotipsAsset?.base64) {
        const decodedLogotips = decodeBase64Image(logotipsAsset.base64);
        if (decodedLogotips) {
          const ingestFromBase64 = await ingestEntityMediaFromBuffer({
            entityType: "competition",
            entityId: dbCompetitionId,
            mediaRole: "logo",
            sourceSystem: "goalserve",
            sourceRef: `goalserve:logotips:league:${goalserveLeagueId}`,
            sourceFormatHint: decodedLogotips.formatHint,
            sourceMimeTypeHint: decodedLogotips.mimeType,
            makePrimary: true,
            originalBuffer: decodedLogotips.buffer,
          });

          if (!ingestFromBase64.ok) {
            result.failed++;
            if (ingestFromBase64.error) result.errors.push(`competition ${goalserveLeagueId} (logotips base64): ${ingestFromBase64.error}`);
          } else if (ingestFromBase64.unchanged) {
            result.unchanged++;
            continue;
          } else {
            result.ingested++;
            result.ingestedFromLogotips++;
            result.ingestedFromLogotipsBase64++;
            continue;
          }
        }
      }

      if (logotipsAsset?.url) {
        const ingest = await ingestEntityMediaFromUrl({
          entityType: "competition",
          entityId: dbCompetitionId,
          mediaRole: "logo",
          sourceSystem: "goalserve",
          sourceUrl: logotipsAsset.url,
          sourceRef: `goalserve:logotips:league:${goalserveLeagueId}`,
          makePrimary: true,
        });

        if (!ingest.ok) {
          result.failed++;
          if (ingest.error) result.errors.push(`competition ${goalserveLeagueId} (logotips url): ${ingest.error}`);
          continue;
        }

        if (ingest.unchanged) result.unchanged++;
        else {
          result.ingested++;
          result.ingestedFromLogotips++;
          result.ingestedFromLogotipsUrl++;
        }
      } else if (!logotipsAsset?.base64) {
        result.skippedMissingImage++;
      }
    }
  } catch (err) {
    result.ok = false;
    result.errors.push(err instanceof Error ? err.message : String(err));
  }

  return result;
}

async function resolveLeagueScopedTeamIds(leagueId: string): Promise<Set<string>> {
  const response = await goalserveFetch(`soccerleague/${leagueId}`);
  const rawTeams = response?.league?.team;
  const feedTeams: Record<string, unknown>[] = Array.isArray(rawTeams) ? rawTeams : rawTeams ? [rawTeams] : [];
  const goalserveTeamIds = feedTeams.map(readGoalserveId).filter(Boolean);
  if (goalserveTeamIds.length === 0) return new Set<string>();

  const rows = await db
    .select({ id: teams.id, goalserveTeamId: teams.goalserveTeamId })
    .from(teams)
    .where(inArray(teams.goalserveTeamId, goalserveTeamIds));
  return new Set(rows.map((row) => row.id));
}

async function resolveMvpScopedTeamIds(): Promise<Set<string>> {
  const rows = await db
    .select({ teamId: competitionTeamMemberships.teamId })
    .from(competitionTeamMemberships)
    .innerJoin(
      competitions,
      eq(competitionTeamMemberships.competitionId, competitions.id),
    )
    .where(
      and(
        eq(competitions.isPriority, true),
        eq(competitions.isCup, false),
        eq(competitionTeamMemberships.isCurrent, true),
      ),
    );
  return new Set(rows.map((row) => row.teamId));
}

async function resolvePersonScope(params: {
  scope?: "league" | "mvp";
  leagueId?: string;
}): Promise<{ scopeLabel: "premier_league" | "mvp"; leagueId: string; teamIds: Set<string> }> {
  if (params.scope === "mvp") {
    const teamIds = await resolveMvpScopedTeamIds();
    return { scopeLabel: "mvp", leagueId: "mvp", teamIds };
  }
  const leagueId = params.leagueId ?? "1204";
  const teamIds = await resolveLeagueScopedTeamIds(leagueId);
  return { scopeLabel: "premier_league", leagueId, teamIds };
}

async function getScopedPlayerRows(teamIds: Set<string>): Promise<Array<{ id: string; goalservePlayerId: string | null }>> {
  const teamIdList = Array.from(teamIds);
  if (teamIdList.length === 0) return [];

  const now = new Date();
  const activeMembershipPlayerIds = await db
    .select({ playerId: playerTeamMemberships.playerId })
    .from(playerTeamMemberships)
    .where(
      and(
        inArray(playerTeamMemberships.teamId, teamIdList),
        or(isNull(playerTeamMemberships.endDate), gt(playerTeamMemberships.endDate, now)),
      ),
    );

  const idsFromMembership = new Set(activeMembershipPlayerIds.map((row) => row.playerId));

  const playersByCurrentTeam = await db
    .select({ id: players.id, goalservePlayerId: players.goalservePlayerId })
    .from(players)
    .where(inArray(players.teamId, teamIdList));
  for (const row of playersByCurrentTeam) idsFromMembership.add(row.id);

  const allIds = Array.from(idsFromMembership);
  if (allIds.length === 0) return [];

  return db
    .select({ id: players.id, goalservePlayerId: players.goalservePlayerId })
    .from(players)
    .where(inArray(players.id, allIds));
}

async function getScopedManagerRows(teamIds: Set<string>): Promise<Array<{ id: string; goalserveManagerId: string | null }>> {
  const teamIdList = Array.from(teamIds);
  if (teamIdList.length === 0) return [];

  const managerIdsFromTeamManagers = await db
    .select({ managerId: teamManagers.managerId })
    .from(teamManagers)
    .where(inArray(teamManagers.teamId, teamIdList));

  const managerIds = new Set(managerIdsFromTeamManagers.map((row) => row.managerId));

  const managersByCurrentTeam = await db
    .select({ id: managers.id })
    .from(managers)
    .where(inArray(managers.currentTeamId, teamIdList));
  for (const row of managersByCurrentTeam) managerIds.add(row.id);

  const allIds = Array.from(managerIds);
  if (allIds.length === 0) return [];

  return db
    .select({ id: managers.id, goalserveManagerId: managers.goalserveManagerId })
    .from(managers)
    .where(inArray(managers.id, allIds));
}

export async function syncGoalservePlayerMediaPilotByLeague(params?: {
  leagueId?: string;
  scope?: "league" | "mvp";
  maxPlayers?: number;
  dryRun?: boolean;
}): Promise<GoalservePersonMediaSyncResult> {
  const maxPlayers = Math.max(1, params?.maxPlayers ?? (params?.scope === "mvp" ? 20000 : 120));
  const dryRun = params?.dryRun ?? false;
  const discoveredImageFields = new Set<string>();
  const { scopeLabel, leagueId, teamIds } = await resolvePersonScope({
    scope: params?.scope,
    leagueId: params?.leagueId,
  });

  const result: GoalservePersonMediaSyncResult = {
    ok: true,
    scope: scopeLabel,
    leagueId,
    entityType: "player",
    dryRun,
    scanned: 0,
    withGoalserveId: 0,
    attempted: 0,
    ingested: 0,
    unchanged: 0,
    failed: 0,
    skippedMissingImage: 0,
    skippedMissingGoalserveId: 0,
    skippedUnsupportedGoalserveId: 0,
    ingestedFromUrl: 0,
    ingestedFromBase64: 0,
    discoveredImageFields: [],
    errors: [],
  };

  try {
    if (teamIds.size === 0) {
      result.errors.push(scopeLabel === "mvp" ? "No MVP-scoped teams found from priority competitions" : `No canonical teams mapped for leagueId=${leagueId}`);
      result.ok = false;
      return result;
    }

    const rows = await getScopedPlayerRows(teamIds);
    result.scanned = rows.length;

    const scoped = rows.slice(0, maxPlayers);
    for (const row of scoped) {
      const goalserveId = (row.goalservePlayerId ?? "").trim();
      if (!goalserveId) {
        result.skippedMissingGoalserveId++;
        continue;
      }
      result.withGoalserveId++;
      if (!/^\d+$/.test(goalserveId)) {
        result.skippedUnsupportedGoalserveId++;
        continue;
      }
      result.attempted++;

      const payload = await fetchGoalserveJson(`soccerstats/player/${goalserveId}`);
      if (!payload) {
        result.skippedMissingImage++;
        continue;
      }

      const candidate = extractGoalservePersonImageFastPath(payload) ?? collectHeadshotCandidate(payload);
      if (candidate.fieldPath) discoveredImageFields.add(candidate.fieldPath);
      if (!candidate.url && !candidate.base64) {
        result.skippedMissingImage++;
        continue;
      }

      if (dryRun) continue;

      if (candidate.base64) {
        const decoded = decodeBase64Image(candidate.base64);
        if (!decoded) {
          result.skippedMissingImage++;
          continue;
        }
        const ingest = await ingestEntityMediaFromBuffer({
          entityType: "player",
          entityId: row.id,
          mediaRole: "headshot",
          sourceSystem: "goalserve",
          sourceRef: `goalserve:soccerstats:player:${goalserveId}`,
          sourceFormatHint: decoded.formatHint,
          sourceMimeTypeHint: decoded.mimeType,
          makePrimary: true,
          originalBuffer: decoded.buffer,
        });
        if (!ingest.ok) {
          result.failed++;
          if (ingest.error) result.errors.push(`player ${goalserveId}: ${ingest.error}`);
        } else if (ingest.unchanged) {
          result.unchanged++;
        } else {
          result.ingested++;
          result.ingestedFromBase64++;
        }
        continue;
      }

      const ingest = await ingestEntityMediaFromUrl({
        entityType: "player",
        entityId: row.id,
        mediaRole: "headshot",
        sourceSystem: "goalserve",
        sourceUrl: candidate.url!,
        sourceRef: `goalserve:soccerstats:player:${goalserveId}`,
        makePrimary: true,
      });
      if (!ingest.ok) {
        result.failed++;
        if (ingest.error) result.errors.push(`player ${goalserveId}: ${ingest.error}`);
      } else if (ingest.unchanged) {
        result.unchanged++;
      } else {
        result.ingested++;
        result.ingestedFromUrl++;
      }
    }
  } catch (err) {
    result.ok = false;
    result.errors.push(err instanceof Error ? err.message : String(err));
  }

  result.discoveredImageFields = Array.from(discoveredImageFields).sort();
  return result;
}

export async function syncGoalserveManagerMediaPilotByLeague(params?: {
  leagueId?: string;
  scope?: "league" | "mvp";
  maxManagers?: number;
  dryRun?: boolean;
}): Promise<GoalservePersonMediaSyncResult> {
  const maxManagers = Math.max(1, params?.maxManagers ?? (params?.scope === "mvp" ? 4000 : 40));
  const dryRun = params?.dryRun ?? false;
  const discoveredImageFields = new Set<string>();
  const { scopeLabel, leagueId, teamIds } = await resolvePersonScope({
    scope: params?.scope,
    leagueId: params?.leagueId,
  });

  const result: GoalservePersonMediaSyncResult = {
    ok: true,
    scope: scopeLabel,
    leagueId,
    entityType: "manager",
    dryRun,
    scanned: 0,
    withGoalserveId: 0,
    attempted: 0,
    ingested: 0,
    unchanged: 0,
    failed: 0,
    skippedMissingImage: 0,
    skippedMissingGoalserveId: 0,
    skippedUnsupportedGoalserveId: 0,
    ingestedFromUrl: 0,
    ingestedFromBase64: 0,
    discoveredImageFields: [],
    errors: [],
  };

  try {
    if (teamIds.size === 0) {
      result.errors.push(scopeLabel === "mvp" ? "No MVP-scoped teams found from priority competitions" : `No canonical teams mapped for leagueId=${leagueId}`);
      result.ok = false;
      return result;
    }

    const rows = await getScopedManagerRows(teamIds);
    result.scanned = rows.length;

    const scoped = rows.slice(0, maxManagers);
    for (const row of scoped) {
      const goalserveId = (row.goalserveManagerId ?? "").trim();
      if (!goalserveId) {
        result.skippedMissingGoalserveId++;
        continue;
      }
      result.withGoalserveId++;
      if (!/^\d+$/.test(goalserveId)) {
        result.skippedUnsupportedGoalserveId++;
        continue;
      }
      result.attempted++;

      const payload = await fetchGoalserveManagerProfile(goalserveId);
      if (!payload) {
        result.skippedMissingImage++;
        continue;
      }

      const candidate = extractGoalservePersonImageFastPath(payload) ?? collectHeadshotCandidate(payload);
      if (candidate.fieldPath) discoveredImageFields.add(candidate.fieldPath);
      if (!candidate.url && !candidate.base64) {
        result.skippedMissingImage++;
        continue;
      }

      if (dryRun) continue;

      if (candidate.base64) {
        const decoded = decodeBase64Image(candidate.base64);
        if (!decoded) {
          result.skippedMissingImage++;
          continue;
        }
        const ingest = await ingestEntityMediaFromBuffer({
          entityType: "manager",
          entityId: row.id,
          mediaRole: "headshot",
          sourceSystem: "goalserve",
          sourceRef: `goalserve:soccerstats:coach:${goalserveId}`,
          sourceFormatHint: decoded.formatHint,
          sourceMimeTypeHint: decoded.mimeType,
          makePrimary: true,
          originalBuffer: decoded.buffer,
        });
        if (!ingest.ok) {
          result.failed++;
          if (ingest.error) result.errors.push(`manager ${goalserveId}: ${ingest.error}`);
        } else if (ingest.unchanged) {
          result.unchanged++;
        } else {
          result.ingested++;
          result.ingestedFromBase64++;
        }
        continue;
      }

      const ingest = await ingestEntityMediaFromUrl({
        entityType: "manager",
        entityId: row.id,
        mediaRole: "headshot",
        sourceSystem: "goalserve",
        sourceUrl: candidate.url!,
        sourceRef: `goalserve:soccerstats:coach:${goalserveId}`,
        makePrimary: true,
      });
      if (!ingest.ok) {
        result.failed++;
        if (ingest.error) result.errors.push(`manager ${goalserveId}: ${ingest.error}`);
      } else if (ingest.unchanged) {
        result.unchanged++;
      } else {
        result.ingested++;
        result.ingestedFromUrl++;
      }
    }
  } catch (err) {
    result.ok = false;
    result.errors.push(err instanceof Error ? err.message : String(err));
  }

  result.discoveredImageFields = Array.from(discoveredImageFields).sort();
  return result;
}

export async function syncGoalservePersonMediaPilot(params?: {
  leagueId?: string;
  scope?: "league" | "mvp";
  includePlayers?: boolean;
  includeManagers?: boolean;
  maxPlayers?: number;
  maxManagers?: number;
  dryRun?: boolean;
}): Promise<{
  ok: boolean;
  players?: GoalservePersonMediaSyncResult;
  managers?: GoalservePersonMediaSyncResult;
}> {
  const includePlayers = params?.includePlayers ?? true;
  const includeManagers = params?.includeManagers ?? true;
  const output: {
    ok: boolean;
    players?: GoalservePersonMediaSyncResult;
    managers?: GoalservePersonMediaSyncResult;
  } = { ok: true };

  if (includePlayers) {
    output.players = await syncGoalservePlayerMediaPilotByLeague({
      leagueId: params?.leagueId,
      scope: params?.scope,
      maxPlayers: params?.maxPlayers,
      dryRun: params?.dryRun,
    });
    if (!output.players.ok) output.ok = false;
  }

  if (includeManagers) {
    output.managers = await syncGoalserveManagerMediaPilotByLeague({
      leagueId: params?.leagueId,
      scope: params?.scope,
      maxManagers: params?.maxManagers,
      dryRun: params?.dryRun,
    });
    if (!output.managers.ok) output.ok = false;
  }

  return output;
}

export async function syncGoalserveEntityMedia(params: {
  leagueId?: string;
  includeTeams?: boolean;
  includeCompetitions?: boolean;
  mvpTeamsOnly?: boolean;
  personScope?: "league" | "mvp";
  includePlayers?: boolean;
  includeManagers?: boolean;
  maxPlayers?: number;
  maxManagers?: number;
  dryRun?: boolean;
}): Promise<{
  ok: boolean;
  teams?: GoalserveTeamMediaSyncResult;
  competitions?: GoalserveCompetitionMediaSyncResult;
  players?: GoalservePersonMediaSyncResult;
  managers?: GoalservePersonMediaSyncResult;
}> {
  const includeTeams = params.includeTeams ?? true;
  const includeCompetitions = params.includeCompetitions ?? true;
  const includePlayers = params.includePlayers ?? false;
  const includeManagers = params.includeManagers ?? false;
  const mvpTeamsOnly = params.mvpTeamsOnly ?? false;
  const output: {
    ok: boolean;
    teams?: GoalserveTeamMediaSyncResult;
    competitions?: GoalserveCompetitionMediaSyncResult;
    players?: GoalservePersonMediaSyncResult;
    managers?: GoalservePersonMediaSyncResult;
  } = { ok: true };

  if (includeCompetitions) {
    output.competitions = await syncGoalserveCompetitionMedia();
    if (!output.competitions.ok) output.ok = false;
  }

  if (includeTeams) {
    if (mvpTeamsOnly) {
      output.teams = await syncGoalserveTeamMediaForMvpSet();
      if (!output.teams.ok) output.ok = false;
    } else if (!params.leagueId) {
      output.ok = false;
      output.teams = {
        ok: false,
        leagueId: "",
        scanned: 0,
        ingested: 0,
        ingestedFromLogotips: 0,
        ingestedFromLogotipsBase64: 0,
        ingestedFromLogotipsUrl: 0,
        ingestedFromTeamProfile: 0,
        unchanged: 0,
        failed: 0,
        skippedMissingTeam: 0,
        skippedMissingImage: 0,
        errors: ["leagueId is required for team media sync unless mvpTeamsOnly=1"],
      };
    } else {
      output.teams = await syncGoalserveTeamMediaByLeague(params.leagueId);
      if (!output.teams.ok) output.ok = false;
    }
  }

  if (includePlayers) {
    output.players = await syncGoalservePlayerMediaPilotByLeague({
      leagueId: params.leagueId,
      scope: params.personScope,
      maxPlayers: params.maxPlayers,
      dryRun: params.dryRun,
    });
    if (!output.players.ok) output.ok = false;
  }

  if (includeManagers) {
    output.managers = await syncGoalserveManagerMediaPilotByLeague({
      leagueId: params.leagueId,
      scope: params.personScope,
      maxManagers: params.maxManagers,
      dryRun: params.dryRun,
    });
    if (!output.managers.ok) output.ok = false;
  }

  return output;
}
