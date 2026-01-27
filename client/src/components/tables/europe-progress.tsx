import { useState, useEffect, useCallback, memo, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { FormPills } from "./form-pills";
import { RoundToggle, pickDefaultRound, type RoundInfo } from "@/components/shared/round-toggle";

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

interface ApiRoundInfo {
  key: string;
  index: number;
  label: string;
  startDate: string | null;
  endDate: string | null;
  matchesCount: number;
  hasAnyMatches: boolean;
}

interface EuropeResponse {
  competition: {
    slug: string;
    name: string;
    country: string;
    goalserveCompetitionId: string;
  };
  season: string;
  standings?: StandingTeam[];
  rounds?: ApiRoundInfo[];
  matchesByRound?: Record<string, EuropeMatch[]>;
  latestRoundKey?: string;
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
      
      {/* COL 2 — Score column (only for finished matches) */}
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
      </div>
      
      {/* COL 3 — Status pill + date/time for upcoming */}
      {showUpcoming ? (
        <div className="flex justify-end">
          <div className="inline-flex flex-col items-center gap-1">
            <Badge variant={getStatusBadgeVariant(rawStatus)} className="text-xs" data-testid={`badge-status-${match.id}`}>
              {statusLabel}
            </Badge>
            <div className="text-xs text-muted-foreground" data-testid={`text-kickoff-${match.id}`}>
              {formatKickoff(match.kickoffDate, match.kickoffTime)}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex items-center">
          <Badge variant={getStatusBadgeVariant(rawStatus)} className="text-xs" data-testid={`badge-status-${match.id}`}>
            {statusLabel}
          </Badge>
        </div>
      )}
    </div>
  );
}

function formatGD(gd: number): string {
  if (gd > 0) return `+${gd}`;
  return String(gd);
}

function getGDColorClass(gd: number): string {
  if (gd > 0) return "text-emerald-600 dark:text-emerald-400";
  if (gd < 0) return "text-red-600 dark:text-red-400";
  return "text-muted-foreground";
}

function getZoneStripeColor(position: number): string {
  if (position <= 8) return "bg-green-500/70";
  if (position >= 9 && position <= 24) return "bg-blue-500/70";
  return "bg-red-500/70";
}

function getZoneRowBgClass(position: number): string {
  if (position <= 8) return "bg-green-500/10 dark:bg-green-500/20";
  if (position >= 9 && position <= 24) return "bg-blue-500/10 dark:bg-blue-500/20";
  return "bg-red-500/10 dark:bg-red-500/20";
}

interface ExpandedRowContentProps {
  team: StandingTeam;
}

const ExpandedRowContent = memo(function ExpandedRowContent({ team }: ExpandedRowContentProps) {
  return (
    <div className="px-3 py-3 bg-muted/30 border-t border-border/50">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">P:</span>
          <span className="font-medium">{team.played}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">W/D/L:</span>
          <span className="font-medium">{team.won}/{team.drawn}/{team.lost}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">GF/GA:</span>
          <span className="font-medium">{team.goalsFor}/{team.goalsAgainst}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">GD:</span>
          <span className={`font-medium ${getGDColorClass(team.goalDifference)}`}>
            {formatGD(team.goalDifference)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">Form:</span>
          <FormPills form={team.recentForm || ""} showPlaceholder />
        </div>
      </div>
    </div>
  );
});

interface StandingsRowProps {
  team: StandingTeam;
  isExpanded: boolean;
  onToggle: () => void;
}

const StandingsRow = memo(function StandingsRow({ team, isExpanded, onToggle }: StandingsRowProps) {
  const rowBgClass = getZoneRowBgClass(team.position);
  const zoneStripeColor = getZoneStripeColor(team.position);
  
  return (
    <>
      <tr 
        className={cn(
          "border-b last:border-b-0 hover-elevate md:cursor-default cursor-pointer",
          rowBgClass
        )}
        data-testid={`row-team-${team.position}`}
        onClick={() => {
          if (window.innerWidth < 768) {
            onToggle();
          }
        }}
        role="row"
        aria-expanded={isExpanded}
        tabIndex={0}
        onKeyDown={(e) => {
          if ((e.key === "Enter" || e.key === " ") && window.innerWidth < 768) {
            e.preventDefault();
            onToggle();
          }
        }}
      >
        <td className="py-2 px-2 font-medium relative pl-3">
          <span 
            aria-hidden="true" 
            className={`absolute left-0 top-0 h-full w-1 ${zoneStripeColor}`} 
          />
          <span className="text-sm">{team.position}</span>
        </td>
        <td className="py-2 px-2">
          <span className="font-medium text-sm truncate" data-testid={`text-team-name-${team.position}`}>
            {team.name}
          </span>
        </td>
        <td className="text-center py-2 px-2 hidden md:table-cell">{team.played}</td>
        <td className="text-center py-2 px-2 hidden md:table-cell">{team.won}</td>
        <td className="text-center py-2 px-2 hidden md:table-cell">{team.drawn}</td>
        <td className="text-center py-2 px-2 hidden md:table-cell">{team.lost}</td>
        <td className="text-center py-2 px-2 hidden md:table-cell">{team.goalsFor}</td>
        <td className="text-center py-2 px-2 hidden md:table-cell">{team.goalsAgainst}</td>
        <td className="text-center py-2 px-2 hidden md:table-cell">
          <span className={getGDColorClass(team.goalDifference)}>
            {formatGD(team.goalDifference)}
          </span>
        </td>
        <td className="text-right py-2 px-2 font-bold md:text-center tabular-nums">{team.points}</td>
        <td className="text-center py-2 px-2 hidden md:table-cell">
          <FormPills form={team.recentForm || ""} maxPills={5} showPlaceholder />
        </td>
        <td className="md:hidden w-8 text-center">
          <ChevronDown 
            className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
            aria-hidden="true"
          />
        </td>
      </tr>
      {isExpanded && (
        <tr className="md:hidden" data-testid={`row-expanded-${team.position}`}>
          <td colSpan={4} className="p-0">
            <ExpandedRowContent team={team} />
          </td>
        </tr>
      )}
    </>
  );
});

function StandingsTable({ standings }: { standings: StandingTeam[] }) {
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  const toggleRow = useCallback((position: number) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(position)) {
        next.delete(position);
      } else {
        next.add(position);
      }
      return next;
    });
  }, []);

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
            <th className="md:hidden w-8"></th>
          </tr>
        </thead>
        <tbody>
          {standings.map((team) => (
            <StandingsRow
              key={team.teamId || team.position}
              team={team}
              isExpanded={expandedRows.has(team.position)}
              onToggle={() => toggleRow(team.position)}
            />
          ))}
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

// Helper to convert API rounds to RoundInfo for RoundToggle
function mapApiRoundsToRoundInfo(rounds: ApiRoundInfo[]): RoundInfo[] {
  return rounds.map(r => ({
    key: r.key,
    label: r.label,
    startDate: r.startDate,
    endDate: r.endDate,
    matchesCount: r.matchesCount,
  }));
}

export function EuropeProgress({ competitionSlug, season }: EuropeProgressProps) {
  const [selectedRound, setSelectedRound] = useState<string | null>(null);
  const [hasInitialized, setHasInitialized] = useState(false);
  
  const europeUrl = `/api/europe/${competitionSlug}?season=${encodeURIComponent(season)}`;
  
  const { data, isLoading, error } = useQuery<EuropeResponse>({
    queryKey: [europeUrl],
    staleTime: 60_000,
    refetchInterval: 120_000,
  });

  // Extract data from API response
  const standings = data?.standings ?? [];
  const apiRounds = data?.rounds ?? [];
  const matchesByRound = data?.matchesByRound ?? {};
  const latestRoundKey = data?.latestRoundKey;
  
  // Convert API rounds to RoundInfo for RoundToggle
  const roundsForToggle = useMemo(() => mapApiRoundsToRoundInfo(apiRounds), [apiRounds]);
  
  // Set initial selection to latest round with matches once data loads
  useEffect(() => {
    if (data && !hasInitialized && roundsForToggle.length > 0) {
      const defaultRound = pickDefaultRound(roundsForToggle, latestRoundKey);
      setSelectedRound(defaultRound);
      setHasInitialized(true);
    }
  }, [data, roundsForToggle, latestRoundKey, hasInitialized]);

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
  
  // Handle empty rounds
  const hasRounds = roundsForToggle.length > 0;
  const effectiveRound = selectedRound || (hasRounds ? roundsForToggle[0].key : "");
  
  // Get matches for the selected round
  const displayMatches: EuropeMatch[] = matchesByRound[effectiveRound] ?? [];
  const currentRoundInfo = roundsForToggle.find(r => r.key === effectiveRound);
  const displayLabel = currentRoundInfo?.label ?? effectiveRound;

  return (
    <div className="space-y-4">
      <div className="grid gap-6 lg:grid-cols-[1fr,400px] items-start">
        <Card className="h-fit">
          <CardContent className="p-4">
            <h3 className="font-semibold mb-4">Standings</h3>
            {standings.length > 0 ? (
              <StandingsTable standings={standings} />
            ) : (
              <div className="text-center text-muted-foreground py-8">
                No standings data available
              </div>
            )}
          </CardContent>
        </Card>
        
        <div className="space-y-4">
          {hasRounds ? (
            <>
              <Card>
                <CardContent className="p-4">
                  <h3 className="font-semibold mb-4">Fixtures</h3>
                  <RoundToggle
                    labelType="Matchday"
                    rounds={roundsForToggle}
                    value={effectiveRound}
                    onChange={setSelectedRound}
                  />
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-0">
                  <div className="p-4 border-b flex items-center justify-between gap-2">
                    <h4 className="font-semibold" data-testid="text-display-title">
                      {/^\d+$/.test(effectiveRound) ? `Matchday ${displayLabel}` : displayLabel}
                    </h4>
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
            </>
          ) : (
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground">
                No fixtures available for this season.
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
