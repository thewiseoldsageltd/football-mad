import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Globe, MapPin } from "lucide-react";
import { format } from "date-fns";
import { Link } from "wouter";
import type { MockMatch } from "./mockMatches";
import { getCountryFlagUrl } from "@/lib/flags";
import { MatchTeamBadge } from "./match-team-badge";
import { getCompetitionCountryById, getPublicCompetitionDisplayName } from "./competition-priority";
import { formatCompetitionHeroLabel } from "@shared/competition-display";
import { resolveMatchDetailHref } from "@shared/match-slug";

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
    return {
      name: getPublicCompetitionDisplayName(fullMatch[1].trim(), fullMatch[3]),
      country: fullMatch[2].trim(),
      id: fullMatch[3],
    };
  }

  const colonMatch = competition.match(/^([^:]+):\s*(.+)$/);
  if (colonMatch) {
    return {
      name: getPublicCompetitionDisplayName(colonMatch[2].trim(), null),
      country: colonMatch[1].trim(),
    };
  }

  const idMatch = competition.match(/\[(\d+)\]\s*$/);
  if (idMatch) {
    const country = getCompetitionCountryById(idMatch[1]);
    return {
      name: getPublicCompetitionDisplayName(competition, idMatch[1]),
      country: country ?? undefined,
      id: idMatch[1],
    };
  }

  return { name: getPublicCompetitionDisplayName(competition, null) };
}

function CompetitionBadge({
  rawCompetition,
  displayName,
  goalserveCompetitionId,
  logoUrl,
}: {
  rawCompetition?: string | null;
  displayName: string;
  goalserveCompetitionId?: string | null;
  logoUrl?: string | null;
}) {
  const parsed = parseCompetitionLabel(rawCompetition);
  const country = parsed.country || getCompetitionCountryById(goalserveCompetitionId);
  const flagUrl = getCountryFlagUrl(country ?? undefined);

  return (
    <Badge
      variant="outline"
      className="text-[11px] font-medium flex-shrink-0 gap-2 border-border/70 bg-muted/40 text-foreground px-2.5 py-1 rounded-full max-w-full"
    >
      {logoUrl ? (
        <span className="h-5 w-5 rounded-md bg-white dark:bg-background border border-border/60 p-[1px] overflow-hidden flex items-center justify-center shadow-[0_0_0_1px_rgba(255,255,255,0.5)_inset]">
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
          alt={country || ""}
          className="w-4 h-3 object-cover rounded-sm"
          onError={(e) => {
            e.currentTarget.style.display = "none";
          }}
        />
      ) : (
        <Globe className="w-3 h-3 text-muted-foreground" />
      )}
      <span className="truncate">{displayName}</span>
    </Badge>
  );
}

function StatusBadge({ status, minute }: { status: MockMatch["status"]; minute?: number }) {
  switch (status) {
    case "live":
      return (
        <Badge className="bg-red-500 text-white border-0" data-testid="badge-live">
          <span className="relative flex h-2 w-2 mr-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
            <span className="relative inline-flex h-2 w-2 rounded-full bg-white"></span>
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
        <Badge
          variant="outline"
          className="border-amber-500 text-amber-600 dark:text-amber-400"
          data-testid="badge-postponed"
        >
          P-P
        </Badge>
      );
    default:
      return null;
  }
}

function CenterScoreOrTime({ match, kickoffTime }: { match: MockMatch; kickoffTime: Date }) {
  const hasScores =
    match.homeScore !== null &&
    match.homeScore !== undefined &&
    match.awayScore !== null &&
    match.awayScore !== undefined;

  if (match.status === "finished" || match.status === "live") {
    if (hasScores) {
      return (
        <div className="flex flex-col items-center gap-1">
          <span className="text-xl md:text-2xl font-bold tabular-nums whitespace-nowrap leading-none">
            {match.homeScore}–{match.awayScore}
          </span>
          {match.status === "live" && match.minute ? (
            <span className="text-[11px] font-semibold tabular-nums text-red-600">{match.minute}'</span>
          ) : match.status === "finished" ? (
            <StatusBadge status={match.status} />
          ) : null}
        </div>
      );
    }
    return <StatusBadge status={match.status} minute={match.minute} />;
  }
  if (match.status === "postponed") {
    return <span className="text-sm text-muted-foreground font-medium whitespace-nowrap leading-none">TBC</span>;
  }
  return (
    <span className="text-xl md:text-2xl font-bold tabular-nums whitespace-nowrap leading-none tracking-tight">
      {format(kickoffTime, "HH:mm")}
    </span>
  );
}

export function EnhancedMatchCard({ match, competitionLabel }: EnhancedMatchCardProps) {
  const kickoffTime = new Date(match.kickOffTime);
  const isLive = match.status === "live";
  const homeDisplayName = match.homeTeam.name?.trim() || match.homeTeam.shortName || "Unknown";
  const awayDisplayName = match.awayTeam.name?.trim() || match.awayTeam.shortName || "Unknown";
  const rawLabel = competitionLabel || match.competition;
  const idMatch = rawLabel.match(/\[(\d+)\]\s*$/);
  const goalserveId = idMatch ? idMatch[1] : match.goalserveCompetitionId ?? null;
  const displayLabel = formatCompetitionHeroLabel(
    rawLabel.replace(/\s*•\s*\w+\s*$/, "").trim(),
    goalserveId,
  );
  const hasVenue = typeof match.venue === "string" && match.venue.trim().length > 0;
  const detailHref = resolveMatchDetailHref({
    slug: match.slug,
    homeTeamSlug: match.homeTeam.slug,
    awayTeamSlug: match.awayTeam.slug,
    kickoffTime: match.kickOffTime,
  });

  const cardInner = (
    <Card className="hover-elevate active-elevate-2 overflow-hidden border-border/70">
      <CardContent className={`p-4 md:p-5 ${isLive ? "pl-5 md:pl-6" : ""} overflow-hidden`}>
        <div className="flex justify-center mb-3">
          <CompetitionBadge
            rawCompetition={match.rawCompetition}
            displayName={displayLabel}
            goalserveCompetitionId={match.goalserveCompetitionId}
            logoUrl={match.competitionLogoUrl}
          />
        </div>

        {/* Mobile: crest-over-name columns matching Match Centre hero */}
        <div className="md:hidden grid grid-cols-[1fr_auto_1fr] gap-x-2 items-start">
          <div className="flex flex-col items-center gap-1.5 min-w-0">
            <MatchTeamBadge team={match.homeTeam} size="sm" />
            <span className="font-semibold text-sm leading-snug text-center line-clamp-2 w-full">
              {homeDisplayName}
            </span>
          </div>
          <div className="flex items-center justify-center pt-3 min-w-[4.5rem]">
            <CenterScoreOrTime match={match} kickoffTime={kickoffTime} />
          </div>
          <div className="flex flex-col items-center gap-1.5 min-w-0">
            <MatchTeamBadge team={match.awayTeam} size="sm" />
            <span className="font-semibold text-sm leading-snug text-center line-clamp-2 w-full">
              {awayDisplayName}
            </span>
          </div>
        </div>

        {/* Desktop: crest | name | kickoff | name | crest */}
        <div className="hidden md:grid grid-cols-[64px_minmax(0,1fr)_116px_minmax(0,1fr)_64px] gap-x-3 items-center">
          <div className="h-16 flex items-center justify-center">
            <MatchTeamBadge team={match.homeTeam} size="sm" />
          </div>
          <div className="min-w-0 overflow-hidden flex items-center justify-end">
            <span className="font-semibold text-base leading-tight text-right line-clamp-2">
              {homeDisplayName}
            </span>
          </div>
          <div className="flex items-center justify-center">
            <CenterScoreOrTime match={match} kickoffTime={kickoffTime} />
          </div>
          <div className="min-w-0 overflow-hidden flex items-center justify-start">
            <span className="font-semibold text-base leading-tight text-left line-clamp-2">
              {awayDisplayName}
            </span>
          </div>
          <div className="h-16 flex items-center justify-center">
            <MatchTeamBadge team={match.awayTeam} size="sm" />
          </div>
        </div>

        <div className="flex flex-col items-center justify-center mt-2.5 text-xs text-muted-foreground/80">
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
  );

  if (!detailHref) {
    return (
      <div className="relative rounded-lg" data-testid={`card-match-${match.id}`}>
        {isLive && (
          <div className="absolute left-0 top-2 bottom-2 w-1 bg-red-500 rounded-full" aria-hidden="true" />
        )}
        {cardInner}
      </div>
    );
  }

  return (
    <Link
      href={detailHref}
      className="relative group block cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-lg"
      data-testid={`card-match-${match.id}`}
      aria-label={`${homeDisplayName} vs ${awayDisplayName}`}
    >
      {isLive && (
        <div className="absolute left-0 top-2 bottom-2 w-1 bg-red-500 rounded-full" aria-hidden="true" />
      )}
      {cardInner}
    </Link>
  );
}
