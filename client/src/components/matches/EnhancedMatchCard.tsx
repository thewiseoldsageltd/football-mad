import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, Globe } from "lucide-react";
import { format } from "date-fns";
import type { MockMatch } from "./mockMatches";
import { getCountryFlagUrl } from "@/lib/flags";

interface EnhancedMatchCardProps {
  match: MockMatch;
  competitionLabel?: string; // Optional disambiguated label from parent grouping
}

interface ParsedCompetition {
  name: string;
  country?: string;
  id?: string;
}

function parseCompetitionLabel(competition: string | null | undefined): ParsedCompetition {
  if (!competition) return { name: "Unknown" };
  
  const fullMatch = competition.match(/^(.+?)\s*\(([^)]+)\)\s*\[(\d+)\]$/);
  if (fullMatch) {
    return { name: fullMatch[1].trim(), country: fullMatch[2].trim(), id: fullMatch[3] };
  }
  
  const colonMatch = competition.match(/^([^:]+):\s*(.+)$/);
  if (colonMatch) {
    return { name: colonMatch[2].trim(), country: colonMatch[1].trim() };
  }
  
  return { name: competition };
}

function CompetitionBadge({ rawCompetition, displayName }: { rawCompetition?: string | null; displayName: string }) {
  const parsed = parseCompetitionLabel(rawCompetition);
  const flagUrl = getCountryFlagUrl(parsed.country);

  return (
    <Badge variant="outline" className="text-xs flex-shrink-0 gap-1.5">
      {flagUrl ? (
        <img 
          src={flagUrl} 
          alt={parsed.country || ""} 
          className="w-4 h-3 object-cover rounded-sm"
          onError={(e) => {
            e.currentTarget.style.display = 'none';
          }}
        />
      ) : (
        <Globe className="w-3 h-3 text-muted-foreground" />
      )}
      <span>{displayName}</span>
    </Badge>
  );
}

function TeamLogo({ team, size = "md" }: { team: MockMatch["homeTeam"]; size?: "sm" | "md" }) {
  const sizeClasses = size === "sm" ? "w-8 h-8" : "w-12 h-12";
  const textSize = size === "sm" ? "text-sm" : "text-lg";

  return (
    <div
      className={`${sizeClasses} rounded-lg flex items-center justify-center flex-shrink-0`}
      style={{ backgroundColor: team.primaryColor }}
    >
      {team.logoUrl ? (
        <img src={team.logoUrl} alt={team.name} className="w-3/4 h-3/4 object-contain" />
      ) : (
        <span className={`${textSize} font-bold text-white`}>
          {team.shortName[0]}
        </span>
      )}
    </div>
  );
}

function StatusBadge({ status, minute }: { status: MockMatch["status"]; minute?: number }) {
  switch (status) {
    case "live":
      return (
        <Badge className="bg-red-500 text-white border-0" data-testid="badge-live">
          <span className="relative flex h-2 w-2 mr-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
          </span>
          LIVE {minute ? `${minute}'` : ""}
        </Badge>
      );
    case "finished":
      return (
        <Badge variant="secondary" data-testid="badge-ft">
          FT
        </Badge>
      );
    case "postponed":
      return (
        <Badge variant="outline" className="border-amber-500 text-amber-600 dark:text-amber-400" data-testid="badge-postponed">
          P-P
        </Badge>
      );
    default:
      return null;
  }
}

export function EnhancedMatchCard({ match, competitionLabel }: EnhancedMatchCardProps) {
  const kickoffTime = new Date(match.kickOffTime);
  const showScore = match.status === "live" || match.status === "finished";
  const isLive = match.status === "live";
  // Use provided competitionLabel (may be disambiguated), fallback to match.competition
  const displayLabel = competitionLabel || match.competition;

  return (
    <div
      tabIndex={0}
      role="button"
      className="relative group cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-lg"
      data-testid={`card-match-${match.id}`}
    >
      {isLive && (
        <div className="absolute left-0 top-2 bottom-2 w-1 bg-red-500 rounded-full" aria-hidden="true" />
      )}
      <Card className="hover-elevate active-elevate-2 overflow-hidden">
        <CardContent className={`p-4 ${isLive ? "pl-5" : ""} overflow-hidden`}>
          {/* Mobile: pill on its own row */}
          <div className="flex justify-center mb-2 sm:hidden">
            <CompetitionBadge rawCompetition={match.rawCompetition} displayName={displayLabel} />
          </div>

          {/* Desktop: 2-row grid with pill above teams */}
          <div className="hidden sm:grid grid-cols-[1fr_auto_1fr] grid-rows-[auto_auto] gap-x-3 gap-y-1">
            <div className="col-start-2 row-start-1 flex justify-center">
              <CompetitionBadge rawCompetition={match.rawCompetition} displayName={displayLabel} />
            </div>

            <div className="col-start-1 row-start-2 min-w-0 flex items-center gap-2">
              <div className="shrink-0">
                <TeamLogo team={match.homeTeam} size="sm" />
              </div>
              <span className="font-medium text-sm min-w-0 truncate">{match.homeTeam.name}</span>
            </div>

            <div className="col-start-2 row-start-2 flex flex-col items-center justify-center gap-0.5 px-2">
              {showScore ? (
                <div className="text-xl font-bold tabular-nums whitespace-nowrap">
                  {match.homeScore} – {match.awayScore}
                </div>
              ) : match.status === "postponed" ? (
                <div className="text-sm text-muted-foreground font-medium">TBC</div>
              ) : (
                <div className="text-lg font-bold tabular-nums whitespace-nowrap">
                  {format(kickoffTime, "HH:mm")}
                </div>
              )}
              <StatusBadge status={match.status} minute={match.minute} />
            </div>

            <div className="col-start-3 row-start-2 min-w-0 flex items-center gap-2 justify-end">
              <span className="font-medium text-sm min-w-0 truncate text-right">{match.awayTeam.name}</span>
              <div className="shrink-0">
                <TeamLogo team={match.awayTeam} size="sm" />
              </div>
            </div>
          </div>

          {/* Mobile: 3-column teams row (no pill here, already above) */}
          <div className="grid grid-cols-[1fr_auto_1fr] gap-x-2 items-center sm:hidden">
            <div className="min-w-0 flex items-center gap-2 justify-end">
              <div className="shrink-0">
                <TeamLogo team={match.homeTeam} size="sm" />
              </div>
              <span className="font-medium text-sm min-w-0 truncate">{match.homeTeam.name}</span>
            </div>

            <div className="flex flex-col items-center justify-center gap-0.5 px-1">
              {showScore ? (
                <div className="text-xl font-bold tabular-nums whitespace-nowrap">
                  {match.homeScore} – {match.awayScore}
                </div>
              ) : match.status === "postponed" ? (
                <div className="text-sm text-muted-foreground font-medium">TBC</div>
              ) : (
                <div className="text-lg font-bold tabular-nums whitespace-nowrap">
                  {format(kickoffTime, "HH:mm")}
                </div>
              )}
              <StatusBadge status={match.status} minute={match.minute} />
            </div>

            <div className="min-w-0 flex items-center gap-2 justify-start">
              <span className="font-medium text-sm min-w-0 truncate">{match.awayTeam.name}</span>
              <div className="shrink-0">
                <TeamLogo team={match.awayTeam} size="sm" />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-center gap-4 mt-3 text-xs text-muted-foreground/70">
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {format(kickoffTime, "EEE d MMM")}
            </span>
            {match.venue && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {match.venue}
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
