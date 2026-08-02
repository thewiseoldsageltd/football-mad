import { Link } from "wouter";
import { ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ArticleCard } from "@/components/cards/article-card";
import type { Article, Team } from "@shared/schema";
import type { MatchCentreRelatedArticle } from "@shared/match-centre";

/**
 * Map Match Centre related-article payload into the Article shape ArticleCard expects.
 * Ranking/order is preserved by the caller — this only adapts fields.
 */
export function matchCentreArticleToCardArticle(
  article: MatchCentreRelatedArticle,
): Article {
  return {
    id: article.id,
    title: article.title,
    slug: article.slug,
    excerpt: article.excerpt,
    content: "",
    coverImage: article.coverImage,
    heroImageUrl: article.heroImageUrl ?? null,
    socialImageUrl: null,
    heroImageCredit: null,
    authorId: null,
    authorName: article.authorName ?? null,
    authorNameSlug: null,
    category: "news",
    competition: null,
    contentType: "team-news",
    tags: null,
    isFeatured: false,
    isTrending: false,
    isBreaking: false,
    isEditorPick: false,
    viewCount: article.viewCount ?? 0,
    commentsCount: 0,
    publishedAt: article.publishedAt ? new Date(article.publishedAt) : null,
    createdAt: null,
    updatedAt: null,
    source: "editorial",
    sourceId: null,
    sourceVersion: null,
    sourcePublishedAt: null,
    sourceUpdatedAt: null,
    sortAt: null,
    entityEnrichStatus: "done",
    entityEnrichAttemptedAt: null,
  } as Article;
}

type RelatedArticlesSectionProps = {
  articles: Article[];
  /** Cap after ranking — Match Centre uses 3; article pages pass through. */
  limit?: number;
  showMoreNews?: boolean;
  moreNewsHref?: string;
  /**
   * `page` — article-page Related Articles heading.
   * `compact` — Match Centre uppercase section heading.
   */
  headingStyle?: "page" | "compact";
  heading?: string;
  showPills?: boolean;
  teams?: Team[];
  testId?: string;
  className?: string;
};

/**
 * Shared Related Articles presentation used by article pages and Match Centre.
 * Equal-weight ArticleCard grid — no hero/lead card.
 */
export function RelatedArticlesSection({
  articles,
  limit,
  showMoreNews = false,
  moreNewsHref = "/news",
  headingStyle = "page",
  heading = "Related Articles",
  showPills = true,
  teams,
  testId = "related-articles",
  className = "",
}: RelatedArticlesSectionProps) {
  if (!articles.length) return null;
  const visible = typeof limit === "number" ? articles.slice(0, limit) : articles;
  if (!visible.length) return null;

  return (
    <section data-testid={testId} className={className}>
      <div
        className={
          headingStyle === "page"
            ? "flex items-center justify-between mb-6"
            : "flex items-center justify-between mb-3"
        }
      >
        <h2
          className={
            headingStyle === "page"
              ? "text-2xl font-bold"
              : "text-sm font-semibold tracking-wide text-muted-foreground uppercase"
          }
        >
          {heading}
        </h2>
        {showMoreNews ? (
          <Link href={moreNewsHref}>
            <Button variant="ghost" size="sm" className="gap-1">
              More News <ChevronRight className="h-4 w-4" />
            </Button>
          </Link>
        ) : null}
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {visible.map((article) => (
          <ArticleCard
            key={article.id}
            article={article}
            teams={teams}
            showPills={showPills}
          />
        ))}
      </div>
    </section>
  );
}
