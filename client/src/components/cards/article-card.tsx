import { Link } from "wouter";
import { Clock, Eye } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { EntityPill, type EntityData } from "@/components/entity-pill";
import { newsArticle } from "@/lib/urls";
import type { Article, Team } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";
import { buildEntitySets, selectTopPills, getCompShortCode, getTeamShortCode } from "@/lib/entity-utils";

interface ArticleCardProps {
  article: Article;
  featured?: boolean;
  teamBadge?: string;
  teamColor?: string;
  teams?: Team[];
}

function extractEntityPills(article: Article, teams?: Team[]): EntityData[] {
  const pills: EntityData[] = [];
  
  const entitySets = buildEntitySets(article, teams || []);
  const topPills = selectTopPills(entitySets);
  
  if (topPills.competitionPill) {
    const comp = topPills.competitionPill;
    pills.push({
      type: "competition",
      name: comp.name,
      slug: comp.slug,
      iconUrl: `/crests/comps/${comp.slug}.svg`,
      fallbackText: comp.name.slice(0, 2),
      shortLabel: getCompShortCode(comp.name),
    });
  }
  
  for (const team of topPills.teamPills) {
    pills.push({
      type: "team",
      name: team.shortName || team.name,
      slug: team.slug,
      iconUrl: `/crests/teams/${team.slug}.svg`,
      fallbackText: (team.shortName || team.name).slice(0, 2),
      color: team.primaryColor,
      shortLabel: getTeamShortCode({ name: team.name, shortName: team.shortName }),
    });
  }
  
  if (topPills.optionalThirdPill) {
    const entity = topPills.optionalThirdPill;
    const isPlayer = entity.source === "mention" || entity.source === "tag";
    pills.push({
      type: isPlayer ? "player" : "manager",
      name: entity.name,
      slug: entity.slug,
      fallbackText: entity.name.slice(0, 2).toUpperCase(),
    });
  }
  
  return pills.slice(0, 3);
}

export function ArticleCard({ article, featured = false, teamBadge, teamColor, teams }: ArticleCardProps) {
  const publishedAt = article.publishedAt ? new Date(article.publishedAt) : new Date();
  const viewCount = article.viewCount ?? 0;
  
  const teamCardStyle = teamColor ? { "--team-color": teamColor } as React.CSSProperties : undefined;
  
  const displayPills = extractEntityPills(article, teams);
  
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
                {displayPills.map((pill) => (
                  <EntityPill
                    key={`${pill.type}-${pill.slug}`}
                    entity={pill}
                    size="small"
                    className="bg-white/20 border-white/30 text-white [&_span]:text-white"
                    data-testid={`pill-${pill.type}-${pill.slug}`}
                  />
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
          <div className="flex items-center gap-1.5 mb-2 flex-wrap">
            {displayPills.map((pill) => (
              <EntityPill
                key={`${pill.type}-${pill.slug}`}
                entity={pill}
                size="small"
                data-testid={`pill-${pill.type}-${pill.slug}`}
              />
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
