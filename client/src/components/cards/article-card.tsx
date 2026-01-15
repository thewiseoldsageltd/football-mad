import { Link } from "wouter";
import { Clock, Eye, Trophy } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { newsArticle } from "@/lib/urls";
import type { Article, Team } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";

interface ArticleCardProps {
  article: Article;
  featured?: boolean;
  teamBadge?: string;
  teamColor?: string;
  teams?: Team[];
}

interface TagPill {
  type: "competition" | "team" | "player";
  label: string;
  slug?: string;
  color?: string | null;
}

function extractPills(article: Article, teams?: Team[]): TagPill[] {
  const pills: TagPill[] = [];
  const teamSlugs = teams?.map(t => t.slug) || [];
  
  if (article.competition) {
    pills.push({
      type: "competition",
      label: article.competition,
      slug: article.competition.toLowerCase().replace(/\s+/g, "-"),
    });
  }
  
  if (teams && article.tags) {
    const articleTeams = teams.filter(t => article.tags?.includes(t.slug));
    for (const team of articleTeams) {
      pills.push({
        type: "team",
        label: team.shortName || team.name,
        slug: team.slug,
        color: team.primaryColor,
      });
    }
  }
  
  if (article.tags) {
    const playerTags = article.tags.filter(tag => 
      !teamSlugs.includes(tag) && 
      tag !== article.competition?.toLowerCase().replace(/\s+/g, "-")
    );
    for (const playerTag of playerTags) {
      const formattedName = playerTag
        .split("-")
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
      pills.push({
        type: "player",
        label: formattedName,
        slug: playerTag,
      });
    }
  }
  
  return pills;
}

export function ArticleCard({ article, featured = false, teamBadge, teamColor, teams }: ArticleCardProps) {
  const publishedAt = article.publishedAt ? new Date(article.publishedAt) : new Date();
  const viewCount = article.viewCount ?? 0;
  
  const teamCardStyle = teamColor ? { "--team-color": teamColor } as React.CSSProperties : undefined;
  
  const allPills = extractPills(article, teams);
  const displayPills = allPills.slice(0, 3);
  
  if (featured) {
    return (
      <Link href={newsArticle(article.slug)}>
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
              <div className="flex items-center gap-2 mb-3 flex-wrap">
                {displayPills.map((pill, idx) => (
                  <Badge 
                    key={`${pill.type}-${pill.slug || idx}`}
                    variant="secondary" 
                    className={`gap-1 ${pill.type === "competition" || pill.type === "player" ? "bg-white/20 text-white border-0" : ""}`}
                    style={pill.type === "team" && pill.color ? { 
                      backgroundColor: pill.color,
                      color: "white",
                      borderColor: pill.color 
                    } : undefined}
                  >
                    {pill.type === "competition" && <Trophy className="h-3 w-3" />}
                    {pill.type === "player" && <span className="w-2 h-2 rounded-full bg-current opacity-50" />}
                    {pill.label}
                  </Badge>
                ))}
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
    <Link href={newsArticle(article.slug)}>
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
            {displayPills.map((pill, idx) => (
              <Badge 
                key={`${pill.type}-${pill.slug || idx}`}
                variant={pill.type === "team" ? "outline" : "secondary"}
                className="text-xs gap-1"
                style={pill.type === "team" && pill.color ? { 
                  borderColor: pill.color,
                } : undefined}
              >
                {pill.type === "competition" && <Trophy className="h-3 w-3" />}
                {pill.type === "player" && <span className="w-2 h-2 rounded-full bg-current opacity-50" />}
                {pill.label}
              </Badge>
            ))}
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
