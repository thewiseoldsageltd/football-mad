import { Link } from "wouter";
import { Clock, Eye, Zap, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { Article } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";

interface ArticleCardProps {
  article: Article;
  featured?: boolean;
  teamBadge?: string;
  teamColor?: string;
}

export function ArticleCard({ article, featured = false, teamBadge, teamColor }: ArticleCardProps) {
  const publishedAt = article.publishedAt ? new Date(article.publishedAt) : new Date();
  const viewCount = article.viewCount ?? 0;
  
  const teamCardStyle = teamColor ? { "--team-color": teamColor } as React.CSSProperties : undefined;
  
  if (featured) {
    return (
      <Link href={`/news/${article.slug}`}>
        <Card className="group overflow-hidden hover-elevate active-elevate-2 cursor-pointer" data-testid={`card-article-featured-${article.id}`}>
          <div className="relative aspect-[16/9] overflow-hidden">
            {article.coverImage ? (
              <img
                src={article.coverImage}
                alt={article.title}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center">
                <span className="text-6xl font-bold text-primary/30">F</span>
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-6">
              <div className="flex items-center gap-2 mb-3">
                {article.isBreaking && (
                  <Badge variant="destructive" className="gap-1">
                    <Zap className="h-3 w-3" />
                    Breaking
                  </Badge>
                )}
                {article.isEditorPick && (
                  <Badge variant="secondary" className="bg-amber-500/90 text-white border-0 gap-1">
                    <Star className="h-3 w-3" />
                    Editor's Pick
                  </Badge>
                )}
                <Badge variant="default" className="bg-primary text-primary-foreground">
                  {article.category || "News"}
                </Badge>
                {article.isTrending && (
                  <Badge variant="secondary" className="bg-white/20 text-white border-0">
                    Trending
                  </Badge>
                )}
              </div>
              <h3 className="text-2xl md:text-3xl font-bold text-white mb-2 line-clamp-2">
                {article.title}
              </h3>
              {article.excerpt && (
                <p className="text-white/80 text-sm md:text-base line-clamp-2 mb-3">
                  {article.excerpt}
                </p>
              )}
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
                {article.authorName && (
                  <span>By {article.authorName}</span>
                )}
              </div>
            </div>
          </div>
        </Card>
      </Link>
    );
  }

  return (
    <Link href={`/news/${article.slug}`}>
      <Card 
        className={`group h-full overflow-hidden hover-elevate active-elevate-2 cursor-pointer border ${teamColor ? "team-card-hover" : ""}`}
        style={teamCardStyle}
        data-testid={`card-article-${article.id}`}
      >
        <div className="relative aspect-[16/9] overflow-hidden">
          {article.coverImage ? (
            <img
              src={article.coverImage}
              alt={article.title}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center">
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
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            {article.isBreaking && (
              <Badge variant="destructive" className="text-xs gap-1">
                <Zap className="h-3 w-3" />
                Breaking
              </Badge>
            )}
            {article.isEditorPick && (
              <Badge variant="secondary" className="text-xs bg-amber-500/90 text-white border-0 gap-1">
                <Star className="h-3 w-3" />
                Pick
              </Badge>
            )}
            <Badge variant="secondary" className="text-xs">
              {article.category || "News"}
            </Badge>
            {article.isTrending && (
              <Badge variant="outline" className="text-xs">
                Trending
              </Badge>
            )}
          </div>
          <h3 className="font-semibold text-lg line-clamp-2 mb-2 group-hover:text-primary transition-colors">
            {article.title}
          </h3>
          {article.excerpt && (
            <p className="text-muted-foreground text-sm line-clamp-2 mb-3">
              {article.excerpt}
            </p>
          )}
          <div className="flex items-center gap-3 text-muted-foreground text-xs">
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
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
