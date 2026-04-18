import { and, eq } from "drizzle-orm";
import { db } from "../db";
import { entityMedia, entityMediaVariants, teams, players, managers } from "@shared/schema";

export type EntityMediaResolverEntityType = "competition" | "team" | "player" | "manager";
export type EntityMediaSurface = "pill" | "hub_header";

export interface EntityDisplayMedia {
  entityType: EntityMediaResolverEntityType;
  entityId: string;
  mediaRole: "logo" | "crest" | "headshot";
  url: string | null;
  width: number | null;
  height: number | null;
  format: string | null;
  hasMedia: boolean;
  fallbackLabel: string;
}

const SURFACE_VARIANT_PRIORITY: Record<EntityMediaSurface, string[]> = {
  pill: ["pill_24", "pill_32", "hub_96", "hub_160"],
  hub_header: ["hub_160", "hub_96", "pill_32", "pill_24"],
};

function mediaRoleForEntityType(entityType: EntityMediaResolverEntityType): "logo" | "crest" | "headshot" {
  if (entityType === "competition") return "logo";
  if (entityType === "team") return "crest";
  return "headshot";
}

async function getDirectStoredImageUrl(
  entityType: EntityMediaResolverEntityType,
  entityId: string,
): Promise<string | null> {
  if (entityType === "team") {
    const [row] = await db.select({ logoUrl: teams.logoUrl }).from(teams).where(eq(teams.id, entityId)).limit(1);
    const u = row?.logoUrl?.trim();
    return u || null;
  }
  if (entityType === "player") {
    const [row] = await db.select({ imageUrl: players.imageUrl }).from(players).where(eq(players.id, entityId)).limit(1);
    const u = row?.imageUrl?.trim();
    return u || null;
  }
  if (entityType === "manager") {
    const [row] = await db.select({ imageUrl: managers.imageUrl }).from(managers).where(eq(managers.id, entityId)).limit(1);
    const u = row?.imageUrl?.trim();
    return u || null;
  }
  // Competitions: no dedicated logo_url column; Goalserve ingest lands in entity_media.
  return null;
}

/**
 * Unified async resolver: entity_media variants → direct row URLs (logo_url / image_url).
 * Goalserve-sourced imagery is expected to already live in entity_media (or occasionally in logo_url).
 */
export async function getEntityImage(
  entityType: EntityMediaResolverEntityType,
  entityId: string,
  surface: EntityMediaSurface = "pill",
): Promise<string | null> {
  const resolved = await getEntityDisplayMedia({ entityType, entityId, surface });
  return resolved.hasMedia && resolved.url ? resolved.url : null;
}

export async function getEntityDisplayMedia(input: {
  entityType: EntityMediaResolverEntityType;
  entityId: string;
  surface: EntityMediaSurface;
  fallbackLabel?: string;
}): Promise<EntityDisplayMedia> {
  const { entityType, entityId, surface, fallbackLabel } = input;
  const mediaRole = mediaRoleForEntityType(entityType);

  const primary = await db
    .select({
      id: entityMedia.id,
      cdnOriginalUrl: entityMedia.cdnOriginalUrl,
      originalWidth: entityMedia.originalWidth,
      originalHeight: entityMedia.originalHeight,
      sourceFormat: entityMedia.sourceFormat,
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

  if (!primary[0]) {
    const directUrl = await getDirectStoredImageUrl(entityType, entityId);
    if (directUrl) {
      return {
        entityType,
        entityId,
        mediaRole,
        url: directUrl,
        width: null,
        height: null,
        format: null,
        hasMedia: true,
        fallbackLabel: fallbackLabel ?? "FM",
      };
    }
    return {
      entityType,
      entityId,
      mediaRole,
      url: null,
      width: null,
      height: null,
      format: null,
      hasMedia: false,
      fallbackLabel: fallbackLabel ?? "FM",
    };
  }

  const variants = await db
    .select({
      variantName: entityMediaVariants.variantName,
      cdnUrl: entityMediaVariants.cdnUrl,
      width: entityMediaVariants.width,
      height: entityMediaVariants.height,
      format: entityMediaVariants.format,
    })
    .from(entityMediaVariants)
    .where(eq(entityMediaVariants.entityMediaId, primary[0].id));

  const variantByName = new Map(variants.map((v) => [v.variantName, v]));
  const preferredNames = SURFACE_VARIANT_PRIORITY[surface] ?? [];
  const preferred = preferredNames.map((name) => variantByName.get(name)).find((v) => !!v);

  if (preferred) {
    return {
      entityType,
      entityId,
      mediaRole,
      url: preferred.cdnUrl,
      width: preferred.width,
      height: preferred.height,
      format: preferred.format,
      hasMedia: true,
      fallbackLabel: fallbackLabel ?? "FM",
    };
  }

  return {
    entityType,
    entityId,
    mediaRole,
    url: primary[0].cdnOriginalUrl,
    width: primary[0].originalWidth ?? null,
    height: primary[0].originalHeight ?? null,
    format: primary[0].sourceFormat ?? null,
    hasMedia: true,
    fallbackLabel: fallbackLabel ?? "FM",
  };
}
