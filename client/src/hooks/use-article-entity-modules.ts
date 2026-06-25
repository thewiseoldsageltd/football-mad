import { useMemo } from "react";
import { useQueries } from "@tanstack/react-query";
import {
  ARTICLES_PER_MODULE,
  entityArchiveUrl,
  entityHubHref,
  type SidebarEntity,
} from "@/lib/article-sidebar-entities";
import type { Article } from "@shared/schema";

export interface EntityModuleData {
  entity: SidebarEntity;
  articles: Article[];
  hubHref: string;
}

interface ArchiveResponse {
  articles?: Article[];
}

export function useArticleEntityModules(
  entities: SidebarEntity[],
  currentArticleId: string | undefined,
) {
  const queries = useQueries({
    queries: entities.map((entity) => ({
      queryKey: ["/api/news/archive", entity.type, entity.slug, "article-sidebar"],
      queryFn: async (): Promise<Article[]> => {
        const res = await fetch(entityArchiveUrl(entity.type, entity.slug));
        if (!res.ok) return [];
        const data = (await res.json()) as ArchiveResponse;
        return data.articles ?? [];
      },
      enabled: Boolean(entity.slug && currentArticleId),
      staleTime: 1000 * 60 * 5,
    })),
  });

  const modules = useMemo(() => {
    if (!currentArticleId) return [];

    const shownArticleIds = new Set<string>();
    const result: EntityModuleData[] = [];

    for (let i = 0; i < entities.length; i++) {
      const entity = entities[i];
      const candidates = queries[i]?.data ?? [];
      const picked: Article[] = [];

      for (const candidate of candidates) {
        if (candidate.id === currentArticleId) continue;
        if (shownArticleIds.has(candidate.id)) continue;
        picked.push(candidate);
        shownArticleIds.add(candidate.id);
        if (picked.length >= ARTICLES_PER_MODULE) break;
      }

      if (picked.length > 0) {
        result.push({
          entity,
          articles: picked,
          hubHref: entityHubHref(entity.type, entity.slug),
        });
      }
    }

    return result;
  }, [entities, queries, currentArticleId]);

  const isLoading = entities.length > 0 && queries.some((q) => q.isLoading);

  return { modules, isLoading };
}
