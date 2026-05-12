import { Link } from "wouter";
import { Clock, Eye } from "lucide-react";
import { effectiveAuthorProfileSlug } from "@shared/author-slug";
import { formatAuthorForUi } from "@shared/author-display";
import { authorProfile } from "@/lib/urls";
import { Card, CardContent } from "@/components/ui/card";
import { type EntityData } from "@/components/entity-pill";
import { PillsRow } from "@/components/pills-row";
import { newsArticle } from "@/lib/urls";
import type { Article, Team } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";
import { buildPillsForCard, type PillSourceArticle } from "@/lib/entity-utils";

interface ArticleCardProps {
  article: Article;
  featured?: boolean;
  featuredHeadlineOnly?: boolean;
  teamBadge?: string;
  teamColor?: string;
  teams?: Team[];
  showPills?: boolean;
}

function extractEntityPills(article: Article, teams?: Team[]): EntityData[] {
  return buildPillsForCard(article as PillSourceArticle, teams || []);
}

function getCardExcerpt(article: Article): string | null {
  const anyArticle = article as unknown as {
    excerpt?: string | null;
    summary?: string | null;
    description?: string | null;
    snippet?: string | null;
    openingText?: string | null;
    content?: string | null;
  };
  const stripHtml = (value: string) => value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  const fromContent = anyArticle.content ? stripHtml(anyArticle.content) : "";
  const fromOpening = anyArticle.openingText?.trim() || "";
  const fallback = (fromOpening || fromContent).slice(0, 180).trim();
  return (
    anyArticle.excerpt?.trim() ||
    anyArticle.summary?.trim() ||
    anyArticle.description?.trim() ||
    anyArticle.snippet?.trim() ||
    (fallback.length > 0 ? `${fallback}${fallback.length >= 180 ? "..." : ""}` : null) ||
    null
  );
}

export function ArticleCard({
  article,
  featured = false,
  featuredHeadlineOnly = false,
  teamBadge,
  teamColor,
  teams,
  showPills = true,
}: ArticleCardProps) {
  const publishedAt = article.publishedAt ? new Date(article.publishedAt) : new Date();
  const viewCount = article.viewCount ?? 0;
  const cardExcerpt = getCardExcerpt(article);
  const authorSlug = effectiveAuthorProfileSlug(article);
  const authorLine = article.authorName ? formatAuthorForUi(article.authorName) : "";

  const teamCardStyle = teamColor ? { "--team-color": teamColor } as React.CSSProperties : undefined;
  
  const displayPills = showPills ? extractEntityPills(article, teams) : [];
  
  if (featured) {
    return (
      <Card className="group relative overflow-hidden hover-elevate active-elevate-2 cursor-pointer" data-testid={`card-article-featured-${article.id}`}>
        <Link
          href={newsArticle(article.slug)}
          className="absolute inset-0 z-10"
          aria-label={article.title}
          data-testid={`link-article-featured-${article.id}`}
        />
        <div className="relative aspect-video overflow-hidden rounded-t-xl bg-black/5">
          {article.coverImage ? (
            <img
              src={article.coverImage}
              alt={article.title}
              className="h-full w-full object-cover object-[center_top] transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center">
              <span className="text-6xl font-bold text-primary/30">F</span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
          <div className={`absolute bottom-0 left-0 right-0 ${featuredHeadlineOnly ? "p-5 md:p-6" : "p-6"}`}>
            {!featuredHeadlineOnly && (
              <div className="relative z-20 mb-2">
                <PillsRow
                  pills={displayPills}
                  max={3}
                  className="mb-2"
                  pillClassName="bg-white/20 border-white/30 text-white [&_span]:text-white"
                  constrainHeight={false}
                />
              </div>
            )}
            <h3 className={`text-white line-clamp-2 ${featuredHeadlineOnly ? "text-2xl md:text-3xl font-bold" : "text-2xl md:text-3xl font-bold mt-2 mb-2"}`}>
              {article.title}
            </h3>
            {!featuredHeadlineOnly && cardExcerpt && (
              <p className="text-white/80 text-sm md:text-base line-clamp-2 mb-3">
                {cardExcerpt}
              </p>
            )}
            {!featuredHeadlineOnly && (
              <div className="flex items-center gap-4 text-white/60 text-sm">
                <span className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {formatDistanceToNow(publishedAt, { addSuffix: true })}
                </span>
                {viewCount > 0 && (
                  <span className="flex items-center gap-1">
                    <Eye className="h-4 w-4" />
                    {viewCount.toLocaleString()}
                  </span>
                )}
                {authorLine && authorSlug ? (
                  <span className="relative z-20">
                    By{" "}
                    <Link
                      href={authorProfile(authorSlug)}
                      className="hover:underline font-medium"
                      onClick={(e) => e.stopPropagation()}
                      data-testid="link-card-author"
                    >
                      {authorLine}
                    </Link>
                  </span>
                ) : authorLine ? (
                  <span>By {authorLine}</span>
                ) : null}
              </div>
            )}
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card 
      className={`group relative h-full overflow-hidden hover-elevate active-elevate-2 cursor-pointer border ${teamColor ? "team-card-hover" : ""}`}
      style={teamCardStyle}
      data-testid={`card-article-${article.id}`}
    >
      <Link
        href={newsArticle(article.slug)}
        className="absolute inset-0 z-10"
        aria-label={article.title}
        data-testid={`link-article-${article.id}`}
      />
      <div className="relative aspect-video overflow-hidden rounded-t-xl bg-black/5">
        {article.coverImage ? (
          <img
            src={article.coverImage}
            alt={article.title}
            className="h-full w-full object-cover object-[center_top] transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center">
            <span className="text-4xl font-bold text-muted-foreground/30">F</span>
          </div>
        )}
        {teamBadge && (
          <div className="absolute top-3 right-3">
            <img src={teamBadge} alt="Team" className="h-8 w-8 drop-shadow-lg" />
          </div>
        )}
      </div>
      <CardContent className="p-4">
        <div className="relative z-20">
          <PillsRow pills={displayPills} max={3} className="mb-2" constrainHeight={false} />
        </div>
        <h3 className="font-semibold text-lg line-clamp-2 mt-2 mb-2 group-hover:text-primary transition-colors">
          {article.title}
        </h3>
        {cardExcerpt && (
          <p className="text-muted-foreground text-sm line-clamp-2 mb-3">
            {cardExcerpt}
          </p>
        )}
        <div className="flex items-center gap-3 text-muted-foreground text-xs flex-wrap">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {formatDistanceToNow(publishedAt, { addSuffix: true })}
          </span>
          {viewCount > 0 && (
            <span className="flex items-center gap-1">
              <Eye className="h-3 w-3" />
              {viewCount.toLocaleString()}
            </span>
          )}
          {authorLine && authorSlug ? (
            <span className="relative z-20">
              By{" "}
              <Link
                href={authorProfile(authorSlug)}
                className="hover:text-foreground hover:underline font-medium"
                onClick={(e) => e.stopPropagation()}
                data-testid="link-card-author-inline"
              >
                {authorLine}
              </Link>
            </span>
          ) : authorLine ? (
            <span className="relative z-20">By {authorLine}</span>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
