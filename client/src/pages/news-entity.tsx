import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { MainLayout } from "@/components/layout/main-layout";
import { ArticleCard } from "@/components/cards/article-card";
import { ArticleCardSkeleton } from "@/components/skeletons";
import { Newspaper } from "lucide-react";
import type { Article } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { EntityAvatar } from "@/components/entity-media";
import { usePageSeo, shouldBlockIndexingFromClient } from "@/lib/seo";

interface NewsEntityPageProps {
  slug: string;
  entityType: "team" | "competition";
}

function formatEntityName(slug: string): string {
  return slug
    .split("-")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export default function NewsEntityPage({ slug, entityType }: NewsEntityPageProps) {
  const [, navigate] = useLocation();
  const isTeam = entityType === "team";
  const [articles, setArticles] = useState<Article[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const endpoint = useMemo(() => {
    if (entityType === "competition") return `/api/news/archive/competition/${slug}`;
    if (entityType === "team") return `/api/news/archive/team/${slug}`;
    return null;
  }, [entityType, slug]);

  const { data, isLoading } = useQuery<{
    articles: Article[];
    nextCursor: string | null;
    hasMore: boolean;
    mvpIndexable?: boolean;
    appliedContext: {
      entityType: "competition" | "team";
      entitySlug: string;
      entityId: string | null;
    };
  }>({
    queryKey: [endpoint, "first-page"],
    queryFn: async () => {
      const res = await fetch(`${endpoint}?limit=15`);
      if (!res.ok) throw new Error("Failed to fetch archive");
      return res.json();
    },
    enabled: Boolean(endpoint),
  });

  const displayName = useMemo(
    () => formatEntityName(data?.appliedContext?.entitySlug ?? slug),
    [data?.appliedContext?.entitySlug, slug],
  );

  const canonicalPath = useMemo(() => {
    const publicSlug = data?.appliedContext?.entitySlug ?? slug;
    return entityType === "competition"
      ? `/competitions/${publicSlug}`
      : `/teams/${publicSlug}`;
  }, [data?.appliedContext?.entitySlug, slug, entityType]);

  usePageSeo({
    title: `${displayName} News | Football Mad`,
    description: `Latest news and updates about ${displayName} on Football Mad.`,
    canonicalPath,
    noIndex: shouldBlockIndexingFromClient() || (data != null && data.mvpIndexable === false),
  });

  useEffect(() => {
    if (!data) return;
    setArticles(data.articles ?? []);
    setNextCursor(data.nextCursor ?? null);
    setHasMore(Boolean(data.hasMore));
  }, [data]);

  useEffect(() => {
    const resolvedSlug = data?.appliedContext?.entitySlug;
    if (!resolvedSlug || resolvedSlug === slug) return;
    const canonicalPath =
      entityType === "competition"
        ? `/competitions/${resolvedSlug}`
        : `/teams/${resolvedSlug}`;
    navigate(canonicalPath, { replace: true });
  }, [data?.appliedContext?.entitySlug, slug, entityType, navigate]);

  const loadMore = async () => {
    if (!endpoint || !nextCursor || !hasMore || isLoadingMore) return;
    setIsLoadingMore(true);
    try {
      const res = await fetch(`${endpoint}?limit=15&cursor=${encodeURIComponent(nextCursor)}`);
      if (!res.ok) throw new Error("Failed to fetch more archive results");
      const payload = await res.json();
      setArticles((prev) => [...prev, ...(payload.articles ?? [])]);
      setNextCursor(payload.nextCursor ?? null);
      setHasMore(Boolean(payload.hasMore));
    } finally {
      setIsLoadingMore(false);
    }
  };

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-8">
          <EntityAvatar
            entityType={isTeam ? "team" : "competition"}
            entityId={data?.appliedContext?.entityId ?? null}
            surface="hub_header"
            label={displayName}
            sizeClassName="h-8 w-8"
          />
          <div>
            <h1 className="text-4xl md:text-5xl font-bold" data-testid="text-page-title">
              {displayName} News
            </h1>
            <p className="text-muted-foreground text-lg" data-testid="text-page-subtitle">
              Latest news and updates about {displayName}
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 9 }).map((_, i) => (
              <ArticleCardSkeleton key={i} />
            ))}
          </div>
        ) : articles.length > 0 ? (
          <div className="space-y-6">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {articles.map((article) => (
                <ArticleCard key={article.id} article={article} />
              ))}
            </div>
            {hasMore && (
              <div className="flex justify-center">
                <Button onClick={loadMore} disabled={isLoadingMore} variant="outline">
                  {isLoadingMore ? "Loading..." : "Load more"}
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-12">
            <Newspaper className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              No articles found for {displayName}.
            </p>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
