import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { useEffect } from "react";
import { ArrowRight, TrendingUp, Calendar, Users, Newspaper, ShoppingBag, Mail, ChevronRight, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MainLayout } from "@/components/layout/main-layout";
import { ArticleCard } from "@/components/cards/article-card";
import { NewsletterForm } from "@/components/newsletter-form";
import { ArticleCardSkeleton } from "@/components/skeletons";
import { useAuth } from "@/hooks/use-auth";
import { getQueryFn } from "@/lib/queryClient";
import type { Article, Match, Team, Product } from "@shared/schema";
import { format, isToday } from "date-fns";

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

function TodaysMatchesStrip({ matches }: { matches: (Match & { homeTeam?: Team; awayTeam?: Team })[] }) {
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
          return (
            <Link key={match.id} href={`/matches/${match.slug}`}>
              <Card 
                className="flex-shrink-0 w-[200px] hover-elevate cursor-pointer"
                data-testid={`card-todays-match-${match.id}`}
              >
                <CardContent className="p-3">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <div 
                        className="w-6 h-6 rounded flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: match.homeTeam?.primaryColor || "#333" }}
                      >
                        <span className="text-[10px] font-bold text-white">
                          {match.homeTeam?.shortName?.slice(0, 3) || "H"}
                        </span>
                      </div>
                      <span className="text-sm font-medium truncate">{match.homeTeam?.shortName || "Home"}</span>
                    </div>
                    {match.homeScore !== null ? (
                      <span className="font-bold text-sm">{match.homeScore}</span>
                    ) : null}
                  </div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <div 
                        className="w-6 h-6 rounded flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: match.awayTeam?.primaryColor || "#333" }}
                      >
                        <span className="text-[10px] font-bold text-white">
                          {match.awayTeam?.shortName?.slice(0, 3) || "A"}
                        </span>
                      </div>
                      <span className="text-sm font-medium truncate">{match.awayTeam?.shortName || "Away"}</span>
                    </div>
                    {match.awayScore !== null ? (
                      <span className="font-bold text-sm">{match.awayScore}</span>
                    ) : null}
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
                    <span>{format(kickoffTime, "HH:mm")}</span>
                    {match.status === "live" ? (
                      <Badge className="bg-red-500 text-white text-[10px] py-0">LIVE</Badge>
                    ) : match.status === "finished" ? (
                      <Badge variant="secondary" className="text-[10px] py-0">FT</Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] py-0">Upcoming</Badge>
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


function NewsletterCTA() {
  return (
    <section className="mb-8" data-testid="section-newsletter">
      <Card className="bg-gradient-to-br from-primary/5 via-background to-primary/10">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-center gap-6">
            <div className="flex-shrink-0">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Mail className="h-8 w-8 text-primary" />
              </div>
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold mb-1">Stay in the Loop</h2>
              <p className="text-muted-foreground mb-4">
                Get the best football news delivered straight to your inbox. Daily updates, transfer scoops, and match previews.
              </p>
              <NewsletterForm compact />
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}

function ShopTeaser({ products }: { products: Product[] }) {
  const featuredProducts = products.slice(0, 3);

  return (
    <section className="mb-8" data-testid="section-shop">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <ShoppingBag className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-bold">Shop</h2>
        </div>
        <Link href="/shop">
          <Button variant="ghost" size="sm" className="gap-1" data-testid="link-visit-shop">
            Visit Shop <ChevronRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>
      <div className="grid sm:grid-cols-3 gap-4">
        {featuredProducts.length > 0 ? (
          featuredProducts.map((product) => (
            <Link key={product.id} href={`/shop`}>
              <Card className="hover-elevate cursor-pointer" data-testid={`card-product-${product.id}`}>
                <CardContent className="p-4">
                  <div className="aspect-square bg-muted rounded-lg mb-3 flex items-center justify-center">
                    {product.imageUrl ? (
                      <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover rounded-lg" />
                    ) : (
                      <ShoppingBag className="h-12 w-12 text-muted-foreground/30" />
                    )}
                  </div>
                  <h3 className="font-medium text-sm truncate">{product.name}</h3>
                  <p className="text-primary font-bold">{product.price}</p>
                </CardContent>
              </Card>
            </Link>
          ))
        ) : (
          <>
            {[1, 2, 3].map((i) => (
              <Card key={i} className="hover-elevate cursor-pointer">
                <CardContent className="p-4">
                  <div className="aspect-square bg-muted rounded-lg mb-3 flex items-center justify-center">
                    <ShoppingBag className="h-12 w-12 text-muted-foreground/30" />
                  </div>
                  <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                  <div className="h-5 bg-muted rounded w-1/4" />
                </CardContent>
              </Card>
            ))}
          </>
        )}
      </div>
      <div className="text-center mt-4">
        <Link href="/shop">
          <Button className="gap-2" data-testid="button-shop-now">
            <ShoppingBag className="h-4 w-4" />
            Shop Now
          </Button>
        </Link>
      </div>
    </section>
  );
}

export default function HomePage() {
  useSEO();
  const { isAuthenticated } = useAuth();

  const { data: articles = [], isLoading: articlesLoading } = useQuery<Article[]>({
    queryKey: ["/api/articles"],
  });

  const { data: allMatches = [] } = useQuery<(Match & { homeTeam?: Team; awayTeam?: Team })[]>({
    queryKey: ["/api/matches"],
  });

  const { data: followedTeamIds = [] } = useQuery<string[]>({
    queryKey: ["/api/follows"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: isAuthenticated,
  });

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  const heroArticle = articles.find((a) => a.isEditorPick) || articles[0];
  const todaysMatches = allMatches.filter((m) => isToday(new Date(m.kickoffTime)));
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

        <NewsletterCTA />

        <ShopTeaser products={products} />
      </div>
    </MainLayout>
  );
}
