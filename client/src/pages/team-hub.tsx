import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { Heart, HeartOff, Calendar, Users, TrendingUp, AlertCircle, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { MainLayout } from "@/components/layout/main-layout";
import { ArticleCard } from "@/components/cards/article-card";
import { MatchCard } from "@/components/cards/match-card";
import { TransferCard } from "@/components/cards/transfer-card";
import { InjuryCard } from "@/components/cards/injury-card";
import { PostCard } from "@/components/cards/post-card";
import { NewsletterForm } from "@/components/newsletter-form";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Team, Article, Match, Transfer, Injury, Post, Player } from "@shared/schema";

export default function TeamHubPage() {
  const { slug } = useParams<{ slug: string }>();
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();

  const { data: team, isLoading: teamLoading } = useQuery<Team>({
    queryKey: ["/api/teams", slug],
  });

  const { data: articles } = useQuery<Article[]>({
    queryKey: ["/api/articles", "team", slug],
    enabled: !!team,
  });

  const { data: matches } = useQuery<(Match & { homeTeam?: Team; awayTeam?: Team })[]>({
    queryKey: ["/api/matches", "team", slug],
    enabled: !!team,
  });

  const { data: transfers } = useQuery<Transfer[]>({
    queryKey: ["/api/transfers", "team", slug],
    enabled: !!team,
  });

  const { data: injuries } = useQuery<Injury[]>({
    queryKey: ["/api/injuries", "team", slug],
    enabled: !!team,
  });

  const { data: players } = useQuery<Player[]>({
    queryKey: ["/api/players", "team", slug],
    enabled: !!team,
  });

  const { data: posts } = useQuery<(Post & { team?: Team })[]>({
    queryKey: ["/api/posts", "team", slug],
    enabled: !!team,
  });

  const { data: followedTeamIds } = useQuery<string[]>({
    queryKey: ["/api/follows"],
    enabled: isAuthenticated,
  });

  const isFollowing = team && followedTeamIds?.includes(team.id);

  const followMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/follows", { teamId: team?.id });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/follows"] });
      toast({ title: `Now following ${team?.name}!` });
    },
  });

  const unfollowMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("DELETE", `/api/follows/${team?.id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/follows"] });
      toast({ title: `Unfollowed ${team?.name}` });
    },
  });

  const handleFollowToggle = () => {
    if (!isAuthenticated) {
      window.location.href = "/api/login";
      return;
    }
    if (isFollowing) {
      unfollowMutation.mutate();
    } else {
      followMutation.mutate();
    }
  };

  const nextMatch = matches?.find((m) => new Date(m.kickoffTime) > new Date());

  if (teamLoading) {
    return (
      <MainLayout>
        <div className="max-w-7xl mx-auto px-4 py-8">
          <Skeleton className="h-48 w-full rounded-lg mb-8" />
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <Skeleton className="h-96 w-full rounded-lg" />
            </div>
            <Skeleton className="h-96 w-full rounded-lg" />
          </div>
        </div>
      </MainLayout>
    );
  }

  if (!team) {
    return (
      <MainLayout>
        <div className="max-w-4xl mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold mb-4">Team not found</h1>
          <Link href="/teams">
            <Button>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Teams
            </Button>
          </Link>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div
        className="relative py-16 mb-8"
        style={{
          background: `linear-gradient(to right, ${team.primaryColor || "#1a1a2e"}cc, ${team.primaryColor || "#1a1a2e"}88)`,
        }}
      >
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center gap-6">
            <div
              className="w-24 h-24 md:w-32 md:h-32 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: team.secondaryColor || "#ffffff" }}
            >
              {team.logoUrl ? (
                <img src={team.logoUrl} alt={team.name} className="w-20 h-20 md:w-24 md:h-24 object-contain" />
              ) : (
                <span className="text-4xl md:text-5xl font-bold" style={{ color: team.primaryColor }}>
                  {team.shortName?.[0] || team.name[0]}
                </span>
              )}
            </div>
            <div className="text-center md:text-left flex-1">
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-2">
                {team.name}
              </h1>
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 text-white/80">
                {team.stadiumName && <span>{team.stadiumName}</span>}
                {team.manager && <span>Manager: {team.manager}</span>}
                {team.founded && <span>Est. {team.founded}</span>}
              </div>
            </div>
            <Button
              size="lg"
              variant={isFollowing ? "secondary" : "default"}
              onClick={handleFollowToggle}
              disabled={followMutation.isPending || unfollowMutation.isPending}
              className="bg-white text-black hover:bg-white/90"
              data-testid="button-follow-team"
            >
              {isFollowing ? (
                <>
                  <HeartOff className="h-5 w-5 mr-2" />
                  Unfollow
                </>
              ) : (
                <>
                  <Heart className="h-5 w-5 mr-2" />
                  Follow
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 pb-12">
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="mb-6 flex-wrap h-auto gap-1">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="squad">Squad</TabsTrigger>
                <TabsTrigger value="fixtures">Fixtures</TabsTrigger>
                <TabsTrigger value="transfers">Transfers</TabsTrigger>
                <TabsTrigger value="injuries">Injuries</TabsTrigger>
                <TabsTrigger value="fans">Fans</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-6">
                <section>
                  <h2 className="text-xl font-bold mb-4">Latest News</h2>
                  {articles && articles.length > 0 ? (
                    <div className="grid sm:grid-cols-2 gap-4">
                      {articles.slice(0, 4).map((article) => (
                        <ArticleCard key={article.id} article={article} />
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">No news articles yet.</p>
                  )}
                </section>
              </TabsContent>

              <TabsContent value="squad" className="space-y-4">
                <h2 className="text-xl font-bold mb-4">Squad</h2>
                {players && players.length > 0 ? (
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {players.map((player) => (
                      <Card key={player.id} className="hover-elevate">
                        <CardContent className="p-4 flex items-center gap-4">
                          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                            {player.imageUrl ? (
                              <img src={player.imageUrl} alt={player.name} className="w-12 h-12 rounded-full object-cover" />
                            ) : (
                              <span className="text-lg font-bold text-muted-foreground">{player.number || player.name[0]}</span>
                            )}
                          </div>
                          <div>
                            <p className="font-semibold">{player.name}</p>
                            <p className="text-sm text-muted-foreground">{player.position}</p>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">Squad information coming soon.</p>
                )}
              </TabsContent>

              <TabsContent value="fixtures" className="space-y-4">
                <h2 className="text-xl font-bold mb-4">Fixtures & Results</h2>
                {matches && matches.length > 0 ? (
                  <div className="space-y-4">
                    {matches.map((match) => (
                      <MatchCard key={match.id} match={match} />
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">No fixtures available.</p>
                )}
              </TabsContent>

              <TabsContent value="transfers" className="space-y-4">
                <h2 className="text-xl font-bold mb-4">Transfer Activity</h2>
                {transfers && transfers.length > 0 ? (
                  <div className="grid sm:grid-cols-2 gap-4">
                    {transfers.map((transfer) => (
                      <TransferCard key={transfer.id} transfer={transfer} />
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">No transfer activity.</p>
                )}
              </TabsContent>

              <TabsContent value="injuries" className="space-y-4">
                <h2 className="text-xl font-bold mb-4">Injury Room</h2>
                {injuries && injuries.length > 0 ? (
                  <div className="grid sm:grid-cols-2 gap-4">
                    {injuries.map((injury) => (
                      <InjuryCard key={injury.id} injury={injury} />
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">No injuries reported.</p>
                )}
              </TabsContent>

              <TabsContent value="fans" className="space-y-4">
                <h2 className="text-xl font-bold mb-4">Fan Posts</h2>
                {posts && posts.length > 0 ? (
                  <div className="space-y-4">
                    {posts.map((post) => (
                      <PostCard key={post.id} post={post} />
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">No fan posts yet. Be the first!</p>
                )}
              </TabsContent>
            </Tabs>
          </div>

          <aside className="space-y-6">
            {nextMatch && (
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-primary" />
                    <CardTitle>Next Match</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <MatchCard match={nextMatch} />
                </CardContent>
              </Card>
            )}

            {injuries && injuries.length > 0 && (
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-red-500" />
                    <CardTitle>Injuries</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {injuries.slice(0, 3).map((injury) => (
                    <div key={injury.id} className="flex items-center justify-between">
                      <span className="font-medium">{injury.playerName}</span>
                      <Badge variant="outline" className={
                        injury.status === "OUT" ? "text-red-500 border-red-500" :
                        injury.status === "DOUBTFUL" ? "text-amber-500 border-amber-500" :
                        "text-green-500 border-green-500"
                      }>
                        {injury.status}
                      </Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {transfers && transfers.length > 0 && (
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-primary" />
                    <CardTitle>Transfer News</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {transfers.slice(0, 3).map((transfer) => (
                    <div key={transfer.id}>
                      <p className="font-medium">{transfer.playerName}</p>
                      <p className="text-sm text-muted-foreground">
                        {transfer.status === "confirmed" ? "Confirmed" : "Rumour"}
                        {transfer.fee && ` - ${transfer.fee}`}
                      </p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            <NewsletterForm
              edition={`${team.slug}-mad`}
              title={`${team.shortName || team.name} Mad`}
              description={`Get exclusive ${team.name} news and updates.`}
            />
          </aside>
        </div>
      </div>
    </MainLayout>
  );
}
