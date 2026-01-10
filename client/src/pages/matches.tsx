import { useQuery } from "@tanstack/react-query";
import { MainLayout } from "@/components/layout/main-layout";
import { MatchCard } from "@/components/cards/match-card";
import { MatchCardSkeleton } from "@/components/skeletons";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar } from "lucide-react";
import { format, isToday, isTomorrow, addDays, startOfDay } from "date-fns";
import type { Match, Team } from "@shared/schema";

export default function MatchesPage() {
  const { data: matches, isLoading } = useQuery<(Match & { homeTeam?: Team; awayTeam?: Team })[]>({
    queryKey: ["/api/matches"],
  });

  const today = startOfDay(new Date());
  const tomorrow = addDays(today, 1);
  const thisWeek = addDays(today, 7);

  const todaysMatches = matches?.filter((m) => isToday(new Date(m.kickoffTime))) || [];
  const tomorrowsMatches = matches?.filter((m) => isTomorrow(new Date(m.kickoffTime))) || [];
  const upcomingMatches = matches?.filter((m) => {
    const kickoff = new Date(m.kickoffTime);
    return kickoff > tomorrow && kickoff <= thisWeek;
  }) || [];
  const pastMatches = matches?.filter((m) => new Date(m.kickoffTime) < today).reverse() || [];

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-8">
          <Calendar className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-4xl md:text-5xl font-bold">Matches</h1>
            <p className="text-muted-foreground text-lg">
              Premier League fixtures and results
            </p>
          </div>
        </div>

        <Tabs defaultValue="today" className="w-full">
          <TabsList className="mb-6 flex-wrap h-auto gap-1">
            <TabsTrigger value="today" className="gap-2">
              Today
              {todaysMatches.length > 0 && (
                <span className="bg-primary text-primary-foreground text-xs px-1.5 py-0.5 rounded-full">
                  {todaysMatches.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="tomorrow">Tomorrow</TabsTrigger>
            <TabsTrigger value="upcoming">This Week</TabsTrigger>
            <TabsTrigger value="results">Results</TabsTrigger>
          </TabsList>

          <TabsContent value="today">
            {isLoading ? (
              <div className="grid md:grid-cols-2 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <MatchCardSkeleton key={i} />
                ))}
              </div>
            ) : todaysMatches.length > 0 ? (
              <div className="grid md:grid-cols-2 gap-4">
                {todaysMatches.map((match) => (
                  <MatchCard key={match.id} match={match} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No matches today</h3>
                <p className="text-muted-foreground">Check back tomorrow for more action.</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="tomorrow">
            {isLoading ? (
              <div className="grid md:grid-cols-2 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <MatchCardSkeleton key={i} />
                ))}
              </div>
            ) : tomorrowsMatches.length > 0 ? (
              <div className="grid md:grid-cols-2 gap-4">
                {tomorrowsMatches.map((match) => (
                  <MatchCard key={match.id} match={match} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No matches scheduled for tomorrow.</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="upcoming">
            {isLoading ? (
              <div className="grid md:grid-cols-2 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <MatchCardSkeleton key={i} />
                ))}
              </div>
            ) : upcomingMatches.length > 0 ? (
              <div className="grid md:grid-cols-2 gap-4">
                {upcomingMatches.map((match) => (
                  <MatchCard key={match.id} match={match} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No matches scheduled for this week.</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="results">
            {isLoading ? (
              <div className="grid md:grid-cols-2 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <MatchCardSkeleton key={i} />
                ))}
              </div>
            ) : pastMatches.length > 0 ? (
              <div className="grid md:grid-cols-2 gap-4">
                {pastMatches.slice(0, 20).map((match) => (
                  <MatchCard key={match.id} match={match} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No results available yet.</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
