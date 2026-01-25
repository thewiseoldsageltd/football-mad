import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle, Clock, CalendarDays } from "lucide-react";
import { getGoalserveCupId } from "@/lib/cup-config";

interface CupMatch {
  id: string;
  home: { id?: string; name: string };
  away: { id?: string; name: string };
  score?: { home: number; away: number } | null;
  kickoff?: string;
  status: string;
}

interface CupRound {
  name: string;
  order: number;
  matches: CupMatch[];
}

interface CupProgressResponse {
  competitionId: string;
  rounds: CupRound[];
}

interface CupProgressProps {
  cupSlug: string;
  season: string;
}

type MatchStatusType = "completed" | "live" | "upcoming";

function getMatchStatus(status: string): MatchStatusType {
  const s = status.toLowerCase();
  if (s === "ft" || s === "aet" || s.includes("pen") || s === "finished") return "completed";
  if (s === "ht" || s === "1st half" || s === "2nd half" || /^\d+$/.test(s)) return "live";
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

const statusConfig = {
  completed: {
    icon: CheckCircle,
    label: "Completed",
    badgeClass: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
  },
  live: {
    icon: Clock,
    label: "Live",
    badgeClass: "bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30",
  },
  upcoming: {
    icon: CalendarDays,
    label: "Upcoming",
    badgeClass: "bg-gray-500/15 text-gray-600 dark:text-gray-400 border-gray-500/30",
  },
};

function formatRoundName(name: string): string {
  if (/^1\/\d+-finals$/.test(name)) {
    return name.charAt(0).toUpperCase() + name.slice(1);
  }
  if (name.startsWith("all ")) {
    const base = name.replace("all ", "");
    return `All ${formatRoundName(base)}`;
  }
  if (name.startsWith("qualifying ")) {
    const base = name.replace("qualifying ", "");
    return `Qualifying ${formatRoundName(base)}`;
  }
  return name
    .split(/[\s-]+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(name.includes("-") ? "-" : " ");
}

function MatchRow({ match }: { match: CupMatch }) {
  const matchStatus = getMatchStatus(match.status);
  const hasScore = match.score != null;
  const statusText = formatStatusText(match.status);

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
          <>
            <Badge variant="outline" className="text-xs bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/30">
              {statusText}
            </Badge>
            {match.kickoff && <span className="text-[10px]">{match.kickoff}</span>}
          </>
        )}
      </div>
    </div>
  );
}

function RoundCard({ round }: { round: CupRound }) {
  const allCompleted = round.matches.every((m) => getMatchStatus(m.status) === "completed");
  const anyLive = round.matches.some((m) => getMatchStatus(m.status) === "live");
  
  const roundStatus = anyLive ? "live" : allCompleted ? "completed" : "upcoming";
  const config = statusConfig[roundStatus];
  const StatusIcon = config.icon;

  return (
    <Card className="hover-elevate" data-testid={`card-round-${round.name.replace(/\s+/g, "-").toLowerCase()}`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-3 mb-3">
          <h4 className="font-semibold text-base">{formatRoundName(round.name)}</h4>
          <Badge variant="outline" className={`${config.badgeClass} shrink-0 text-xs`}>
            <StatusIcon className="h-3 w-3 mr-1" />
            {config.label}
          </Badge>
        </div>
        <div className="space-y-0">
          {round.matches.slice(0, 8).map((match) => (
            <MatchRow key={match.id} match={match} />
          ))}
          {round.matches.length > 8 && (
            <p className="text-xs text-muted-foreground pt-2">
              +{round.matches.length - 8} more fixtures
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function CupProgress({ cupSlug, season }: CupProgressProps) {
  const competitionId = getGoalserveCupId(cupSlug);

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
    <div className="space-y-3">
      {data.rounds.map((round) => (
        <RoundCard key={round.name} round={round} />
      ))}
    </div>
  );
}
