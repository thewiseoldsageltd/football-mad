import crypto from "node:crypto";
import sharp from "sharp";
import { and, eq } from "drizzle-orm";
import { db } from "../db";
import { entityMedia, entityMediaVariants } from "@shared/schema";
import { uploadBufferToR2Key } from "./r2";
import { jobFetch } from "./job-observability";
import { getJobRunId } from "./job-context";

export type SupportedEntityType = "competition" | "team";
export type SupportedMediaRole = "logo" | "crest";
export type MediaSourceSystem = "goalserve" | "manual";

export interface IngestEntityMediaFromUrlInput {
  entityType: SupportedEntityType;
  entityId: string;
  mediaRole: SupportedMediaRole;
  sourceSystem: MediaSourceSystem;
  sourceUrl: string;
  sourceRef?: string;
  makePrimary?: boolean;
  storageVersion?: string;
}

export interface IngestEntityMediaFromBufferInput {
  entityType: SupportedEntityType;
  entityId: string;
  mediaRole: SupportedMediaRole;
  sourceSystem: MediaSourceSystem;
  sourceRef?: string;
  sourceFormatHint?: string;
  sourceMimeTypeHint?: string;
  makePrimary?: boolean;
  storageVersion?: string;
  originalBuffer: Buffer;
}

export interface IngestEntityMediaResult {
  ok: boolean;
  entityMediaId: string | null;
  created: boolean;
  unchanged: boolean;
  cdnOriginalUrl: string | null;
  variantsCreated: number;
  error?: string;
}

type VariantSpec = {
  variantName: "pill_24" | "pill_32" | "hub_96" | "hub_160";
  width: number;
  height: number;
};

const VARIANT_SPECS: VariantSpec[] = [
  { variantName: "pill_24", width: 24, height: 24 },
  { variantName: "pill_32", width: 32, height: 32 },
  { variantName: "hub_96", width: 96, height: 96 },
  { variantName: "hub_160", width: 160, height: 160 },
];

function getCdnBaseUrl(): string {
  return (process.env.R2_PUBLIC_BASE_URL ?? "https://img.footballmad.co.uk").replace(/\/$/, "");
}

function pluralizeEntityType(entityType: SupportedEntityType): "competitions" | "teams" {
  return entityType === "competition" ? "competitions" : "teams";
}

function inferExtension(url: string, mimeType: string | null): string {
  const mime = (mimeType ?? "").toLowerCase();
  if (mime.includes("image/svg")) return "svg";
  if (mime.includes("image/png")) return "png";
  if (mime.includes("image/webp")) return "webp";
  if (mime.includes("image/gif")) return "gif";
  if (mime.includes("image/jpeg") || mime.includes("image/jpg")) return "jpg";
  if (mime.includes("image/avif")) return "avif";

  const clean = url.split("?")[0].split("#")[0];
  const ext = clean.split(".").pop()?.toLowerCase();
  if (!ext) return "img";
  if (["svg", "png", "webp", "gif", "jpg", "jpeg", "avif"].includes(ext)) return ext === "jpeg" ? "jpg" : ext;
  return "img";
}

function normalizeMimeType(mimeType: string | null, ext: string): string {
  if (mimeType && mimeType.trim()) return mimeType.trim().toLowerCase();
  if (ext === "svg") return "image/svg+xml";
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  if (ext === "gif") return "image/gif";
  if (ext === "avif") return "image/avif";
  return "image/jpeg";
}

function checksumOf(buffer: Buffer): string {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

function normalizeStorageVersion(storageVersion?: string): string | null {
  if (!storageVersion) return null;
  const normalized = storageVersion.trim().replace(/[^a-zA-Z0-9_-]/g, "");
  if (!normalized) return null;
  return normalized;
}

function buildOriginalStorageKeyWithVersion(
  entityType: SupportedEntityType,
  entityId: string,
  ext: string,
  storageVersion?: string,
): string {
  const version = normalizeStorageVersion(storageVersion);
  const versionPath = version ? `/v${version}` : "";
  return `entity-media/${pluralizeEntityType(entityType)}/${entityId}${versionPath}/original.${ext}`;
}

function buildVariantStorageKeyWithVersion(
  entityType: SupportedEntityType,
  entityId: string,
  variantName: VariantSpec["variantName"],
  storageVersion?: string,
): string {
  const normalized = variantName.replace("_", "-");
  const version = normalizeStorageVersion(storageVersion);
  const versionPath = version ? `/v${version}` : "";
  return `entity-media/${pluralizeEntityType(entityType)}/${entityId}${versionPath}/${normalized}.webp`;
}

async function fetchImageBuffer(sourceSystem: MediaSourceSystem, sourceUrl: string): Promise<{ buffer: Buffer; mimeType: string | null }> {
  const runId = getJobRunId() ?? undefined;
  const res = await jobFetch(runId, {
    provider: sourceSystem,
    url: sourceUrl,
    method: "GET",
    timeoutMs: 30_000,
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch media from ${sourceUrl}: HTTP ${res.status}`);
  }
  const contentType = res.headers.get("content-type");
  const array = await res.arrayBuffer();
  return { buffer: Buffer.from(array), mimeType: contentType };
}

async function createVariantBuffer(originalBuffer: Buffer, width: number, height: number): Promise<Buffer> {
  return sharp(originalBuffer)
    .resize(width, height, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
      withoutEnlargement: false,
    })
    .webp({ quality: 84 })
    .toBuffer();
}

async function ingestEntityMediaFromBufferCore(input: {
  entityType: SupportedEntityType;
  entityId: string;
  mediaRole: SupportedMediaRole;
  sourceSystem: MediaSourceSystem;
  sourceRef: string;
  sourceFormatHint?: string;
  sourceMimeTypeHint?: string;
  makePrimary: boolean;
  storageVersion?: string;
  originalBuffer: Buffer;
}): Promise<IngestEntityMediaResult> {
  const {
    entityType,
    entityId,
    mediaRole,
    sourceSystem,
    sourceRef,
    sourceFormatHint,
    sourceMimeTypeHint,
    makePrimary,
    storageVersion,
    originalBuffer,
  } = input;
  const now = new Date();

  try {
    if (!originalBuffer.length) {
      return { ok: false, entityMediaId: null, created: false, unchanged: false, cdnOriginalUrl: null, variantsCreated: 0, error: "empty image response" };
    }

    const checksum = checksumOf(originalBuffer);
    const ext = sourceFormatHint ? sourceFormatHint.toLowerCase() : inferExtension(sourceRef, sourceMimeTypeHint ?? null);
    const normalizedMimeType = normalizeMimeType(sourceMimeTypeHint ?? null, ext);

    const metadata = await sharp(originalBuffer).metadata().catch(() => null);
    const originalWidth = metadata?.width ?? null;
    const originalHeight = metadata?.height ?? null;

    const originalStorageKey = buildOriginalStorageKeyWithVersion(entityType, entityId, ext, storageVersion);
    const cdnOriginalUrl = `${getCdnBaseUrl()}/${originalStorageKey}`;

    const existingPrimary = await db
      .select({
        id: entityMedia.id,
        checksum: entityMedia.checksum,
        originalStorageKey: entityMedia.originalStorageKey,
        cdnOriginalUrl: entityMedia.cdnOriginalUrl,
      })
      .from(entityMedia)
      .where(
        and(
          eq(entityMedia.entityType, entityType),
          eq(entityMedia.entityId, entityId),
          eq(entityMedia.mediaRole, mediaRole),
          eq(entityMedia.isPrimary, true),
          eq(entityMedia.status, "active"),
        ),
      )
      .limit(1);

    if (existingPrimary[0]?.checksum && existingPrimary[0].checksum === checksum) {
      await db
        .update(entityMedia)
        .set({
          sourceRef,
          sourceSystem,
          sourceFormat: ext,
          sourceMimeType: normalizedMimeType,
          originalWidth,
          originalHeight,
          lastIngestedAt: now,
          updatedAt: now,
        })
        .where(eq(entityMedia.id, existingPrimary[0].id));

      return {
        ok: true,
        entityMediaId: existingPrimary[0].id,
        created: false,
        unchanged: true,
        cdnOriginalUrl: existingPrimary[0].cdnOriginalUrl,
        variantsCreated: 0,
      };
    }

    await uploadBufferToR2Key(originalStorageKey, originalBuffer, normalizedMimeType);

    const preparedVariants = await Promise.all(
      VARIANT_SPECS.map(async (spec) => {
        const variantBuffer = await createVariantBuffer(originalBuffer, spec.width, spec.height);
        const storageKey = buildVariantStorageKeyWithVersion(entityType, entityId, spec.variantName, storageVersion);
        const cdnUrl = `${getCdnBaseUrl()}/${storageKey}`;
        await uploadBufferToR2Key(storageKey, variantBuffer, "image/webp");
        return {
          spec,
          storageKey,
          cdnUrl,
          fileSizeBytes: variantBuffer.byteLength,
        };
      }),
    );

    const insertedId = await db.transaction(async (tx) => {
      if (makePrimary) {
        await tx
          .update(entityMedia)
          .set({
            isPrimary: false,
            status: "superseded",
            updatedAt: now,
          })
          .where(
            and(
              eq(entityMedia.entityType, entityType),
              eq(entityMedia.entityId, entityId),
              eq(entityMedia.mediaRole, mediaRole),
              eq(entityMedia.isPrimary, true),
              eq(entityMedia.status, "active"),
            ),
          );
      }

      const inserted = await tx
        .insert(entityMedia)
        .values({
          entityType,
          entityId,
          mediaRole,
          sourceSystem,
          sourceRef,
          sourceFormat: ext,
          sourceMimeType: normalizedMimeType,
          originalWidth,
          originalHeight,
          originalStorageKey,
          cdnOriginalUrl,
          isPrimary: makePrimary,
          status: "active",
          checksum,
          lastIngestedAt: now,
          updatedAt: now,
        })
        .returning({ id: entityMedia.id });

      const entityMediaId = inserted[0]?.id;
      if (!entityMediaId) {
        throw new Error("Failed to insert entity_media row");
      }

      await tx.insert(entityMediaVariants).values(
        preparedVariants.map((variant) => ({
          entityMediaId,
          variantName: variant.spec.variantName,
          format: "webp",
          width: variant.spec.width,
          height: variant.spec.height,
          fitMode: "contain",
          storageKey: variant.storageKey,
          cdnUrl: variant.cdnUrl,
          fileSizeBytes: variant.fileSizeBytes,
        })),
      );

      return entityMediaId;
    });

    return {
      ok: true,
      entityMediaId: insertedId,
      created: true,
      unchanged: false,
      cdnOriginalUrl,
      variantsCreated: preparedVariants.length,
    };
  } catch (err) {
    return {
      ok: false,
      entityMediaId: null,
      created: false,
      unchanged: false,
      cdnOriginalUrl: null,
      variantsCreated: 0,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function ingestEntityMediaFromUrl(input: IngestEntityMediaFromUrlInput): Promise<IngestEntityMediaResult> {
  const {
    entityType,
    entityId,
    mediaRole,
    sourceSystem,
    sourceUrl,
    sourceRef,
    makePrimary = true,
    storageVersion,
  } = input;
  const fetched = await fetchImageBuffer(sourceSystem, sourceUrl);
  return ingestEntityMediaFromBufferCore({
    entityType,
    entityId,
    mediaRole,
    sourceSystem,
    sourceRef: sourceRef ?? sourceUrl,
    sourceFormatHint: undefined,
    sourceMimeTypeHint: fetched.mimeType ?? undefined,
    makePrimary,
    storageVersion,
    originalBuffer: fetched.buffer,
  });
}

export async function ingestEntityMediaFromBuffer(input: IngestEntityMediaFromBufferInput): Promise<IngestEntityMediaResult> {
  const {
    entityType,
    entityId,
    mediaRole,
    sourceSystem,
    sourceRef,
    sourceFormatHint,
    sourceMimeTypeHint,
    makePrimary = true,
    storageVersion,
    originalBuffer,
  } = input;
  return ingestEntityMediaFromBufferCore({
    entityType,
    entityId,
    mediaRole,
    sourceSystem,
    sourceRef: sourceRef ?? `${sourceSystem}:buffer`,
    sourceFormatHint,
    sourceMimeTypeHint,
    makePrimary,
    storageVersion,
    originalBuffer,
  });
}
