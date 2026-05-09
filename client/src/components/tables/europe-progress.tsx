import { useCallback, memo, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { filterAndSortEuropeKnockoutRounds } from "@/lib/europe-knockout-filter";
import { getGoalserveEuropeId } from "@/lib/europe-config";
import { FormPills } from "./form-pills";
import { CupProgressRoundsList, type CupProgressResponse } from "./cup-progress";

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

interface EuropeResponse {
  competition: {
    slug: string;
    name: string;
    country: string;
    goalserveCompetitionId: string;
  };
  season: string;
  standings?: StandingTeam[];
  error?: string;
}
const UEFA_KNOCKOUT_SLUGS = new Set(["champions-league", "europa-league", "conference-league"]);

interface EuropeProgressProps {
  competitionSlug: string;
  season: string;
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
        <td className="w-10 py-2 px-2 font-medium relative pl-3 align-middle">
          <span 
            aria-hidden="true" 
            className={`absolute left-0 top-0 h-full w-1 ${zoneStripeColor}`} 
          />
          <span className="text-sm">{team.position}</span>
        </td>
        <td className="min-w-[160px] w-[22%] py-2 px-2 align-middle overflow-hidden">
          <span className="font-medium text-sm truncate block" data-testid={`text-team-name-${team.position}`}>
            {team.name}
          </span>
        </td>
        <td className="w-10 text-center py-2 px-2 hidden md:table-cell align-middle tabular-nums">
          {team.played}
        </td>
        <td className="w-10 text-center py-2 px-2 hidden md:table-cell align-middle tabular-nums">
          {team.won}
        </td>
        <td className="w-10 text-center py-2 px-2 hidden md:table-cell align-middle tabular-nums">
          {team.drawn}
        </td>
        <td className="w-10 text-center py-2 px-2 hidden md:table-cell align-middle tabular-nums">
          {team.lost}
        </td>
        <td className="w-10 text-center py-2 px-2 hidden md:table-cell align-middle tabular-nums">
          {team.goalsFor}
        </td>
        <td className="w-10 text-center py-2 px-2 hidden md:table-cell align-middle tabular-nums">
          {team.goalsAgainst}
        </td>
        <td className="w-11 text-center py-2 px-2 hidden md:table-cell align-middle tabular-nums">
          <span className={getGDColorClass(team.goalDifference)}>
            {formatGD(team.goalDifference)}
          </span>
        </td>
        <td className="w-14 min-w-[3.5rem] shrink-0 text-right py-2 px-2 font-bold md:text-center tabular-nums align-middle">
          {team.points}
        </td>
        <td className="hidden md:table-cell w-[120px] min-w-[120px] max-w-[120px] py-2 px-2 text-left align-middle whitespace-nowrap">
          <div className="inline-flex justify-start min-w-0">
            <FormPills form={team.recentForm || ""} maxPills={5} showPlaceholder />
          </div>
        </td>
        <td className="md:hidden w-10 shrink-0 text-center align-middle">
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
    <div className="w-full overflow-x-auto">
      <table
        className="w-full min-w-0 text-sm table-auto md:table-fixed md:min-w-[920px]"
        data-testid="table-standings"
      >
        <thead>
          <tr className="border-b">
            <th className="text-left py-2 px-2 font-medium text-muted-foreground w-10">#</th>
            <th className="text-left py-2 px-2 font-medium text-muted-foreground min-w-[160px] w-[22%]">
              Team
            </th>
            <th className="text-center py-2 px-2 font-medium text-muted-foreground w-10 hidden md:table-cell">
              P
            </th>
            <th className="text-center py-2 px-2 font-medium text-muted-foreground w-10 hidden md:table-cell">
              W
            </th>
            <th className="text-center py-2 px-2 font-medium text-muted-foreground w-10 hidden md:table-cell">
              D
            </th>
            <th className="text-center py-2 px-2 font-medium text-muted-foreground w-10 hidden md:table-cell">
              L
            </th>
            <th className="text-center py-2 px-2 font-medium text-muted-foreground w-10 hidden md:table-cell">
              GF
            </th>
            <th className="text-center py-2 px-2 font-medium text-muted-foreground w-10 hidden md:table-cell">
              GA
            </th>
            <th className="text-center py-2 px-2 font-medium text-muted-foreground w-11 hidden md:table-cell">
              GD
            </th>
            <th className="w-14 min-w-[3.5rem] shrink-0 text-right py-2 px-2 font-semibold text-muted-foreground md:text-center">
              Pts
            </th>
            <th className="hidden md:table-cell w-[120px] min-w-[120px] max-w-[120px] py-2 px-2 font-medium text-muted-foreground text-left whitespace-nowrap">
              Form
            </th>
            <th className="md:hidden w-10 shrink-0"></th>
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

export function EuropeProgress({ competitionSlug, season }: EuropeProgressProps) {
  const europeUrl = `/api/europe/${competitionSlug}?season=${encodeURIComponent(season)}&tablesOnly=1`;
  const goalserveId = getGoalserveEuropeId(competitionSlug);
  const fetchKnockout = UEFA_KNOCKOUT_SLUGS.has(competitionSlug) && !!goalserveId;

  const cupProgressUrl = useMemo(() => {
    if (!fetchKnockout || !goalserveId) return null;
    const params = new URLSearchParams();
    params.set("competitionId", goalserveId);
    params.set("season", season);
    return `/api/cup/progress?${params.toString()}`;
  }, [fetchKnockout, goalserveId, season]);

  const { data, isLoading: europeLoading, error: europeError } = useQuery<EuropeResponse>({
    queryKey: [europeUrl],
    staleTime: 60_000,
    refetchInterval: 120_000,
  });

  const {
    data: koData,
    isLoading: koLoading,
    isError: koError,
  } = useQuery<CupProgressResponse>({
    queryKey: [cupProgressUrl],
    enabled: !!cupProgressUrl,
    staleTime: 60_000,
    refetchInterval: 120_000,
  });

  const knockoutRounds = useMemo(() => {
    if (koError || !koData?.rounds?.length) return [];
    return filterAndSortEuropeKnockoutRounds(koData.rounds);
  }, [koData, koError]);

  const showKnockoutProgress = fetchKnockout && !koLoading && knockoutRounds.length > 0;
  const showKnockoutLoading = fetchKnockout && koLoading;

  const standings = data?.standings ?? [];

  if (europeError) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          Failed to load competition data. Please try again later.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {showKnockoutLoading && (
        <Card className="h-fit">
          <CardContent className="p-4 flex items-center gap-2 text-muted-foreground text-sm">
            <Loader2 className="h-4 w-4 animate-spin shrink-0" aria-hidden />
            <span>Loading knockout fixtures…</span>
          </CardContent>
        </Card>
      )}

      {showKnockoutProgress && (
        <Card className="h-fit">
          <CardContent className="p-4 sm:p-6">
            <h3 className="font-semibold text-base mb-3">Knockout progress</h3>
            <CupProgressRoundsList
              rounds={knockoutRounds}
              resetKey={`${competitionSlug}:${season}`}
            />
          </CardContent>
        </Card>
      )}

      <Card className="h-fit">
        <CardContent className="p-4">
          <h3 className="font-semibold mb-4">Standings</h3>
          {europeLoading ? (
            <div className="space-y-2" aria-busy="true">
              <Skeleton className="h-4 w-40" />
              {Array.from({ length: 12 }).map((_, idx) => (
                <div key={idx} className="grid grid-cols-[32px_1fr_52px] items-center gap-3">
                  <Skeleton className="h-4 w-6" />
                  <Skeleton className="h-5 w-full" />
                  <Skeleton className="h-5 w-10 justify-self-end" />
                </div>
              ))}
            </div>
          ) : standings.length > 0 ? (
            <StandingsTable standings={standings} />
          ) : (
            <div className="text-center text-muted-foreground py-8">No standings data available</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
