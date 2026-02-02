import { useCallback, memo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { FormPills } from "./form-pills";

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

export function EuropeProgress({ competitionSlug, season }: EuropeProgressProps) {
  const europeUrl = `/api/europe/${competitionSlug}?season=${encodeURIComponent(season)}&tablesOnly=1`;
  
  const { data, isLoading, error } = useQuery<EuropeResponse>({
    queryKey: [europeUrl],
    staleTime: 60_000,
    refetchInterval: 120_000,
  });

  const standings = data?.standings ?? [];

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

  return (
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
  );
}
