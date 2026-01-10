import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin } from "lucide-react";
import type { Match, Team } from "@shared/schema";
import { format, isToday, isTomorrow, isPast } from "date-fns";

interface MatchCardProps {
  match: Match & { homeTeam?: Team; awayTeam?: Team };
}

export function MatchCard({ match }: MatchCardProps) {
  const kickoffTime = new Date(match.kickoffTime);
  const isMatchToday = isToday(kickoffTime);
  const isMatchTomorrow = isTomorrow(kickoffTime);
  const isMatchPast = isPast(kickoffTime);

  const getStatusBadge = () => {
    if (match.status === "live") {
      return <Badge className="bg-red-500 text-white border-0 animate-pulse">LIVE</Badge>;
    }
    if (match.status === "finished" || isMatchPast) {
      return <Badge variant="secondary">FT</Badge>;
    }
    if (isMatchToday) {
      return <Badge className="bg-primary text-primary-foreground">Today</Badge>;
    }
    if (isMatchTomorrow) {
      return <Badge variant="outline">Tomorrow</Badge>;
    }
    return null;
  };

  return (
    <Link href={`/matches/${match.slug}`}>
      <Card className="group hover-elevate active-elevate-2 cursor-pointer" data-testid={`card-match-${match.id}`}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <Badge variant="outline" className="text-xs">
              {match.competition}
            </Badge>
            {getStatusBadge()}
          </div>

          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 text-center">
              <div
                className="w-12 h-12 mx-auto rounded-lg flex items-center justify-center mb-2"
                style={{ backgroundColor: match.homeTeam?.primaryColor || "#1a1a2e" }}
              >
                {match.homeTeam?.logoUrl ? (
                  <img src={match.homeTeam.logoUrl} alt={match.homeTeam.name} className="w-8 h-8 object-contain" />
                ) : (
                  <span className="text-lg font-bold text-white">
                    {match.homeTeam?.shortName?.[0] || "H"}
                  </span>
                )}
              </div>
              <p className="font-medium text-sm truncate">{match.homeTeam?.name || "Home"}</p>
            </div>

            <div className="flex-shrink-0 text-center px-4">
              {match.status === "finished" || (match.homeScore !== null && match.awayScore !== null) ? (
                <div className="text-2xl font-bold">
                  {match.homeScore} - {match.awayScore}
                </div>
              ) : (
                <div className="text-lg font-semibold text-muted-foreground">
                  {format(kickoffTime, "HH:mm")}
                </div>
              )}
            </div>

            <div className="flex-1 text-center">
              <div
                className="w-12 h-12 mx-auto rounded-lg flex items-center justify-center mb-2"
                style={{ backgroundColor: match.awayTeam?.primaryColor || "#1a1a2e" }}
              >
                {match.awayTeam?.logoUrl ? (
                  <img src={match.awayTeam.logoUrl} alt={match.awayTeam.name} className="w-8 h-8 object-contain" />
                ) : (
                  <span className="text-lg font-bold text-white">
                    {match.awayTeam?.shortName?.[0] || "A"}
                  </span>
                )}
              </div>
              <p className="font-medium text-sm truncate">{match.awayTeam?.name || "Away"}</p>
            </div>
          </div>

          <div className="flex items-center justify-center gap-4 mt-4 text-xs text-muted-foreground">
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
    </Link>
  );
}
