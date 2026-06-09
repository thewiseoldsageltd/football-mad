import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearch } from "wouter";
import { Search } from "lucide-react";
import { MainLayout } from "@/components/layout/main-layout";
import { ArticleCard } from "@/components/cards/article-card";
import { ArticleCardSkeleton } from "@/components/skeletons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Article } from "@shared/schema";
import { searchResults } from "@/lib/urls";
import { usePageSeo } from "@/lib/seo";

interface SearchResponse {
  articles: Article[];
  query: string;
  nextCursor: string | null;
  hasMore: boolean;
}

export default function SearchPage() {
  const searchString = useSearch();
  const query = useMemo(() => new URLSearchParams(searchString).get("q")?.trim() ?? "", [searchString]);
  const [draftQuery, setDraftQuery] = useState(query);
  const [extraArticles, setExtraArticles] = useState<Article[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  useEffect(() => {
    setDraftQuery(query);
    setExtraArticles([]);
    setNextCursor(null);
    setHasMore(false);
  }, [query]);

  const { data, isLoading, isError } = useQuery<SearchResponse>({
    queryKey: ["/api/search", query],
    queryFn: async () => {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}&limit=15`);
      if (!res.ok) throw new Error("Search failed");
      return res.json();
    },
    enabled: query.length >= 2,
  });

  useEffect(() => {
    if (!data) return;
    setExtraArticles([]);
    setNextCursor(data.nextCursor);
    setHasMore(data.hasMore);
  }, [data]);

  const articles = useMemo(
    () => [...(data?.articles ?? []), ...extraArticles],
    [data?.articles, extraArticles],
  );

  usePageSeo({
    title: query ? `Search: ${query} | Football Mad` : "Search | Football Mad",
    description: query
      ? `Search results for "${query}" on Football Mad.`
      : "Search Football Mad news and articles.",
    canonicalPath: query ? searchResults(query) : "/search",
    noIndex: true,
  });

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const next = draftQuery.trim();
    if (next.length < 2) return;
    window.location.assign(searchResults(next));
  };

  const loadMore = async () => {
    if (!nextCursor || isLoadingMore) return;
    setIsLoadingMore(true);
    try {
      const res = await fetch(
        `/api/search?q=${encodeURIComponent(query)}&limit=15&cursor=${encodeURIComponent(nextCursor)}`,
      );
      if (!res.ok) throw new Error("Failed to load more");
      const payload = (await res.json()) as SearchResponse;
      setExtraArticles((prev) => [...prev, ...payload.articles]);
      setNextCursor(payload.nextCursor);
      setHasMore(payload.hasMore);
    } finally {
      setIsLoadingMore(false);
    }
  };

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="max-w-2xl mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-4" data-testid="text-search-title">
            Search
          </h1>
          <form onSubmit={handleSubmit} className="relative" role="search">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              value={draftQuery}
              onChange={(e) => setDraftQuery(e.target.value)}
              placeholder="Search news and articles…"
              className="pl-10"
              aria-label="Search news and articles"
              data-testid="input-search-page"
            />
          </form>
        </div>

        {query.length < 2 ? (
          <p className="text-muted-foreground" data-testid="text-search-hint">
            Enter at least 2 characters to search article titles and excerpts.
          </p>
        ) : isLoading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <ArticleCardSkeleton key={i} />
            ))}
          </div>
        ) : isError ? (
          <p className="text-destructive" data-testid="text-search-error">
            Something went wrong. Please try again.
          </p>
        ) : articles.length > 0 ? (
          <div className="space-y-6">
            <p className="text-muted-foreground" data-testid="text-search-count">
              {articles.length}
              {hasMore ? "+" : ""} result{articles.length === 1 ? "" : "s"} for &ldquo;{query}&rdquo;
            </p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {articles.map((article) => (
                <ArticleCard key={article.id} article={article} />
              ))}
            </div>
            {hasMore && (
              <div className="flex justify-center">
                <Button onClick={loadMore} disabled={isLoadingMore} variant="outline">
                  {isLoadingMore ? "Loading…" : "Load more"}
                </Button>
              </div>
            )}
          </div>
        ) : (
          <p className="text-muted-foreground" data-testid="text-search-empty">
            No articles found for &ldquo;{query}&rdquo;.
          </p>
        )}
      </div>
    </MainLayout>
  );
}
