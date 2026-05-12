import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { useEffect } from "react";
import { TrendingUp, Calendar, Users, Newspaper, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MainLayout } from "@/components/layout/main-layout";
import { ArticleCard } from "@/components/cards/article-card";
import { ArticleCardSkeleton } from "@/components/skeletons";
import { EntityAvatar } from "@/components/entity-media";
import { useAuth } from "@/hooks/use-auth";
import { getQueryFn } from "@/lib/queryClient";
import { compareCompetitionsByPriority, getCompetitionCountryById, getCompetitionDisplayRank, getPublicCompetitionDisplayName } from "@/components/matches/competition-priority";
import { getCountryFlagUrl } from "@/lib/flags";
import type { Article, Team } from "@shared/schema";
import { format } from "date-fns";

function useSEO() {
  useEffect(() => {
    document.title = "Football Mad – News, Teams, Transfers & Fan Insight";
    
    const baseUrl = window.location.origin;
    
    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.rel = "canonical";
      document.head.appendChild(canonical);
    }
    canonical.href = baseUrl + "/";

    const ensureMeta = (property: string, content: string, isProperty = false) => {
      const attr = isProperty ? "property" : "name";
      let tag = document.querySelector(`meta[${attr}="${property}"]`) as HTMLMetaElement | null;
      if (!tag) {
        tag = document.createElement("meta");
        tag.setAttribute(attr, property);
        document.head.appendChild(tag);
      }
      tag.content = content;
    };

    ensureMeta("description", "Your daily destination for Premier League news, match coverage, transfer rumours, and fan community.");
    ensureMeta("og:title", "Football Mad – News, Teams, Transfers & Fan Insight", true);
    ensureMeta("og:description", "Your daily destination for Premier League news, match coverage, transfer rumours, and fan community.", true);
    ensureMeta("og:url", baseUrl + "/", true);
    ensureMeta("og:type", "website", true);
    ensureMeta("og:site_name", "Football Mad", true);
    
    return () => {
      document.querySelector('link[rel="canonical"]')?.remove();
    };
  }, []);
}

function HeroStory({ article }: { article: Article }) {
  return (
    <section className="mb-8" data-testid="section-hero">
      <ArticleCard article={article} featured />
    </section>
  );
}

type HomeApiMatch = {
  id: string;
  slug: string;
  kickoffTime: string;
  status: string;
  homeScore: number | null;
  awayScore: number | null;
  competition: string | null;
  goalserveCompetitionId: string | null;
  homeTeam: {
    id?: string;
    name?: string;
    shortName?: string;
    nameFromRaw?: string;
  };
  awayTeam: {
    id?: string;
    name?: string;
    shortName?: string;
    nameFromRaw?: string;
  };
};

function normStatus(status?: string | null): string {
  return (status || "").toLowerCase();
}

function isLiveStatus(status?: string | null): boolean {
  const s = normStatus(status);
  return ["live", "inplay", "in_play", "ht", "halftime", "et", "extra_time", "pen", "penalties", "1h", "2h"].includes(s) || /^\d+$/.test(s);
}

function isFinishedStatus(status?: string | null): boolean {
  const s = normStatus(status);
  return ["finished", "ft", "full_time", "ended", "final", "aet", "pen"].includes(s);
}

function getMatchStatusRank(match: HomeApiMatch): number {
  if (isLiveStatus(match.status)) return 0;
  if (!isFinishedStatus(match.status)) return 1;
  return 2;
}

function getTeamDisplayName(team: HomeApiMatch["homeTeam"]): string {
  return team.name?.trim() || team.nameFromRaw?.trim() || team.shortName?.trim() || "Unknown";
}

function getMatchStatusText(match: HomeApiMatch): string {
  const s = normStatus(match.status);
  if (isLiveStatus(s)) {
    if (/^\d+$/.test(s)) return `${s}'`;
    if (s === "ht" || s === "halftime") return "HT";
    if (s === "et" || s === "extra_time") return "ET";
    if (s === "pen" || s === "penalties") return "Pens";
    return "LIVE";
  }
  if (isFinishedStatus(s)) return "FT";
  return format(new Date(match.kickoffTime), "HH:mm");
}

function getCompetitionFlagUrl(goalserveCompetitionId?: string | null): string | null {
  const country = getCompetitionCountryById(goalserveCompetitionId);
  return getCountryFlagUrl(country ?? undefined);
}

function TodaysMatchesStrip({ matches }: { matches: HomeApiMatch[] }) {
  if (matches.length === 0) return null;

  return (
    <section className="mb-8" data-testid="section-todays-matches">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-bold">Today's Matches</h2>
        </div>
        <Link href="/matches">
          <Button variant="ghost" size="sm" className="gap-1" data-testid="link-all-matches">
            All Matches <ChevronRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
        {matches.map((match) => {
          const kickoffTime = new Date(match.kickoffTime);
          const homeName = getTeamDisplayName(match.homeTeam);
          const awayName = getTeamDisplayName(match.awayTeam);
          const isLive = isLiveStatus(match.status);
          const isFinished = isFinishedStatus(match.status);
          const competitionLabel = getPublicCompetitionDisplayName(match.competition, match.goalserveCompetitionId);
          const competitionFlagUrl = getCompetitionFlagUrl(match.goalserveCompetitionId);
          return (
            <Link key={match.id} href={`/matches/${match.slug}`}>
              <Card 
                className="flex-shrink-0 w-[240px] hover-elevate cursor-pointer"
                data-testid={`card-todays-match-${match.id}`}
              >
                <CardContent className="p-3">
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="flex items-center gap-1.5 min-w-0 text-[11px] font-medium text-muted-foreground">
                      {competitionFlagUrl ? (
                        <img
                          src={competitionFlagUrl}
                          alt=""
                          aria-hidden="true"
                          className="h-3 w-4 rounded-[2px] object-cover flex-shrink-0"
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                          }}
                        />
                      ) : null}
                      <span className="truncate">{competitionLabel || "Match"}</span>
                    </span>
                    {isLive ? (
                      <Badge className="bg-red-500 text-white text-[10px] py-0">LIVE</Badge>
                    ) : isFinished ? (
                      <Badge variant="secondary" className="text-[10px] py-0">FT</Badge>
                    ) : null}
                  </div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 border border-border/60 bg-white/95 dark:bg-background/95 p-0.5 shadow-sm">
                        <EntityAvatar
                          entityType="team"
                          entityId={match.homeTeam.id}
                          label={homeName}
                          surface="hub_header"
                          sizeClassName="h-full w-full"
                          shape="square"
                          objectFit="contain"
                          className="rounded-md"
                        />
                      </div>
                      <span className="text-sm font-medium truncate">{homeName}</span>
                    </div>
                    {match.homeScore !== null ? (
                      <span className="font-bold text-sm">{match.homeScore}</span>
                    ) : null}
                  </div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 border border-border/60 bg-white/95 dark:bg-background/95 p-0.5 shadow-sm">
                        <EntityAvatar
                          entityType="team"
                          entityId={match.awayTeam.id}
                          label={awayName}
                          surface="hub_header"
                          sizeClassName="h-full w-full"
                          shape="square"
                          objectFit="contain"
                          className="rounded-md"
                        />
                      </div>
                      <span className="text-sm font-medium truncate">{awayName}</span>
                    </div>
                    {match.awayScore !== null ? (
                      <span className="font-bold text-sm">{match.awayScore}</span>
                    ) : null}
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
                    <span>{getMatchStatusText(match)}</span>
                    {isLive ? (
                      <span className="text-[11px] font-medium text-red-500">In play</span>
                    ) : isFinished ? (
                      <span className="text-[11px] font-medium">Full time</span>
                    ) : (
                      <span className="text-[11px] font-medium">Upcoming</span>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function ForYouSection({ 
  articles, 
  teams, 
  followedTeamIds 
}: { 
  articles: Article[]; 
  teams: Team[];
  followedTeamIds: string[];
}) {
  const followedSlugs = teams
    .filter(t => followedTeamIds.includes(t.id))
    .map(t => t.slug);

  const rankedArticles = [...articles]
    .map(article => {
      const matchCount = article.tags?.filter(tag => followedSlugs.includes(tag)).length || 0;
      const isBreaking = article.isBreaking ? 5 : 0;
      const isTrending = article.isTrending ? 3 : 0;
      const isEditorPick = article.isEditorPick ? 2 : 0;
      const score = (matchCount * 10) + isBreaking + isTrending + isEditorPick;
      return { article, score, matchCount };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 6)
    .map(({ article }) => article);

  if (rankedArticles.length === 0) return null;

  return (
    <section className="mb-8" data-testid="section-for-you">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-bold">For You</h2>
        </div>
        <Link href="/news?myTeams=true">
          <Button variant="ghost" size="sm" className="gap-1" data-testid="link-more-for-you">
            More <ChevronRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {rankedArticles.map((article) => (
          <ArticleCard key={article.id} article={article} />
        ))}
      </div>
    </section>
  );
}

function TrendingSection({ articles }: { articles: Article[] }) {
  const trendingArticles = articles
    .filter(a => a.isTrending)
    .slice(0, 8);

  if (trendingArticles.length === 0) return null;

  return (
    <section className="mb-8" data-testid="section-trending">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-bold">Trending Now</h2>
        </div>
        <Link href="/news?sort=trending">
          <Button variant="ghost" size="sm" className="gap-1" data-testid="link-more-trending">
            More <ChevronRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {trendingArticles.slice(0, 4).map((article) => (
          <ArticleCard key={article.id} article={article} />
        ))}
      </div>
      {trendingArticles.length > 4 && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
          {trendingArticles.slice(4, 8).map((article) => (
            <ArticleCard key={article.id} article={article} />
          ))}
        </div>
      )}
    </section>
  );
}

function LatestNewsSection({ articles, isLoading }: { articles: Article[]; isLoading: boolean }) {
  return (
    <section className="mb-8" data-testid="section-latest">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Newspaper className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-bold">Latest News</h2>
        </div>
        <Link href="/news">
          <Button variant="ghost" size="sm" className="gap-1" data-testid="link-more-news">
            More <ChevronRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>
      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <ArticleCardSkeleton key={i} />
          ))}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {articles.slice(0, 6).map((article) => (
            <ArticleCard key={article.id} article={article} />
          ))}
        </div>
      )}
    </section>
  );
}

export default function HomePage() {
  useSEO();
  const { isAuthenticated } = useAuth();

  const { data: articles = [], isLoading: articlesLoading } = useQuery<Article[]>({
    queryKey: ["/api/articles"],
  });

  const todayYmd = new Date().toISOString().slice(0, 10);
  const { data: allMatches = [] } = useQuery<HomeApiMatch[]>({
    queryKey: [`/api/matches/day?date=${todayYmd}&status=all&sort=competition&limit=200`],
  });

  const { data: followedTeamIds = [] } = useQuery<string[]>({
    queryKey: ["/api/follows"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: isAuthenticated,
  });

  const heroArticle = articles.find((a) => a.isEditorPick) || articles[0];
  const todaysMatches = [...allMatches]
    .filter((m) => Number.isFinite(getCompetitionDisplayRank(m.competition, m.goalserveCompetitionId)))
    .sort((a, b) => {
      const statusRank = getMatchStatusRank(a) - getMatchStatusRank(b);
      if (statusRank !== 0) return statusRank;

      if (getMatchStatusRank(a) === 1) {
        const kickoffDiff = new Date(a.kickoffTime).getTime() - new Date(b.kickoffTime).getTime();
        if (kickoffDiff !== 0) return kickoffDiff;
      }

      const compDiff = compareCompetitionsByPriority(
        { name: a.competition, goalserveCompetitionId: a.goalserveCompetitionId },
        { name: b.competition, goalserveCompetitionId: b.goalserveCompetitionId },
      );
      if (compDiff !== 0) return compDiff;

      return new Date(a.kickoffTime).getTime() - new Date(b.kickoffTime).getTime();
    })
    .slice(0, 12);
  const latestArticles = articles.filter((a) => a.id !== heroArticle?.id);
  const showForYou = isAuthenticated && followedTeamIds.length > 0;

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto px-4 py-6">
        {heroArticle && <HeroStory article={heroArticle} />}

        <TodaysMatchesStrip matches={todaysMatches} />

        {showForYou && (
          <ForYouSection 
            articles={latestArticles} 
            teams={[]} 
            followedTeamIds={followedTeamIds} 
          />
        )}

        <TrendingSection articles={articles} />

        <LatestNewsSection articles={latestArticles} isLoading={articlesLoading} />
      </div>
    </MainLayout>
  );
}
