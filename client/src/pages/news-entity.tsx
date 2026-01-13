import { useQuery } from "@tanstack/react-query";
import { MainLayout } from "@/components/layout/main-layout";
import { ArticleCard } from "@/components/cards/article-card";
import { ArticleCardSkeleton } from "@/components/skeletons";
import { Newspaper, Shield, Trophy } from "lucide-react";
import { isTeamSlug } from "@/lib/urls";
import type { Article } from "@shared/schema";

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
  const entityName = formatEntityName(slug);
  const isTeam = entityType === "team";

  const { data: articles, isLoading } = useQuery<Article[]>({
    queryKey: ["/api/articles", { tag: slug }],
  });

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-8">
          {isTeam ? (
            <Shield className="h-8 w-8 text-primary shrink-0" aria-hidden="true" />
          ) : (
            <Trophy className="h-8 w-8 text-primary shrink-0" aria-hidden="true" />
          )}
          <div>
            <h1 className="text-4xl md:text-5xl font-bold" data-testid="text-page-title">
              {entityName} News
            </h1>
            <p className="text-muted-foreground text-lg" data-testid="text-page-subtitle">
              Latest news and updates about {entityName}
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 9 }).map((_, i) => (
              <ArticleCardSkeleton key={i} />
            ))}
          </div>
        ) : articles && articles.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {articles.map((article) => (
              <ArticleCard key={article.id} article={article} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Newspaper className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              No articles found for {entityName}.
            </p>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
