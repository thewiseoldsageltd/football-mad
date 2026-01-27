import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

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
  // Handle both raw Goalserve statuses and formatted labels
  const normalizedStatus = status.toLowerCase();
  
  // Completed statuses
  if (["full-time", "ft", "finished", "aet", "after extra time", "penalties", "after pen."].includes(normalizedStatus)) {
    return "secondary";
  }
  // Live statuses
  if (["half-time", "ht"].includes(normalizedStatus) || status.includes("'") || /^\d/.test(status)) {
    return "destructive";
  }
  // Scheduled / Not Started
  if (["not started", "ns", "scheduled"].includes(normalizedStatus)) {
    return "outline";
  }
  return "outline";
}

interface MatchRowProps {
  match: EuropeMatch;
  showResults?: boolean; // If true, prioritize showing score; if false, show kickoff time
}

function formatStatusLabel(status: string): string {
  // Map raw status to user-friendly label
  if (status === "Finished" || status === "FT") return "Full-Time";
  if (status === "After Extra Time" || status === "AET") return "AET";
  if (status === "After Pen." || status === "Penalties") return "Penalties";
  if (status === "HT" || status === "Half-Time") return "Half-Time";
  if (status === "Not Started" || status === "NS") return "Scheduled";
  return status;
}

function isMatchCompleted(status: string): boolean {
  const normalizedStatus = status.toLowerCase();
  const completedPatterns = [
    "finished", "ft", "full-time", "full time", "match finished",
    "aet", "after extra time", "extra time",
    "penalties", "after pen", "pens"
  ];
  return completedPatterns.some(pattern => normalizedStatus.includes(pattern));
}

function MatchRow({ match, showResults = true }: MatchRowProps) {
  // Safe extraction of scores and penalties
  const homeScore = match.score?.home;
  const awayScore = match.score?.away;
  const homePen = match.penalties?.home;
  const awayPen = match.penalties?.away;
  
  const hasScore = Number.isFinite(homeScore) && Number.isFinite(awayScore);
  const hasPenalties = Number.isFinite(homePen) && Number.isFinite(awayPen);
  const statusLabel = formatStatusLabel(match.status);
  const rawStatus = match.status;
  
  // Only display score section when we actually have scores
  const matchCompleted = isMatchCompleted(rawStatus);
  const displayScore = showResults && hasScore;
  
  // For finished matches without scores, show a dash placeholder
  const isFinished = matchCompleted;
  const showScoreFallback = showResults && isFinished && !hasScore;
  
  // Determine what to show in score column
  const showUpcoming = !displayScore && !showScoreFallback;
  
  return (
    <div 
      className="grid grid-cols-[1fr_auto_auto] items-center gap-3 py-3 px-4 border-b last:border-b-0 hover-elevate"
      data-testid={`match-row-${match.id}`}
    >
      {/* COL 1 — Team names stacked */}
      <div className="min-w-0">
        <div className="text-sm font-normal truncate" data-testid={`text-home-${match.id}`}>
          {match.home.name}
        </div>
        <div className="text-sm font-normal truncate mt-1" data-testid={`text-away-${match.id}`}>
          {match.away.name}
        </div>
      </div>
      
      {/* COL 2 — Score column (fixed width, right-aligned) */}
      <div className="w-8 text-right font-semibold tabular-nums leading-tight">
        {displayScore && (
          <>
            <div data-testid={`text-home-score-${match.id}`}>
              {homeScore}
              {hasPenalties && <span className="text-xs text-muted-foreground ml-0.5">({homePen})</span>}
            </div>
            <div className="mt-1" data-testid={`text-away-score-${match.id}`}>
              {awayScore}
              {hasPenalties && <span className="text-xs text-muted-foreground ml-0.5">({awayPen})</span>}
            </div>
          </>
        )}
        {showScoreFallback && (
          <>
            <div className="text-muted-foreground" data-testid={`text-home-score-${match.id}`}>–</div>
            <div className="text-muted-foreground mt-1" data-testid={`text-away-score-${match.id}`}>–</div>
          </>
        )}
        {showUpcoming && (
          <div className="text-sm text-muted-foreground" data-testid={`text-kickoff-${match.id}`}>
            {formatKickoff(match.kickoffDate, match.kickoffTime)}
          </div>
        )}
      </div>
      
      {/* COL 3 — Status pill */}
      <div className="flex items-center">
        <Badge variant={getStatusBadgeVariant(rawStatus)} className="text-xs" data-testid={`badge-status-${match.id}`}>
          {statusLabel}
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
    <div>
      <table className="w-full text-sm" data-testid="table-standings">
        <thead>
          <tr className="border-b">
            <th className="text-left py-2 px-2 font-medium text-muted-foreground w-8">#</th>
            <th className="text-left py-2 px-2 font-medium text-muted-foreground">Team</th>
            <th className="text-center py-2 px-2 font-medium text-muted-foreground w-10 hidden md:table-cell">P</th>
            <th className="text-center py-2 px-2 font-medium text-muted-foreground w-10 hidden md:table-cell">W</th>
            <th className="text-center py-2 px-2 font-medium text-muted-foreground w-10 hidden md:table-cell">D</th>
            <th className="text-center py-2 px-2 font-medium text-muted-foreground w-10 hidden md:table-cell">L</th>
            <th className="text-center py-2 px-2 font-medium text-muted-foreground w-10 hidden md:table-cell">GF</th>
            <th className="text-center py-2 px-2 font-medium text-muted-foreground w-10 hidden md:table-cell">GA</th>
            <th className="text-center py-2 px-2 font-medium text-muted-foreground w-10 hidden md:table-cell">GD</th>
            <th className="text-right py-2 px-2 font-semibold text-muted-foreground w-12 md:text-center">Pts</th>
            <th className="text-center py-2 px-2 font-medium text-muted-foreground hidden md:table-cell">Form</th>
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
                <td className="text-center py-2 px-2 hidden md:table-cell">{team.played}</td>
                <td className="text-center py-2 px-2 hidden md:table-cell">{team.won}</td>
                <td className="text-center py-2 px-2 hidden md:table-cell">{team.drawn}</td>
                <td className="text-center py-2 px-2 hidden md:table-cell">{team.lost}</td>
                <td className="text-center py-2 px-2 hidden md:table-cell">{team.goalsFor}</td>
                <td className="text-center py-2 px-2 hidden md:table-cell">{team.goalsAgainst}</td>
                <td className="text-center py-2 px-2 hidden md:table-cell">{team.goalDifference > 0 ? `+${team.goalDifference}` : team.goalDifference}</td>
                <td className="text-right py-2 px-2 font-bold md:text-center">{team.points}</td>
                <td className="text-center py-2 px-2 hidden md:table-cell">
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

// Stage-aware matchday/round selection options
type StageOption = 
  | { key: string; label: string; type: "league"; md: number }
  | { key: string; label: string; type: "ko"; round: string; isFinalPill?: boolean };

const STAGE_OPTIONS: StageOption[] = [
  { key: "MD1", label: "MD 1", type: "league", md: 1 },
  { key: "MD2", label: "MD 2", type: "league", md: 2 },
  { key: "MD3", label: "MD 3", type: "league", md: 3 },
  { key: "MD4", label: "MD 4", type: "league", md: 4 },
  { key: "MD5", label: "MD 5", type: "league", md: 5 },
  { key: "MD6", label: "MD 6", type: "league", md: 6 },
  { key: "MD7", label: "MD 7", type: "league", md: 7 },
  { key: "MD8", label: "MD 8", type: "league", md: 8 },
  { key: "PO", label: "PO", type: "ko", round: "Knockout Play-offs" },
  { key: "L16", label: "L16", type: "ko", round: "Round of 16" },
  { key: "QF", label: "QF", type: "ko", round: "Quarter-finals" },
  { key: "SF", label: "SF", type: "ko", round: "Semi-finals" },
  { key: "F", label: "Final", type: "ko", round: "Final", isFinalPill: true },
];

function computeCurrentMatchday(matchdays: Matchday[]): number {
  // Find highest matchday with at least one match that has started (has score or non "Not Started" status)
  let current = 1;
  for (const md of matchdays) {
    const hasStarted = md.matches.some(m => 
      m.score !== null && m.score !== undefined || 
      (m.status && m.status !== "Not Started")
    );
    if (hasStarted) {
      current = Math.max(current, md.matchday);
    }
  }
  return current;
}

function StageSelector({ 
  selectedStage, 
  onSelect,
  knockoutRounds
}: { 
  selectedStage: string;
  onSelect: (stage: string) => void;
  knockoutRounds: KnockoutRound[];
}) {
  // Group: first 12 items (MD1-8 + PO, L16, QF, SF) in grid, Final spans full row
  const gridOptions = STAGE_OPTIONS.filter(opt => !("isFinalPill" in opt && opt.isFinalPill));
  const finalOption = STAGE_OPTIONS.find(opt => "isFinalPill" in opt && opt.isFinalPill);

  const isKnockoutAvailable = (roundName: string) => {
    return knockoutRounds.some(r => r.name === roundName);
  };

  return (
    <div className="space-y-2" data-testid="stage-selector">
      <div className="grid grid-cols-4 sm:grid-cols-6 gap-1">
        {gridOptions.map((opt) => {
          const isKO = opt.type === "ko";
          const disabled = isKO && !isKnockoutAvailable((opt as { round: string }).round);
          
          return (
            <Button
              key={opt.key}
              onClick={() => onSelect(opt.key)}
              variant={selectedStage === opt.key ? "default" : "secondary"}
              size="sm"
              disabled={disabled}
              className={cn(disabled && "opacity-50")}
              data-testid={`button-stage-${opt.key}`}
            >
              {opt.label}
            </Button>
          );
        })}
      </div>
      {finalOption && (
        <Button
          onClick={() => onSelect(finalOption.key)}
          variant={selectedStage === finalOption.key ? "default" : "secondary"}
          size="sm"
          disabled={!isKnockoutAvailable((finalOption as { round: string }).round)}
          className={cn(
            "w-full",
            !isKnockoutAvailable((finalOption as { round: string }).round) && "opacity-50"
          )}
          data-testid="button-stage-Final"
        >
          {finalOption.label}
        </Button>
      )}
    </div>
  );
}

export function EuropeProgress({ competitionSlug, season }: EuropeProgressProps) {
  const [selectedStage, setSelectedStage] = useState<string | null>(null);
  const [hasInitialized, setHasInitialized] = useState(false);
  
  const europeUrl = `/api/europe/${competitionSlug}?season=${encodeURIComponent(season)}`;
  
  const { data, isLoading, error } = useQuery<EuropeResponse>({
    queryKey: [europeUrl],
    staleTime: 60_000,
    refetchInterval: 120_000,
  });

  // Extract phases after data is loaded
  const leaguePhase = data?.phases.find((p): p is LeaguePhase => p.type === "league_phase");
  const knockoutPhase = data?.phases.find((p): p is KnockoutPhase => p.type === "knockout");
  const knockoutRounds = knockoutPhase?.rounds ?? [];
  
  // Compute current matchday (highest MD with started matches)
  const currentMD = leaguePhase ? computeCurrentMatchday(leaguePhase.matchdays) : 1;
  
  // Set initial selection to current matchday once data loads
  useEffect(() => {
    if (data && !hasInitialized) {
      // Ensure currentMD is within valid bounds (1-8 for league phase)
      const validMD = Math.max(1, Math.min(8, currentMD));
      const stageKey = `MD${validMD}`;
      // Verify stage exists in options
      const stageExists = STAGE_OPTIONS.some(opt => opt.key === stageKey);
      setSelectedStage(stageExists ? stageKey : "MD1");
      setHasInitialized(true);
    }
  }, [data, currentMD, hasInitialized]);

  if (isLoading || !selectedStage) {
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
  
  // Parse selected stage
  const selectedOption = STAGE_OPTIONS.find(opt => opt.key === selectedStage);
  const isLeagueStage = selectedOption?.type === "league";
  const selectedMdNumber = isLeagueStage ? (selectedOption as { md: number }).md : 0;
  const selectedKORound = !isLeagueStage ? (selectedOption as { round: string }).round : "";
  
  // Get matches to display
  let displayMatches: EuropeMatch[] = [];
  let displayTitle = "";
  
  if (isLeagueStage && leaguePhase) {
    const md = leaguePhase.matchdays.find(m => m.matchday === selectedMdNumber);
    displayMatches = md?.matches ?? [];
    displayTitle = `Matchday ${selectedMdNumber}`;
  } else if (!isLeagueStage && knockoutPhase) {
    const round = knockoutRounds.find(r => r.name === selectedKORound);
    displayMatches = round?.matches ?? [];
    displayTitle = selectedKORound;
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-6 lg:grid-cols-[1fr,400px] items-start">
        <Card className="h-fit">
          <CardContent className="p-4">
            <h3 className="font-semibold mb-4">Standings</h3>
            {leaguePhase ? (
              <StandingsTable standings={leaguePhase.standings} />
            ) : (
              <div className="text-center text-muted-foreground py-8">
                No standings data available
              </div>
            )}
          </CardContent>
        </Card>
        
        <div className="space-y-4">
          <Card>
            <CardContent className="p-4">
              <h3 className="font-semibold mb-4">Fixtures</h3>
              <StageSelector 
                selectedStage={selectedStage}
                onSelect={setSelectedStage}
                knockoutRounds={knockoutRounds}
              />
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-0">
              <div className="p-4 border-b flex items-center justify-between gap-2">
                <h4 className="font-semibold" data-testid="text-display-title">{displayTitle}</h4>
                <span className="text-sm text-muted-foreground">
                  {displayMatches.length} {displayMatches.length === 1 ? "match" : "matches"}
                </span>
              </div>
              <div>
                {displayMatches.length === 0 ? (
                  <div className="text-center text-muted-foreground py-6" data-testid="text-no-fixtures">
                    No fixtures yet
                  </div>
                ) : (
                  displayMatches.map((match) => (
                    <MatchRow 
                      key={match.id} 
                      match={match} 
                      showResults={true}
                    />
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
