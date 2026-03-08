import { useQuery } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { ArrowLeft, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { MainLayout } from "@/components/layout/main-layout";
import { teamHub } from "@/lib/urls";
import { ArticleCard } from "@/components/cards/article-card";
import { ArticleCardSkeleton } from "@/components/skeletons";
import type { Article } from "@shared/schema";
import { useEffect, useState } from "react";

type ManagerApiResponse = {
  id: string;
  name: string;
  slug: string;
  nationality?: string | null;
  currentTeamId?: string | null;
  team?: {
    id: string;
    name: string;
    slug: string;
  } | null;
};

type ManagerArchiveResponse = {
  articles: Article[];
  nextCursor: string | null;
  hasMore: boolean;
  appliedContext: {
    entityType: "manager";
    entitySlug: string;
    entityId: string | null;
  };
};

export default function ManagerProfilePage() {
  const [, params] = useRoute("/managers/:slug");
  const slug = params?.slug ?? "";
  const { data: manager, isLoading } = useQuery<ManagerApiResponse | null>({
    queryKey: ["/api/managers", slug],
    queryFn: async () => {
      const res = await fetch(`/api/managers/${slug}`);
      if (!res.ok) {
        if (res.status === 404) return null;
        throw new Error("Failed to fetch manager profile");
      }
      return res.json();
    },
    enabled: Boolean(slug),
  });
  const { data: archiveData, isLoading: archiveLoading } = useQuery<ManagerArchiveResponse>({
    queryKey: ["/api/news/archive/manager", slug],
    queryFn: async () => {
      const res = await fetch(`/api/news/archive/manager/${slug}?limit=9`);
      if (!res.ok) throw new Error("Failed to fetch manager archive");
      return res.json();
    },
    enabled: Boolean(slug),
  });
  const [archiveArticles, setArchiveArticles] = useState<Article[]>([]);
  const [archiveCursor, setArchiveCursor] = useState<string | null>(null);
  const [archiveHasMore, setArchiveHasMore] = useState(false);
  const [archiveLoadingMore, setArchiveLoadingMore] = useState(false);
  useEffect(() => {
    if (!archiveData) return;
    setArchiveArticles(archiveData.articles ?? []);
    setArchiveCursor(archiveData.nextCursor ?? null);
    setArchiveHasMore(Boolean(archiveData.hasMore));
  }, [archiveData]);
  const loadMoreArchive = async () => {
    if (!archiveCursor || !archiveHasMore || archiveLoadingMore) return;
    setArchiveLoadingMore(true);
    try {
      const res = await fetch(
        `/api/news/archive/manager/${slug}?limit=9&cursor=${encodeURIComponent(archiveCursor)}`,
      );
      if (!res.ok) throw new Error("Failed to fetch more manager archive");
      const payload: ManagerArchiveResponse = await res.json();
      setArchiveArticles((prev) => [...prev, ...(payload.articles ?? [])]);
      setArchiveCursor(payload.nextCursor ?? null);
      setArchiveHasMore(Boolean(payload.hasMore));
    } finally {
      setArchiveLoadingMore(false);
    }
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="max-w-4xl mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold mb-4">Loading manager profile...</h1>
        </div>
      </MainLayout>
    );
  }

  if (!manager) {
    return (
      <MainLayout>
        <div className="max-w-4xl mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold mb-4">Manager not found</h1>
          <p className="text-muted-foreground mb-6">
            The manager profile is unavailable or out of current MVP scope.
          </p>
          <Link href="/teams">
            <Button variant="ghost" size="sm" data-testid="link-back-to-teams">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Teams
            </Button>
          </Link>
        </div>
      </MainLayout>
    );
  }

  const managerName = manager.name;
  const initials = managerName.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Link href={manager.team?.slug ? teamHub(manager.team.slug) : "/teams"}>
          <Button variant="ghost" size="sm" className="mb-6" data-testid="link-back-to-teams">
            <ArrowLeft className="h-4 w-4 mr-2" />
            {manager.team?.name ? `Back to ${manager.team.name}` : "Back to Teams"}
          </Button>
        </Link>

        <Card>
          <CardHeader>
            <div className="flex items-start gap-6">
              <Avatar className="h-24 w-24">
                <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <CardTitle className="text-2xl">{managerName}</CardTitle>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="secondary">Manager / Head Coach</Badge>
                </div>
                {manager.team?.name && (
                  <p className="text-sm text-muted-foreground mt-2">{manager.team.name}</p>
                )}
                {manager.nationality && (
                  <p className="text-sm text-muted-foreground mt-1">{manager.nationality}</p>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3 text-muted-foreground py-8">
              <Briefcase className="h-8 w-8" />
              <div>
                <p className="font-medium">More manager data coming soon</p>
                <p className="text-sm">Career history, trophies, and detailed information will be available here.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-lg">Related News</CardTitle>
          </CardHeader>
          <CardContent>
            {archiveLoading ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <ArticleCardSkeleton key={i} />
                ))}
              </div>
            ) : archiveArticles.length === 0 ? (
              <div className="text-center text-muted-foreground py-6">
                No related archive articles yet.
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {archiveArticles.map((article) => (
                    <ArticleCard key={article.id} article={article} />
                  ))}
                </div>
                {archiveHasMore && (
                  <div className="flex justify-center">
                    <Button variant="outline" onClick={loadMoreArchive} disabled={archiveLoadingMore}>
                      {archiveLoadingMore ? "Loading..." : "Load more"}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
