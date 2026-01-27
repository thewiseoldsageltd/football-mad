import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface EuropeMatch {
  id: string;
  home: { id?: string; name: string };
  away: { id?: string; name: string };
  score?: { home: number; away: number } | null;
  penalties?: { home: number; away: number } | null;
  kickoff?: string;
  kickoffDate?: string | null;
  kickoffTime?: string | null;
  status: string;
  venue?: string;
}

interface StandingTeam {
  position: number;
  name: string;
  teamId?: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  recentForm?: string;
  description?: string;
}

interface Matchday {
  matchday: number;
  matches: EuropeMatch[];
}

interface KnockoutRound {
  name: string;
  order: number;
  matches: EuropeMatch[];
  status: "completed" | "in_progress" | "upcoming";
}

interface LeaguePhase {
  type: "league_phase";
  name: string;
  standings: StandingTeam[];
  matchdays: Matchday[];
}

interface KnockoutPhase {
  type: "knockout";
  name: string;
  rounds: KnockoutRound[];
}

interface EuropeResponse {
  competition: {
    slug: string;
    name: string;
    country: string;
    goalserveCompetitionId: string;
  };
  season: string;
  phases: (LeaguePhase | KnockoutPhase)[];
  error?: string;
}

interface EuropeProgressProps {
  competitionSlug: string;
  season: string;
}

function formatKickoff(kickoffDate?: string | null, kickoffTime?: string | null): string {
  if (!kickoffDate) return "";
  
  try {
    const date = new Date(kickoffDate + "T" + (kickoffTime || "00:00"));
    const day = date.getDate();
    const month = date.toLocaleDateString("en-GB", { month: "short" });
    const time = kickoffTime || "";
    return `${day} ${month}${time ? ` ${time}` : ""}`;
  } catch {
    return kickoffDate;
  }
}

function getStatusBadgeVariant(status: string): "default" | "secondary" | "outline" | "destructive" {
  switch (status) {
    case "Full-Time":
    case "AET":
    case "Penalties":
      return "secondary";
    case "Half-Time":
      return "destructive";
    case "Not Started":
      return "outline";
    default:
      if (status.includes("'") || /^\d/.test(status)) {
        return "destructive";
      }
      return "outline";
  }
}

function MatchRow({ match }: { match: EuropeMatch }) {
  const hasScore = match.score !== null && match.score !== undefined;
  const hasPenalties = match.penalties !== null && match.penalties !== undefined;
  
  return (
    <div 
      className="flex items-center justify-between py-3 px-4 border-b last:border-b-0 hover-elevate"
      data-testid={`match-row-${match.id}`}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium truncate" data-testid={`text-home-${match.id}`}>
            {match.home.name}
          </span>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <span className="font-medium truncate" data-testid={`text-away-${match.id}`}>
            {match.away.name}
          </span>
        </div>
      </div>
      
      <div className="flex flex-col items-end gap-1 ml-4">
        {hasScore ? (
          <div className="flex items-center gap-2">
            <span className="font-bold text-lg" data-testid={`text-score-${match.id}`}>
              {match.score!.home} - {match.score!.away}
            </span>
            {hasPenalties && (
              <span className="text-sm text-muted-foreground" data-testid={`text-penalties-${match.id}`}>
                ({match.penalties!.home}-{match.penalties!.away} pen)
              </span>
            )}
          </div>
        ) : (
          <span className="text-sm text-muted-foreground" data-testid={`text-kickoff-${match.id}`}>
            {formatKickoff(match.kickoffDate, match.kickoffTime)}
          </span>
        )}
        <Badge variant={getStatusBadgeVariant(match.status)} className="text-xs">
          {match.status}
        </Badge>
      </div>
    </div>
  );
}

function StandingsTable({ standings }: { standings: StandingTeam[] }) {
  if (standings.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-8">
        No standings data available
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm" data-testid="table-standings">
        <thead>
          <tr className="border-b">
            <th className="text-left py-2 px-2 font-medium text-muted-foreground w-8">#</th>
            <th className="text-left py-2 px-2 font-medium text-muted-foreground">Team</th>
            <th className="text-center py-2 px-2 font-medium text-muted-foreground w-8">P</th>
            <th className="text-center py-2 px-2 font-medium text-muted-foreground w-8">W</th>
            <th className="text-center py-2 px-2 font-medium text-muted-foreground w-8">D</th>
            <th className="text-center py-2 px-2 font-medium text-muted-foreground w-8">L</th>
            <th className="text-center py-2 px-2 font-medium text-muted-foreground w-10">GF</th>
            <th className="text-center py-2 px-2 font-medium text-muted-foreground w-10">GA</th>
            <th className="text-center py-2 px-2 font-medium text-muted-foreground w-10">GD</th>
            <th className="text-center py-2 px-2 font-medium text-muted-foreground w-10">Pts</th>
            <th className="text-center py-2 px-2 font-medium text-muted-foreground hidden sm:table-cell">Form</th>
          </tr>
        </thead>
        <tbody>
          {standings.map((team) => {
            let rowBgClass = "";
            if (team.position <= 8) {
              rowBgClass = "bg-green-500/10 dark:bg-green-500/20";
            } else if (team.position >= 9 && team.position <= 24) {
              rowBgClass = "bg-blue-500/10 dark:bg-blue-500/20";
            } else {
              rowBgClass = "bg-red-500/10 dark:bg-red-500/20";
            }
            
            return (
              <tr 
                key={team.teamId || team.position} 
                className={cn("border-b last:border-b-0 hover-elevate", rowBgClass)}
                data-testid={`row-team-${team.position}`}
              >
                <td className="py-2 px-2 font-medium">{team.position}</td>
                <td className="py-2 px-2">
                  <span className="font-medium" data-testid={`text-team-name-${team.position}`}>
                    {team.name}
                  </span>
                </td>
                <td className="text-center py-2 px-2">{team.played}</td>
                <td className="text-center py-2 px-2">{team.won}</td>
                <td className="text-center py-2 px-2">{team.drawn}</td>
                <td className="text-center py-2 px-2">{team.lost}</td>
                <td className="text-center py-2 px-2">{team.goalsFor}</td>
                <td className="text-center py-2 px-2">{team.goalsAgainst}</td>
                <td className="text-center py-2 px-2">{team.goalDifference > 0 ? `+${team.goalDifference}` : team.goalDifference}</td>
                <td className="text-center py-2 px-2 font-bold">{team.points}</td>
                <td className="text-center py-2 px-2 hidden sm:table-cell">
                  {team.recentForm && (
                    <div className="flex justify-center gap-0.5">
                      {team.recentForm.split("").slice(0, 5).map((result, i) => (
                        <span
                          key={i}
                          className={cn(
                            "w-4 h-4 rounded-full text-[10px] font-bold flex items-center justify-center text-white",
                            result === "W" && "bg-green-500",
                            result === "D" && "bg-yellow-500",
                            result === "L" && "bg-red-500"
                          )}
                        >
                          {result}
                        </span>
                      ))}
                    </div>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      
      <div className="flex flex-wrap gap-4 mt-4 text-xs text-muted-foreground px-2">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-green-500/30 dark:bg-green-500/40" />
          <span>Round of 16 (Top 8)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-blue-500/30 dark:bg-blue-500/40" />
          <span>Playoff Round (9-24)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-red-500/30 dark:bg-red-500/40" />
          <span>Eliminated (25+)</span>
        </div>
      </div>
    </div>
  );
}

function MatchdaySelector({ 
  matchdays, 
  selectedMatchday, 
  onSelect 
}: { 
  matchdays: Matchday[];
  selectedMatchday: number;
  onSelect: (md: number) => void;
}) {
  return (
    <div className="flex gap-1 flex-wrap" data-testid="matchday-selector">
      {matchdays.map((md) => (
        <Button
          key={md.matchday}
          onClick={() => onSelect(md.matchday)}
          variant={selectedMatchday === md.matchday ? "default" : "secondary"}
          size="sm"
          data-testid={`button-matchday-${md.matchday}`}
        >
          MD {md.matchday}
        </Button>
      ))}
    </div>
  );
}

function KnockoutRoundCard({ round }: { round: KnockoutRound }) {
  const [isOpen, setIsOpen] = useState(round.status !== "completed");
  
  const statusLabel = round.status === "completed" 
    ? "Completed" 
    : round.status === "in_progress" 
      ? "In Progress" 
      : "Upcoming";
  
  const statusVariant = round.status === "completed" 
    ? "secondary" 
    : round.status === "in_progress" 
      ? "destructive" 
      : "outline";

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card>
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            className="w-full p-4 h-auto justify-between gap-4 hover-elevate rounded-md"
            data-testid={`button-round-${round.order}`}
          >
            <div className="flex items-center gap-3 flex-wrap">
              <span className="font-semibold" data-testid={`text-round-name-${round.order}`}>
                {round.name}
              </span>
              <Badge variant={statusVariant} className="text-xs">
                {statusLabel}
              </Badge>
              <span className="text-sm text-muted-foreground">
                {round.matches.length} {round.matches.length === 1 ? "match" : "matches"}
              </span>
            </div>
            {isOpen ? (
              <ChevronUp className="h-5 w-5 text-muted-foreground shrink-0" />
            ) : (
              <ChevronDown className="h-5 w-5 text-muted-foreground shrink-0" />
            )}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="p-0 border-t">
            {round.matches.length === 0 ? (
              <div className="text-center text-muted-foreground py-6">
                No matches scheduled yet
              </div>
            ) : (
              round.matches.map((match) => (
                <MatchRow key={match.id} match={match} />
              ))
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

export function EuropeProgress({ competitionSlug, season }: EuropeProgressProps) {
  const [view, setView] = useState<"league" | "knockout">("league");
  const [selectedMatchday, setSelectedMatchday] = useState(1);
  
  const europeUrl = `/api/europe/${competitionSlug}?season=${encodeURIComponent(season)}`;
  
  const { data, isLoading, error } = useQuery<EuropeResponse>({
    queryKey: [europeUrl],
    staleTime: 60_000,
    refetchInterval: 120_000,
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 flex items-center justify-center gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Loading competition data...</span>
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          Failed to load competition data. Please try again later.
        </CardContent>
      </Card>
    );
  }

  const leaguePhase = data.phases.find((p): p is LeaguePhase => p.type === "league_phase");
  const knockoutPhase = data.phases.find((p): p is KnockoutPhase => p.type === "knockout");
  
  const currentMatchday = leaguePhase?.matchdays.find(md => md.matchday === selectedMatchday);
  const hasKnockoutRounds = knockoutPhase && knockoutPhase.rounds.length > 0;

  return (
    <div className="space-y-4">
      <Tabs value={view} onValueChange={(v) => setView(v as "league" | "knockout")} className="w-auto">
        <TabsList className="h-auto gap-1" data-testid="tabs-europe-view">
          <TabsTrigger value="league" data-testid="tab-league-phase">
            League Phase
          </TabsTrigger>
          <TabsTrigger 
            value="knockout" 
            data-testid="tab-knockout"
            disabled={!hasKnockoutRounds}
          >
            Knockout Stage
            {!hasKnockoutRounds && (
              <span className="ml-1 text-xs text-muted-foreground">(TBA)</span>
            )}
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {view === "league" && leaguePhase && (
        <div className="grid gap-6 lg:grid-cols-[1fr,400px]">
          <Card>
            <CardContent className="p-4">
              <h3 className="font-semibold mb-4">Standings</h3>
              <StandingsTable standings={leaguePhase.standings} />
            </CardContent>
          </Card>
          
          <div className="space-y-4">
            <Card>
              <CardContent className="p-4">
                <h3 className="font-semibold mb-4">Matchdays</h3>
                <MatchdaySelector 
                  matchdays={leaguePhase.matchdays}
                  selectedMatchday={selectedMatchday}
                  onSelect={setSelectedMatchday}
                />
              </CardContent>
            </Card>
            
            {currentMatchday && (
              <Card>
                <CardContent className="p-0">
                  <div className="p-4 border-b">
                    <h4 className="font-semibold">Matchday {selectedMatchday}</h4>
                    <p className="text-sm text-muted-foreground">
                      {currentMatchday.matches.length} matches
                    </p>
                  </div>
                  <div className="max-h-[500px] overflow-y-auto">
                    {currentMatchday.matches.map((match) => (
                      <MatchRow key={match.id} match={match} />
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      {view === "knockout" && knockoutPhase && (
        <div className="space-y-4">
          {knockoutPhase.rounds.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground">
                Knockout stage matches will be displayed here once the league phase is complete.
              </CardContent>
            </Card>
          ) : (
            knockoutPhase.rounds.map((round) => (
              <KnockoutRoundCard key={round.order} round={round} />
            ))
          )}
        </div>
      )}
    </div>
  );
}
