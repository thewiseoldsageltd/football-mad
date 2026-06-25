import { formatDistanceToNow } from "date-fns";
import { ChevronRight } from "lucide-react";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArticleCoverImage } from "@/components/article-cover-image";
import { newsArticle } from "@/lib/urls";
import type { EntityModuleData } from "@/hooks/use-article-entity-modules";
import type { Article } from "@shared/schema";

export function EntityArticleModule({ entity, articles, hubHref }: EntityModuleData) {
  return (
    <Card data-testid={`card-more-from-${entity.type}-${entity.slug}`}>
      <CardHeader className="pb-2 px-4 pt-4">
        <CardTitle className="text-sm font-semibold">More from {entity.name}</CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <div className="space-y-3">
          {articles.map((article) => (
            <Link key={article.id} href={newsArticle(article.slug)}>
              <div
                className="group flex gap-3 hover-elevate rounded p-1 -m-1 cursor-pointer"
                data-testid={`link-entity-article-${entity.slug}-${article.id}`}
              >
                <div className="w-16 h-12 rounded bg-muted flex-shrink-0 overflow-hidden">
                  <ArticleCoverImage article={article} variant="thumb" alt="" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium line-clamp-2 group-hover:text-primary transition-colors">
                    {article.title}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatDistanceToNow(new Date(article.publishedAt || new Date()), { addSuffix: true })}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
        <Link href={hubHref}>
          <span
            className="inline-flex items-center gap-1 mt-4 text-sm font-medium text-primary hover:underline"
            data-testid={`link-view-all-${entity.type}-${entity.slug}`}
          >
            View all
            <ChevronRight className="h-4 w-4" />
          </span>
        </Link>
      </CardContent>
    </Card>
  );
}
