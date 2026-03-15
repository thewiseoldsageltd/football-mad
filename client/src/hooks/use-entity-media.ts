import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

export type MediaEntityType = "team" | "competition" | "player" | "manager";
export type MediaSurface = "pill" | "hub_header";

interface EntityMediaApiResponse {
  url: string | null;
  width: number | null;
  height: number | null;
  hasMedia: boolean;
}

export function useEntityMedia(
  entityType: MediaEntityType,
  entityId: string | null | undefined,
  surface: MediaSurface,
): EntityMediaApiResponse {
  const apiSurface = surface;
  const enabled = Boolean(entityId);

  const { data } = useQuery<EntityMediaApiResponse | null>({
    queryKey: ["/api/entity-media", entityType, entityId ?? "", apiSurface],
    enabled,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      if (!entityId) return null;
      const response = await fetch(`/api/entity-media/${entityType}/${entityId}?surface=${apiSurface}`, {
        credentials: "include",
      });
      if (!response.ok) return null;
      return (await response.json()) as EntityMediaApiResponse;
    },
  });

  return useMemo(() => {
    if (!enabled || !data) {
      return { url: null, width: null, height: null, hasMedia: false };
    }
    return {
      url: data.url ?? null,
      width: data.width ?? null,
      height: data.height ?? null,
      hasMedia: Boolean(data.hasMedia && data.url),
    };
  }, [enabled, data]);
}
