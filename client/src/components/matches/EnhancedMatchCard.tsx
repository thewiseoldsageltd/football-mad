import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Globe, MapPin } from "lucide-react";
import { format } from "date-fns";
import type { MockMatch } from "./mockMatches";
import { getCountryFlagUrl } from "@/lib/flags";
import { EntityAvatar } from "@/components/entity-media";

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

function CompetitionBadge({
  rawCompetition,
  displayName,
  logoUrl,
}: {
  rawCompetition?: string | null;
  displayName: string;
  logoUrl?: string | null;
}) {
  const parsed = parseCompetitionLabel(rawCompetition);
  const flagUrl = getCountryFlagUrl(parsed.country);

  return (
    <Badge
      variant="outline"
      className="text-[11px] font-medium flex-shrink-0 gap-1.5 border-border/70 bg-muted/40 text-foreground px-2.5 py-1 rounded-full"
    >
      {logoUrl ? (
        <span className="h-4 w-4 rounded-sm bg-white/95 dark:bg-background/95 border border-border/60 p-[1px] overflow-hidden flex items-center justify-center">
          <img
            src={logoUrl}
            alt={displayName}
            className="h-full w-full object-contain"
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
        </span>
      ) : flagUrl ? (
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
  const sizeClasses = size === "sm" ? "w-14 h-14 md:w-16 md:h-16" : "w-16 h-16";

  return (
    <div
      className={`${sizeClasses} rounded-xl flex items-center justify-center flex-shrink-0 border border-border/60 bg-white/95 dark:bg-background/95 p-0.5 shadow-sm`}
    >
      <EntityAvatar
        entityType="team"
        entityId={team.id}
        label={team.name}
        surface="hub_header"
        sizeClassName="h-full w-full"
        shape="square"
        objectFit="contain"
        className="rounded-lg"
      />
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
  const homeDisplayName = match.homeTeam.name?.trim() || match.homeTeam.shortName || "Unknown";
  const awayDisplayName = match.awayTeam.name?.trim() || match.awayTeam.shortName || "Unknown";
  // Use provided competitionLabel (may be disambiguated), fallback to match.competition
  // Strip any country suffix like "(England)" or "• England" - flag is enough
  const rawLabel = competitionLabel || match.competition;
  const displayLabel = rawLabel.replace(/\s*\([^)]+\)\s*$/, "").replace(/\s*•\s*\w+\s*$/, "");
  const hasVenue = typeof match.venue === "string" && match.venue.trim().length > 0;

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
      <Card className="hover-elevate active-elevate-2 overflow-hidden border-border/70">
        <CardContent className={`p-4 md:p-5 ${isLive ? "pl-5 md:pl-6" : ""} overflow-hidden`}>
          {/* LINE 1: Competition pill (centered) */}
          <div className="flex justify-center mb-2">
            <CompetitionBadge
              rawCompetition={match.rawCompetition}
              displayName={displayLabel}
              logoUrl={match.competitionLogoUrl}
            />
          </div>

          {/* LINE 2: 5-column grid [crest][name-right][kickoff][name-left][crest] */}
          <div className="grid grid-cols-[56px_minmax(0,1fr)_88px_minmax(0,1fr)_56px] md:grid-cols-[64px_minmax(0,1fr)_116px_minmax(0,1fr)_64px] gap-x-2 md:gap-x-3 items-center">
            {/* Home crest */}
            <div className="h-14 md:h-16 flex items-center justify-center">
              <TeamLogo team={match.homeTeam} size="sm" />
            </div>

            {/* Home name - right aligned toward center */}
            <div className="min-w-0 overflow-hidden flex items-center justify-end">
              <span className="font-semibold text-sm md:text-base truncate leading-tight">{homeDisplayName}</span>
            </div>

            {/* Center: kickoff time / score */}
            <div className="flex items-center justify-center">
              {(() => {
                const hasScores = match.homeScore !== null && match.homeScore !== undefined &&
                                  match.awayScore !== null && match.awayScore !== undefined;
                
                if (match.status === "finished" || match.status === "live") {
                  if (hasScores) {
                    return (
                      <span className="text-xl md:text-2xl font-bold tabular-nums whitespace-nowrap leading-none">
                        {match.homeScore}–{match.awayScore}
                      </span>
                    );
                  }
                  // Finished/live but no scores - show FT badge only
                  return <StatusBadge status={match.status} minute={match.minute} />;
                }
                if (match.status === "postponed") {
                  return <span className="text-sm text-muted-foreground font-medium whitespace-nowrap leading-none">TBC</span>;
                }
                // Scheduled - show kickoff time
                return (
                  <span className="text-xl md:text-2xl font-bold tabular-nums whitespace-nowrap leading-none tracking-tight">
                    {format(kickoffTime, "HH:mm")}
                  </span>
                );
              })()}
            </div>

            {/* Away name - left aligned toward center */}
            <div className="min-w-0 overflow-hidden flex items-center justify-start">
              <span className="font-semibold text-sm md:text-base truncate leading-tight">{awayDisplayName}</span>
            </div>

            {/* Away crest */}
            <div className="h-14 md:h-16 flex items-center justify-center">
              <TeamLogo team={match.awayTeam} size="sm" />
            </div>
          </div>

          {/* LINE 3: Date + optional venue */}
          <div className="flex flex-col items-center justify-center mt-2 text-xs text-muted-foreground/80">
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {format(kickoffTime, "EEE d MMM")}
            </span>
            {hasVenue && (
              <span className="mt-1 flex items-center gap-1 max-w-[85%] truncate">
                <MapPin className="h-3 w-3 shrink-0" />
                <span className="truncate">{match.venue?.trim()}</span>
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
