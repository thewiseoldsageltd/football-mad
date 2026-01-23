import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Globe } from "lucide-react";
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
  const isLive = match.status === "live";
  // Use provided competitionLabel (may be disambiguated), fallback to match.competition
  // Strip any country suffix like "(England)" or "• England" - flag is enough
  const rawLabel = competitionLabel || match.competition;
  const displayLabel = rawLabel.replace(/\s*\([^)]+\)\s*$/, "").replace(/\s*•\s*\w+\s*$/, "");

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
          {/* LINE 1: Competition pill (centered) */}
          <div className="flex justify-center mb-2">
            <CompetitionBadge rawCompetition={match.rawCompetition} displayName={displayLabel} />
          </div>

          {/* LINE 2: 5-column grid [crest][name-right][kickoff][name-left][crest] */}
          <div className="grid grid-cols-[40px_minmax(0,1fr)_64px_minmax(0,1fr)_40px] md:grid-cols-[40px_minmax(0,1fr)_80px_minmax(0,1fr)_40px] gap-x-2 items-center">
            {/* Home crest */}
            <div className="w-10 h-10 flex-shrink-0">
              <TeamLogo team={match.homeTeam} size="sm" />
            </div>

            {/* Home name - right aligned toward center */}
            <div className="min-w-0 overflow-hidden">
              <span className="font-medium text-sm truncate block text-right">{match.homeTeam.name}</span>
            </div>

            {/* Center: kickoff time / score */}
            <div className="min-w-[64px] flex items-center justify-center">
              {(() => {
                const hasScores = match.homeScore !== null && match.homeScore !== undefined &&
                                  match.awayScore !== null && match.awayScore !== undefined;
                
                if (match.status === "finished" || match.status === "live") {
                  if (hasScores) {
                    return (
                      <div className="text-lg font-bold tabular-nums whitespace-nowrap leading-none">
                        {match.homeScore}–{match.awayScore}
                      </div>
                    );
                  }
                  // Finished/live but no scores - show FT badge only
                  return <StatusBadge status={match.status} minute={match.minute} />;
                }
                if (match.status === "postponed") {
                  return <div className="text-sm text-muted-foreground font-medium whitespace-nowrap leading-none">TBC</div>;
                }
                // Scheduled - show kickoff time
                return (
                  <div className="text-lg font-bold tabular-nums whitespace-nowrap leading-none">
                    {format(kickoffTime, "HH:mm")}
                  </div>
                );
              })()}
            </div>

            {/* Away name - left aligned toward center */}
            <div className="min-w-0 overflow-hidden">
              <span className="font-medium text-sm truncate block text-left">{match.awayTeam.name}</span>
            </div>

            {/* Away crest */}
            <div className="w-10 h-10 flex-shrink-0">
              <TeamLogo team={match.awayTeam} size="sm" />
            </div>
          </div>

          {/* LINE 3: Date only (no venue) */}
          <div className="flex items-center justify-center mt-2 text-xs text-muted-foreground/70">
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {format(kickoffTime, "EEE d MMM")}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
