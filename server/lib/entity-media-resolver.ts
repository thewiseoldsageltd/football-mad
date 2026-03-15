import { and, eq } from "drizzle-orm";
import { db } from "../db";
import { entityMedia, entityMediaVariants } from "@shared/schema";

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
