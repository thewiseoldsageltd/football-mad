import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { format } from "date-fns";
import { Calendar, MapPin, ArrowLeft, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { MainLayout } from "@/components/layout/main-layout";
import { ArticleCard } from "@/components/cards/article-card";
import type { Match, Team, Article } from "@shared/schema";

export default function MatchPage() {
  const { slug } = useParams<{ slug: string }>();

  const { data: match, isLoading } = useQuery<Match & { homeTeam?: Team; awayTeam?: Team }>({
    queryKey: ["/api/matches", slug],
  });

  const { data: relatedArticles } = useQuery<Article[]>({
    queryKey: ["/api/articles", "match", slug],
    enabled: !!match,
  });

  if (isLoading) {
    return (
      <MainLayout>
        <div className="max-w-5xl mx-auto px-4 py-8">
          <Skeleton className="h-64 w-full rounded-lg mb-8" />
          <Skeleton className="h-96 w-full rounded-lg" />
        </div>
      </MainLayout>
    );
  }

  if (!match) {
    return (
      <MainLayout>
        <div className="max-w-4xl mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold mb-4">Match not found</h1>
          <Link href="/matches">
            <Button>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Matches
            </Button>
          </Link>
        </div>
      </MainLayout>
    );
  }

  const kickoffTime = new Date(match.kickoffTime);
  const isLive = match.status === "live";
  const isFinished = match.status === "finished";

  return (
    <MainLayout>
      <div className="bg-card border-b">
        <div className="max-w-5xl mx-auto px-4 py-8">
          <Link href="/matches">
            <Button variant="ghost" size="sm" className="mb-6 -ml-2">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Matches
            </Button>
          </Link>

          <div className="flex items-center justify-center gap-2 mb-4">
            <Badge variant="outline">{match.competition}</Badge>
            {isLive && <Badge className="bg-red-500 text-white border-0 animate-pulse">LIVE</Badge>}
            {isFinished && <Badge variant="secondary">Full Time</Badge>}
          </div>

          <div className="flex items-center justify-center gap-8 md:gap-16">
            <Link href={`/teams/${match.homeTeam?.slug}`}>
              <div className="text-center group cursor-pointer">
                <div
                  className="w-20 h-20 md:w-24 md:h-24 mx-auto rounded-xl flex items-center justify-center mb-3 transition-transform group-hover:scale-105"
                  style={{ backgroundColor: match.homeTeam?.primaryColor || "#1a1a2e" }}
                >
                  {match.homeTeam?.logoUrl ? (
                    <img src={match.homeTeam.logoUrl} alt={match.homeTeam.name} className="w-14 h-14 md:w-18 md:h-18 object-contain" />
                  ) : (
                    <span className="text-2xl md:text-3xl font-bold text-white">
                      {match.homeTeam?.shortName?.[0] || "H"}
                    </span>
                  )}
                </div>
                <p className="font-semibold text-lg group-hover:text-primary transition-colors">
                  {match.homeTeam?.name || "Home"}
                </p>
              </div>
            </Link>

            <div className="text-center">
              {isFinished || (match.homeScore !== null && match.awayScore !== null) ? (
                <div className="text-4xl md:text-5xl font-bold">
                  {match.homeScore} - {match.awayScore}
                </div>
              ) : (
                <div className="text-2xl font-bold text-muted-foreground">
                  vs
                </div>
              )}
              {!isFinished && !isLive && (
                <p className="text-lg text-muted-foreground mt-2">
                  {format(kickoffTime, "HH:mm")}
                </p>
              )}
            </div>

            <Link href={`/teams/${match.awayTeam?.slug}`}>
              <div className="text-center group cursor-pointer">
                <div
                  className="w-20 h-20 md:w-24 md:h-24 mx-auto rounded-xl flex items-center justify-center mb-3 transition-transform group-hover:scale-105"
                  style={{ backgroundColor: match.awayTeam?.primaryColor || "#1a1a2e" }}
                >
                  {match.awayTeam?.logoUrl ? (
                    <img src={match.awayTeam.logoUrl} alt={match.awayTeam.name} className="w-14 h-14 md:w-18 md:h-18 object-contain" />
                  ) : (
                    <span className="text-2xl md:text-3xl font-bold text-white">
                      {match.awayTeam?.shortName?.[0] || "A"}
                    </span>
                  )}
                </div>
                <p className="font-semibold text-lg group-hover:text-primary transition-colors">
                  {match.awayTeam?.name || "Away"}
                </p>
              </div>
            </Link>
          </div>

          <div className="flex items-center justify-center gap-6 mt-6 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              {format(kickoffTime, "EEEE d MMMM yyyy")}
            </span>
            {match.venue && (
              <span className="flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                {match.venue}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8">
        <Tabs defaultValue="lineups" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="lineups">
              <Users className="h-4 w-4 mr-2" />
              Lineups
            </TabsTrigger>
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
            <TabsTrigger value="related">Related</TabsTrigger>
          </TabsList>

          <TabsContent value="lineups">
            <Card>
              <CardHeader>
                <CardTitle>Predicted Lineups</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-8">
                  <div>
                    <h3 className="font-semibold mb-4" style={{ color: match.homeTeam?.primaryColor }}>
                      {match.homeTeam?.name}
                    </h3>
                    <div className="bg-muted rounded-lg p-6 aspect-[3/4] flex items-center justify-center">
                      <p className="text-muted-foreground text-center">
                        Predicted lineup will be available closer to kick-off
                      </p>
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-4" style={{ color: match.awayTeam?.primaryColor }}>
                      {match.awayTeam?.name}
                    </h3>
                    <div className="bg-muted rounded-lg p-6 aspect-[3/4] flex items-center justify-center">
                      <p className="text-muted-foreground text-center">
                        Predicted lineup will be available closer to kick-off
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="timeline">
            <Card>
              <CardHeader>
                <CardTitle>Match Timeline</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 text-muted-foreground">
                  {isFinished || isLive ? (
                    <p>Match events will appear here</p>
                  ) : (
                    <p>Timeline will be available once the match starts</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="related">
            {relatedArticles && relatedArticles.length > 0 ? (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {relatedArticles.map((article) => (
                  <ArticleCard key={article.id} article={article} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <p>No related articles yet.</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
