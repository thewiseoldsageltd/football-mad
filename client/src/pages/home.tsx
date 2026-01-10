import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { ArrowRight, TrendingUp, Calendar, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MainLayout } from "@/components/layout/main-layout";
import { ArticleCard } from "@/components/cards/article-card";
import { MatchCard } from "@/components/cards/match-card";
import { TransferCard } from "@/components/cards/transfer-card";
import { NewsletterForm } from "@/components/newsletter-form";
import { ArticleCardSkeleton, MatchCardSkeleton, TransferCardSkeleton } from "@/components/skeletons";
import { useAuth } from "@/hooks/use-auth";
import type { Article, Match, Team, Transfer } from "@shared/schema";

export default function HomePage() {
  const { user, isAuthenticated } = useAuth();

  const { data: articles, isLoading: articlesLoading } = useQuery<Article[]>({
    queryKey: ["/api/articles"],
  });

  const { data: matches, isLoading: matchesLoading } = useQuery<(Match & { homeTeam?: Team; awayTeam?: Team })[]>({
    queryKey: ["/api/matches", "upcoming"],
  });

  const { data: transfers, isLoading: transfersLoading } = useQuery<Transfer[]>({
    queryKey: ["/api/transfers", "latest"],
  });

  const { data: teams } = useQuery<Team[]>({
    queryKey: ["/api/teams"],
  });

  const { data: followedTeamIds } = useQuery<string[]>({
    queryKey: ["/api/follows"],
    enabled: isAuthenticated,
  });

  const featuredArticle = articles?.find((a) => a.isFeatured) || articles?.[0];
  const regularArticles = articles?.filter((a) => a.id !== featuredArticle?.id).slice(0, 5) || [];
  const trendingArticles = articles?.filter((a) => a.isTrending).slice(0, 5) || [];
  const upcomingMatches = matches?.slice(0, 3) || [];
  const latestTransfers = transfers?.slice(0, 4) || [];

  const forYouArticles = isAuthenticated && followedTeamIds?.length
    ? articles?.filter((a) => 
        a.tags?.some(tag => 
          teams?.some(t => followedTeamIds.includes(t.id) && t.slug === tag)
        )
      ).slice(0, 4) || []
    : [];

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto px-4 py-6">
        {isAuthenticated && user && (
          <div className="mb-6 p-4 bg-gradient-to-r from-primary/10 to-transparent rounded-lg border border-primary/20">
            <p className="text-lg">
              Welcome back, <span className="font-semibold">{user.firstName || "Fan"}</span>!
            </p>
          </div>
        )}

        {featuredArticle && (
          <section className="mb-8">
            <ArticleCard article={featuredArticle} featured />
          </section>
        )}

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            {forYouArticles.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    <h2 className="text-2xl font-bold">For You</h2>
                  </div>
                  <Link href="/news">
                    <Button variant="ghost" size="sm" className="gap-1" data-testid="link-see-more-for-you">
                      See more <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  {forYouArticles.map((article) => (
                    <ArticleCard key={article.id} article={article} />
                  ))}
                </div>
              </section>
            )}

            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold">Latest News</h2>
                <Link href="/news">
                  <Button variant="ghost" size="sm" className="gap-1" data-testid="link-see-more-news">
                    See more <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
              {articlesLoading ? (
                <div className="grid sm:grid-cols-2 gap-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <ArticleCardSkeleton key={i} />
                  ))}
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 gap-4">
                  {regularArticles.map((article) => (
                    <ArticleCard key={article.id} article={article} />
                  ))}
                </div>
              )}
            </section>

            <section>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  <h2 className="text-2xl font-bold">Upcoming Matches</h2>
                </div>
                <Link href="/matches">
                  <Button variant="ghost" size="sm" className="gap-1" data-testid="link-see-more-matches">
                    See more <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
              {matchesLoading ? (
                <div className="grid gap-4">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <MatchCardSkeleton key={i} />
                  ))}
                </div>
              ) : (
                <div className="grid gap-4">
                  {upcomingMatches.map((match) => (
                    <MatchCard key={match.id} match={match} />
                  ))}
                </div>
              )}
            </section>

            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold">Transfer Centre</h2>
                <Link href="/transfers">
                  <Button variant="ghost" size="sm" className="gap-1" data-testid="link-see-more-transfers">
                    See more <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
              {transfersLoading ? (
                <div className="grid sm:grid-cols-2 gap-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <TransferCardSkeleton key={i} />
                  ))}
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 gap-4">
                  {latestTransfers.map((transfer) => (
                    <TransferCard key={transfer.id} transfer={transfer} />
                  ))}
                </div>
              )}
            </section>
          </div>

          <aside className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  <CardTitle>Trending</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {articlesLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex gap-3 items-start">
                      <span className="text-2xl font-bold text-muted-foreground">{i + 1}</span>
                      <div className="flex-1">
                        <div className="h-4 bg-muted rounded animate-pulse mb-1" />
                        <div className="h-3 w-16 bg-muted rounded animate-pulse" />
                      </div>
                    </div>
                  ))
                ) : (
                  trendingArticles.map((article, index) => (
                    <Link key={article.id} href={`/news/${article.slug}`}>
                      <div className="flex gap-3 items-start group cursor-pointer" data-testid={`link-trending-${article.id}`}>
                        <span className="text-2xl font-bold text-muted-foreground group-hover:text-primary transition-colors">
                          {index + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm line-clamp-2 group-hover:text-primary transition-colors">
                            {article.title}
                          </p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                            <TrendingUp className="h-3 w-3" />
                            {article.viewCount?.toLocaleString() || 0} views
                          </p>
                        </div>
                      </div>
                    </Link>
                  ))
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Premier League Teams</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {teams?.slice(0, 10).map((team) => (
                    <Link key={team.id} href={`/teams/${team.slug}`}>
                      <Badge
                        variant="outline"
                        className="cursor-pointer hover:bg-accent transition-colors"
                        data-testid={`badge-team-${team.slug}`}
                      >
                        {team.shortName || team.name}
                      </Badge>
                    </Link>
                  ))}
                </div>
                <Link href="/teams">
                  <Button variant="ghost" size="sm" className="w-full mt-3 gap-1" data-testid="link-view-all-teams">
                    View all teams <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <NewsletterForm />

            <Card>
              <CardHeader>
                <CardTitle>Shop</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">
                  Get the latest Football Mad merchandise and club-edition gear.
                </p>
                <Link href="/shop">
                  <Button className="w-full" data-testid="link-shop-now">
                    Shop Now
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </aside>
        </div>
      </div>
    </MainLayout>
  );
}
