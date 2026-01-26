import { useMemo, useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle, Clock, CalendarDays, ChevronDown, ChevronUp } from "lucide-react";
import { getGoalserveCupId } from "@/lib/cup-config";

interface CupMatch {
  id: string;
  home: { id?: string; name: string };
  away: { id?: string; name: string };
  score?: { home: number; away: number } | null;
  kickoff?: string;
  kickoffDate?: string | null;  // YYYY-MM-DD
  kickoffTime?: string | null;  // HH:mm
  status: string;
}

interface CupRound {
  name: string;
  order: number;
  matches: CupMatch[];
  status?: "completed" | "in_progress" | "upcoming";
}

interface CupProgressResponse {
  competitionId: string;
  rounds: CupRound[];
}

interface CupProgressProps {
  cupSlug: string;
  season: string;
}

type RoundStatusType = "completed" | "in_progress" | "upcoming";

function getMatchStatus(status: string): "completed" | "live" | "upcoming" {
  const s = status.toLowerCase();
  if (s === "ft" || s === "aet" || s.includes("pen") || s === "finished") return "completed";
  if (s === "ht" || s === "1st half" || s === "2nd half" || /^\d+$/.test(s)) return "live";
  return "upcoming";
}

function getRoundStatus(matches: CupMatch[], backendStatus?: "completed" | "in_progress" | "upcoming"): RoundStatusType {
  // Use backend-computed status if available (handles empty rounds correctly)
  if (backendStatus) return backendStatus;
  
  // Fallback to client-side computation
  const allCompleted = matches.every((m) => getMatchStatus(m.status) === "completed");
  const anyLive = matches.some((m) => getMatchStatus(m.status) === "live");
  
  if (anyLive) return "in_progress";
  if (allCompleted) return "completed";
  return "upcoming";
}

function formatStatusText(status: string): string {
  const s = status.toUpperCase();
  if (s === "FT" || s === "AET" || s.includes("PEN")) return s;
  if (s === "HT") return "HT";
  if (/^\d+$/.test(s)) return `${s}'`;
  if (s === "NS" || s === "") return "NS";
  return s;
}

const roundStatusConfig = {
  completed: {
    icon: CheckCircle,
    label: "Completed",
    badgeClass: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
  },
  in_progress: {
    icon: Clock,
    label: "In progress",
    badgeClass: "bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30",
  },
  upcoming: {
    icon: CalendarDays,
    label: "Upcoming",
    badgeClass: "bg-gray-500/15 text-gray-600 dark:text-gray-400 border-gray-500/30",
  },
};

function formatKickoffDisplay(kickoffDate?: string | null, kickoffTime?: string | null): string | null {
  if (!kickoffDate) return null;
  // Convert YYYY-MM-DD to DD.MM.YYYY
  const parts = kickoffDate.split("-");
  if (parts.length !== 3) return null;
  const [year, month, day] = parts;
  const dateStr = `${day}.${month}.${year}`;
  return kickoffTime ? `${dateStr} • ${kickoffTime}` : dateStr;
}

function MatchRow({ match }: { match: CupMatch }) {
  const matchStatus = getMatchStatus(match.status);
  const hasScore = match.score != null;
  const statusText = formatStatusText(match.status);
  const kickoffDisplay = formatKickoffDisplay(match.kickoffDate, match.kickoffTime);

  return (
    <div className="flex items-center justify-between py-2 text-sm border-b border-border/50 last:border-0" data-testid={`match-row-${match.id}`}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium truncate">{match.home.name}</span>
          {hasScore && (
            <span className="text-muted-foreground font-semibold">
              {match.score!.home}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="font-medium truncate">{match.away.name}</span>
          {hasScore && (
            <span className="text-muted-foreground font-semibold">
              {match.score!.away}
            </span>
          )}
        </div>
      </div>
      <div className="text-right text-xs text-muted-foreground shrink-0 ml-2 flex flex-col items-end gap-1">
        {matchStatus === "completed" && (
          <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
            {statusText}
          </Badge>
        )}
        {matchStatus === "live" && (
          <Badge variant="outline" className="text-xs bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30 animate-pulse">
            {statusText}
          </Badge>
        )}
        {matchStatus === "upcoming" && (
          <Badge variant="outline" className="text-xs bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/30">
            {statusText}
          </Badge>
        )}
        {kickoffDisplay && <span className="text-[10px]">{kickoffDisplay}</span>}
      </div>
    </div>
  );
}

interface RoundAccordionProps {
  round: CupRound;
  isOpen: boolean;
  onToggle: () => void;
}

function RoundAccordion({ round, isOpen, onToggle }: RoundAccordionProps) {
  const roundStatus = getRoundStatus(round.matches, round.status);
  const config = roundStatusConfig[roundStatus];
  const StatusIcon = config.icon;
  const matchCount = round.matches.length;

  return (
    <Card data-testid={`accordion-round-${round.name.replace(/\s+/g, "-").toLowerCase()}`}>
      <Button
        variant="ghost"
        className="w-full p-4 h-auto justify-between hover-elevate rounded-md"
        onClick={onToggle}
        data-testid={`button-toggle-${round.name.replace(/\s+/g, "-").toLowerCase()}`}
      >
        <div className="flex flex-col items-start gap-0.5">
          <span className="font-semibold text-base">{round.name}</span>
          <span className="text-xs text-muted-foreground">
            {matchCount} {matchCount === 1 ? "fixture" : "fixtures"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className={`${config.badgeClass} shrink-0 text-xs`}>
            <StatusIcon className="h-3 w-3 mr-1" />
            {config.label}
          </Badge>
          {isOpen ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </Button>
      
      {isOpen && (
        <CardContent className="px-4 pb-4 pt-0">
          <div className="border-t border-border pt-2">
            {round.matches.map((match) => (
              <MatchRow key={match.id} match={match} />
            ))}
          </div>
        </CardContent>
      )}
    </Card>
  );
}

function getDefaultOpenRound(rounds: CupRound[]): string | null {
  if (rounds.length === 0) return null;
  
  const firstNonCompleted = rounds.find((r) => getRoundStatus(r.matches, r.status) !== "completed");
  if (firstNonCompleted) {
    return firstNonCompleted.name;
  }
  
  const latestRound = rounds.reduce((latest, current) => 
    current.order > latest.order ? current : latest
  );
  return latestRound.name;
}

export function CupProgress({ cupSlug, season }: CupProgressProps) {
  const competitionId = getGoalserveCupId(cupSlug);
  const [openRoundKey, setOpenRoundKey] = useState<string | null>(null);

  const cupProgressUrl = useMemo(() => {
    if (!competitionId) return null;
    const params = new URLSearchParams();
    params.set("competitionId", competitionId);
    params.set("season", season);
    return `/api/cup/progress?${params.toString()}`;
  }, [competitionId, season]);

  const { data, isLoading, error } = useQuery<CupProgressResponse>({
    queryKey: [cupProgressUrl],
    enabled: !!cupProgressUrl,
    staleTime: 60_000,
    refetchInterval: 120_000,
  });

  useEffect(() => {
    if (data?.rounds && openRoundKey === null) {
      setOpenRoundKey(getDefaultOpenRound(data.rounds));
    }
  }, [data?.rounds, openRoundKey]);

  const handleToggle = (roundName: string) => {
    setOpenRoundKey((prev) => (prev === roundName ? null : roundName));
  };

  if (!competitionId) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          Cup data not available for this competition.
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 flex items-center justify-center gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Loading cup fixtures...</span>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          Failed to load cup fixtures. Please try again later.
        </CardContent>
      </Card>
    );
  }

  if (!data?.rounds || data.rounds.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          No fixtures available for this cup yet.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {data.rounds.map((round) => (
        <RoundAccordion
          key={round.name}
          round={round}
          isOpen={openRoundKey === round.name}
          onToggle={() => handleToggle(round.name)}
        />
      ))}
    </div>
  );
}
