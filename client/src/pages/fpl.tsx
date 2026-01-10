import { useQuery } from "@tanstack/react-query";
import { MainLayout } from "@/components/layout/main-layout";
import { ArticleCard } from "@/components/cards/article-card";
import { InjuryCard } from "@/components/cards/injury-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArticleCardSkeleton, InjuryCardSkeleton } from "@/components/skeletons";
import { Timer, TrendingUp, AlertCircle, Lightbulb } from "lucide-react";
import { differenceInDays, differenceInHours, differenceInMinutes, format } from "date-fns";
import { useState, useEffect } from "react";
import type { Article, Injury } from "@shared/schema";

function DeadlineCountdown({ deadline }: { deadline: Date }) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const days = differenceInDays(deadline, now);
  const hours = differenceInHours(deadline, now) % 24;
  const minutes = differenceInMinutes(deadline, now) % 60;

  if (deadline < now) {
    return (
      <div className="text-center">
        <p className="text-red-500 font-bold text-xl">Deadline Passed</p>
        <p className="text-muted-foreground">Next gameweek coming soon</p>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center gap-4">
      <div className="text-center">
        <div className="text-4xl md:text-5xl font-bold text-primary">{days}</div>
        <div className="text-sm text-muted-foreground uppercase tracking-wide">Days</div>
      </div>
      <div className="text-3xl font-bold text-muted-foreground">:</div>
      <div className="text-center">
        <div className="text-4xl md:text-5xl font-bold text-primary">{hours}</div>
        <div className="text-sm text-muted-foreground uppercase tracking-wide">Hours</div>
      </div>
      <div className="text-3xl font-bold text-muted-foreground">:</div>
      <div className="text-center">
        <div className="text-4xl md:text-5xl font-bold text-primary">{minutes}</div>
        <div className="text-sm text-muted-foreground uppercase tracking-wide">Mins</div>
      </div>
    </div>
  );
}

export default function FPLPage() {
  const nextDeadline = new Date();
  nextDeadline.setDate(nextDeadline.getDate() + 3);
  nextDeadline.setHours(11, 30, 0, 0);

  const { data: articles, isLoading: articlesLoading } = useQuery<Article[]>({
    queryKey: ["/api/articles", "category", "fpl"],
  });

  const { data: injuries, isLoading: injuriesLoading } = useQuery<Injury[]>({
    queryKey: ["/api/injuries"],
  });

  const fplRelevantInjuries = injuries?.filter((i) => i.status === "OUT" || i.status === "DOUBTFUL").slice(0, 6);

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-8">
          <Lightbulb className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-4xl md:text-5xl font-bold">FPL Hub</h1>
            <p className="text-muted-foreground text-lg">
              Fantasy Premier League tips, news, and analysis
            </p>
          </div>
        </div>

        <Card className="mb-8 bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Timer className="h-5 w-5 text-primary" />
              <CardTitle>GW20 Deadline</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <DeadlineCountdown deadline={nextDeadline} />
            <p className="text-center text-muted-foreground mt-4">
              {format(nextDeadline, "EEEE d MMMM yyyy, HH:mm")}
            </p>
          </CardContent>
        </Card>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <section>
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="h-5 w-5 text-primary" />
                <h2 className="text-2xl font-bold">FPL Analysis</h2>
              </div>
              {articlesLoading ? (
                <div className="grid sm:grid-cols-2 gap-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <ArticleCardSkeleton key={i} />
                  ))}
                </div>
              ) : articles && articles.length > 0 ? (
                <div className="grid sm:grid-cols-2 gap-4">
                  {articles.slice(0, 6).map((article) => (
                    <ArticleCard key={article.id} article={article} />
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Lightbulb className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">FPL content coming soon!</p>
                  </CardContent>
                </Card>
              )}
            </section>

            <section>
              <Card>
                <CardHeader>
                  <CardTitle>Quick Tips for GW20</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    <li className="flex items-start gap-3">
                      <Badge className="bg-primary mt-0.5">1</Badge>
                      <span>Check injury updates before the deadline - several key players are doubtful</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <Badge className="bg-primary mt-0.5">2</Badge>
                      <span>Consider fixture difficulty - some teams have favorable runs ahead</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <Badge className="bg-primary mt-0.5">3</Badge>
                      <span>Save your transfers if no urgent issues - double gameweeks may be coming</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </section>
          </div>

          <aside className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-red-500" />
                  <CardTitle>FPL Injury Watch</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {injuriesLoading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <InjuryCardSkeleton key={i} />
                  ))
                ) : fplRelevantInjuries && fplRelevantInjuries.length > 0 ? (
                  fplRelevantInjuries.map((injury) => (
                    <div key={injury.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div>
                        <p className="font-medium">{injury.playerName}</p>
                        <p className="text-xs text-muted-foreground">{injury.teamName}</p>
                      </div>
                      <div className="text-right">
                        <Badge
                          variant="outline"
                          className={
                            injury.status === "OUT"
                              ? "text-red-500 border-red-500"
                              : "text-amber-500 border-amber-500"
                          }
                        >
                          {injury.status}
                        </Badge>
                        {injury.confidencePercent && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {injury.confidencePercent}% confidence
                          </p>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-muted-foreground text-sm">No major injuries to report.</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Useful Links</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <a
                  href="https://fantasy.premierleague.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block p-3 rounded-lg bg-muted hover:bg-accent transition-colors"
                >
                  <p className="font-medium">Official FPL Site</p>
                  <p className="text-sm text-muted-foreground">Manage your team</p>
                </a>
                <a
                  href="https://www.premierleague.com/fixtures"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block p-3 rounded-lg bg-muted hover:bg-accent transition-colors"
                >
                  <p className="font-medium">Fixture Calendar</p>
                  <p className="text-sm text-muted-foreground">Plan ahead</p>
                </a>
              </CardContent>
            </Card>
          </aside>
        </div>
      </div>
    </MainLayout>
  );
}
