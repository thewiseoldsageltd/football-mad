import { Link } from "wouter";
import { Crown, Clock, Activity } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { GoalserveSquadPlayer, GoalservePosition, AvailabilityEntry } from "@/lib/mock/goalserveMock";
import { getPlayerSlugFromSquadPlayer } from "@/lib/mock/goalserveMock";
import { playerProfile } from "@/lib/urls";

interface PlayerCardProps {
  player: GoalserveSquadPlayer;
  toMiss: AvailabilityEntry[];
  questionable: AvailabilityEntry[];
}

function getPositionLabel(position: GoalservePosition): string {
  switch (position) {
    case "G": return "GK";
    case "D": return "DEF";
    case "M": return "MID";
    case "A": return "FWD";
    default: return position;
  }
}

function getPositionColor(position: GoalservePosition): string {
  switch (position) {
    case "G": return "bg-amber-500/10 text-amber-600 dark:text-amber-400";
    case "D": return "bg-blue-500/10 text-blue-600 dark:text-blue-400";
    case "M": return "bg-green-500/10 text-green-600 dark:text-green-400";
    case "A": return "bg-red-500/10 text-red-600 dark:text-red-400";
    default: return "bg-muted text-muted-foreground";
  }
}

function getInitials(name: string): string {
  const parts = name.split(" ");
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
}

export function PlayerCard({ player, toMiss, questionable }: PlayerCardProps) {
  const playerSlug = getPlayerSlugFromSquadPlayer(player);
  const isMissing = toMiss.find((e) => e.playerId === player.id);
  const isQuestionable = questionable.find((e) => e.playerId === player.id);
  const isGoalkeeper = player.position === "G";

  return (
    <Link href={playerProfile(playerSlug)}>
      <Card className="hover-elevate cursor-pointer transition-all h-full" data-testid={`card-player-${player.id}`}>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="relative">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-sm font-semibold text-muted-foreground">
                {getInitials(player.name)}
              </div>
              {player.isCaptain === 1 && (
                <div className="absolute -top-1 -right-1 bg-amber-500 rounded-full p-0.5" title="Captain">
                  <Crown className="h-3 w-3 text-white" />
                </div>
              )}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="font-medium text-sm truncate">{player.name}</h4>
                <span className="text-xs text-muted-foreground">#{player.number}</span>
              </div>
              
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <Badge variant="outline" className={`text-xs ${getPositionColor(player.position)}`}>
                  {getPositionLabel(player.position)}
                </Badge>
                
                {isMissing && (
                  <Badge variant="destructive" className="text-xs gap-1">
                    <Activity className="h-3 w-3" />
                    Out
                  </Badge>
                )}
                
                {isQuestionable && !isMissing && (
                  <Badge className="text-xs gap-1 bg-orange-500 hover:bg-orange-600">
                    <Clock className="h-3 w-3" />
                    Doubtful
                  </Badge>
                )}
              </div>
              
              {(isMissing || isQuestionable) && (
                <p className="text-xs text-muted-foreground mt-1 truncate">
                  {isMissing?.status || isQuestionable?.status}
                </p>
              )}
            </div>
          </div>
          
          <div className="mt-3 pt-3 border-t">
            <div className="grid grid-cols-5 gap-1 text-center">
              <div>
                <div className="text-xs text-muted-foreground">Mins</div>
                <div className="text-sm font-medium">{player.minutes}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Apps</div>
                <div className="text-sm font-medium">{player.appearances}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Goals</div>
                <div className="text-sm font-medium">{player.goals}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Asst</div>
                <div className="text-sm font-medium">{player.assists}</div>
              </div>
              {isGoalkeeper ? (
                <div>
                  <div className="text-xs text-muted-foreground">Saves</div>
                  <div className="text-sm font-medium">{player.saves}</div>
                </div>
              ) : (
                <div>
                  <div className="text-xs text-muted-foreground">Rating</div>
                  <div className="text-sm font-medium">{player.rating}</div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
