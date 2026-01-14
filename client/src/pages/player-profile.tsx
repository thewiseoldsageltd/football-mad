import { useMemo, useState } from "react";
import { useRoute, Link } from "wouter";
import { ArrowLeft, Trophy, Activity, ArrowRightLeft, Calendar, Clock, Shirt, MapPin, ChevronRight, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { MainLayout } from "@/components/layout/main-layout";
import { teamHub } from "@/lib/urls";
import { getPlayerProfile, type GoalservePlayerProfile, type CareerSeasonRow, type TransferEntry, type SidelinedEntry, type TrophyEntry } from "@/lib/mock/goalserveMock";

function getInitials(name: string): string {
  const parts = name.split(" ");
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
}

function formatStat(value: string | number | undefined | null): string {
  if (value === undefined || value === null || value === "") return "–";
  return String(value);
}

function StatBlock({ label, value }: { label: string; value: string | number | undefined | null }) {
  const displayValue = formatStat(value);
  return (
    <div className="text-center p-3 rounded-lg bg-muted/50">
      <div className="text-2xl font-bold">{displayValue}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

function CareerTable({ data }: { data: CareerSeasonRow[] }) {
  if (data.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-8">
        No data available for this competition.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b">
            <th className="text-left py-2 px-2 font-medium text-muted-foreground">Season</th>
            <th className="text-left py-2 px-2 font-medium text-muted-foreground">Club</th>
            <th className="text-center py-2 px-2 font-medium text-muted-foreground">Apps</th>
            <th className="text-center py-2 px-2 font-medium text-muted-foreground">Goals</th>
            <th className="text-center py-2 px-2 font-medium text-muted-foreground">Assists</th>
            <th className="text-center py-2 px-2 font-medium text-muted-foreground">Mins</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, idx) => (
            <tr key={`${row.season}-${row.club}-${idx}`} className="border-b last:border-0 hover:bg-muted/30">
              <td className="py-2 px-2">{formatStat(row.season)}</td>
              <td className="py-2 px-2">{formatStat(row.club)}</td>
              <td className="py-2 px-2 text-center">{formatStat(row.apps)}</td>
              <td className="py-2 px-2 text-center">{formatStat(row.goals)}</td>
              <td className="py-2 px-2 text-center">{formatStat(row.assists)}</td>
              <td className="py-2 px-2 text-center">{formatStat(row.minutes)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TransferTimeline({ transfers }: { transfers: TransferEntry[] }) {
  if (transfers.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-8">
        No transfer history available.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {transfers.map((transfer, idx) => (
        <div key={idx} className="flex items-start gap-4">
          <div className="w-24 text-xs text-muted-foreground shrink-0 pt-1">
            {new Date(transfer.date).toLocaleDateString("en-GB", { 
              year: "numeric", 
              month: "short" 
            })}
          </div>
          <div className="relative flex-1">
            <div className="absolute left-0 top-2 w-2 h-2 rounded-full bg-primary" />
            {idx < transfers.length - 1 && (
              <div className="absolute left-[3px] top-4 w-0.5 h-full bg-border" />
            )}
            <div className="pl-6">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium">{transfer.from}</span>
                <ArrowRightLeft className="h-3 w-3 text-muted-foreground" />
                <span className="font-medium">{transfer.to}</span>
              </div>
              <Badge variant="outline" className="mt-1">{transfer.fee}</Badge>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function SidelinedTimeline({ sidelined }: { sidelined: SidelinedEntry[] }) {
  if (sidelined.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-8 flex flex-col items-center gap-2">
        <Activity className="h-8 w-8 text-green-500" />
        <p>No significant injury or suspension history.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {sidelined.map((entry, idx) => (
        <div key={idx} className="flex items-start gap-4">
          <div className="w-24 text-xs text-muted-foreground shrink-0 pt-1">
            {new Date(entry.start).toLocaleDateString("en-GB", { 
              year: "numeric", 
              month: "short" 
            })}
          </div>
          <div className="relative flex-1">
            <div className={`absolute left-0 top-2 w-2 h-2 rounded-full ${entry.type === "injury" ? "bg-red-500" : "bg-orange-500"}`} />
            {idx < sidelined.length - 1 && (
              <div className="absolute left-[3px] top-4 w-0.5 h-full bg-border" />
            )}
            <div className="pl-6">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant={entry.type === "injury" ? "destructive" : "secondary"}>
                  {entry.type === "injury" ? "Injury" : "Suspension"}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {new Date(entry.start).toLocaleDateString("en-GB", { day: "numeric", month: "short" })} - {new Date(entry.end).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                </span>
              </div>
              <p className="text-sm mt-1">{entry.description}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function TrophyList({ trophies }: { trophies: TrophyEntry[] }) {
  if (trophies.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-8 flex flex-col items-center gap-2">
        <Trophy className="h-8 w-8 text-muted-foreground" />
        <p>No trophies recorded yet.</p>
      </div>
    );
  }

  const grouped = useMemo(() => {
    const map = new Map<string, string[]>();
    trophies.forEach(t => {
      if (!map.has(t.competition)) {
        map.set(t.competition, []);
      }
      map.get(t.competition)!.push(t.season);
    });
    return Array.from(map.entries());
  }, [trophies]);

  return (
    <div className="space-y-3">
      {grouped.map(([competition, seasons]) => (
        <div key={competition} className="flex items-start gap-3">
          <Trophy className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
          <div>
            <p className="font-medium">{competition}</p>
            <p className="text-sm text-muted-foreground">{seasons.join(", ")}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function PlayerProfilePage() {
  const [, params] = useRoute("/players/:slug");
  const slug = params?.slug || "";
  const [activeTab, setActiveTab] = useState("domesticLeague");

  const player = useMemo(() => {
    return getPlayerProfile(slug);
  }, [slug]);

  if (!player) {
    return (
      <MainLayout>
        <div className="max-w-4xl mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold mb-4">Player not found</h1>
          <p className="text-muted-foreground mb-6">
            The player you're looking for doesn't exist or detailed profile data is not yet available.
          </p>
          <Link href="/teams">
            <Button data-testid="link-back-to-teams">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Teams
            </Button>
          </Link>
        </div>
      </MainLayout>
    );
  }

  const initials = getInitials(player.name);
  const summary = player.seasonSummary;

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {player.currentClubSlug && (
          <Link href={teamHub(player.currentClubSlug)}>
            <Button variant="ghost" size="sm" className="mb-2" data-testid="link-back-to-team">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to {player.currentClubName}
            </Button>
          </Link>
        )}

        <Card>
          <CardHeader className="pb-4">
            <div className="flex flex-col sm:flex-row items-start gap-6">
              <Avatar className="h-24 w-24 sm:h-32 sm:w-32">
                {player.imageBase64 ? (
                  <AvatarImage src={`data:image/jpeg;base64,${player.imageBase64}`} alt={player.name} />
                ) : null}
                <AvatarFallback className="text-2xl sm:text-3xl bg-primary/10 text-primary">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <CardTitle className="text-2xl sm:text-3xl">{player.name}</CardTitle>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <Badge variant="secondary" className="text-sm">{player.positionText}</Badge>
                  {player.nationality && (
                    <span className="text-sm text-muted-foreground flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {player.nationality}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-sm text-muted-foreground">
                  {player.age && (
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {player.age} years
                    </span>
                  )}
                  {player.height && (
                    <span className="flex items-center gap-1">
                      <Shirt className="h-3 w-3" />
                      {player.height}
                    </span>
                  )}
                  {player.preferredFoot && (
                    <span>Preferred foot: {player.preferredFoot}</span>
                  )}
                </div>
                {player.currentClubName && player.currentClubSlug && (
                  <Link href={teamHub(player.currentClubSlug)}>
                    <span className="inline-flex items-center text-sm text-primary hover:underline mt-2 cursor-pointer" data-testid="link-club">
                      {player.currentClubName} <ChevronRight className="h-4 w-4" />
                    </span>
                  </Link>
                )}
              </div>
            </div>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Star className="h-5 w-5 text-amber-500" />
              This Season
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
              <StatBlock label="Minutes" value={summary.minutes} />
              <StatBlock label="Apps" value={summary.appearances} />
              <StatBlock label="Goals" value={summary.goals} />
              <StatBlock label="Assists" value={summary.assists} />
              <StatBlock 
                label="Cards" 
                value={`${summary.yellowcards}/${summary.redcards}`} 
              />
              <StatBlock label="Rating" value={summary.rating} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Career Statistics</CardTitle>
            <CardDescription>Performance across different competitions</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid grid-cols-4 mb-4">
                <TabsTrigger value="domesticLeague" data-testid="tab-domestic-league">League</TabsTrigger>
                <TabsTrigger value="domesticCups" data-testid="tab-domestic-cups">Cups</TabsTrigger>
                <TabsTrigger value="intlClubCups" data-testid="tab-intl-cups">Europe</TabsTrigger>
                <TabsTrigger value="international" data-testid="tab-international">Intl</TabsTrigger>
              </TabsList>
              <TabsContent value="domesticLeague">
                <CareerTable data={player.careerStatsTabs.domesticLeague} />
              </TabsContent>
              <TabsContent value="domesticCups">
                <CareerTable data={player.careerStatsTabs.domesticCups} />
              </TabsContent>
              <TabsContent value="intlClubCups">
                <CareerTable data={player.careerStatsTabs.intlClubCups} />
              </TabsContent>
              <TabsContent value="international">
                <CareerTable data={player.careerStatsTabs.international} />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <ArrowRightLeft className="h-5 w-5 text-blue-500" />
                Transfer History
              </CardTitle>
            </CardHeader>
            <CardContent>
              <TransferTimeline transfers={player.transfers} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Activity className="h-5 w-5 text-red-500" />
                Injury / Suspension History
              </CardTitle>
            </CardHeader>
            <CardContent>
              <SidelinedTimeline sidelined={player.sidelined} />
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Trophy className="h-5 w-5 text-amber-500" />
              Honours
            </CardTitle>
          </CardHeader>
          <CardContent>
            <TrophyList trophies={player.trophies} />
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
