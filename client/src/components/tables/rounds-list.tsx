import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Clock, CalendarDays } from "lucide-react";
import type { CupRound } from "@/data/tables-mock";

interface RoundsListProps {
  rounds: CupRound[];
  title?: string;
}

const statusConfig = {
  completed: { 
    icon: CheckCircle, 
    label: "Completed",
    badgeClass: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30"
  },
  ongoing: { 
    icon: Clock, 
    label: "In Progress",
    badgeClass: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30"
  },
  upcoming: { 
    icon: CalendarDays, 
    label: "Upcoming",
    badgeClass: "bg-gray-500/15 text-gray-600 dark:text-gray-400 border-gray-500/30"
  },
};

export function RoundsList({ rounds, title }: RoundsListProps) {
  return (
    <div className="space-y-3">
      {title && (
        <h3 className="text-sm font-medium text-muted-foreground mb-4">{title}</h3>
      )}
      {rounds.map((round) => {
        const config = statusConfig[round.status];
        const StatusIcon = config.icon;

        return (
          <Card key={round.id} className="hover-elevate" data-testid={`card-round-${round.id}`}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-base">{round.name}</h4>
                  {round.fixtures && round.fixtures.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {round.fixtures.slice(0, 3).map((fixture, idx) => (
                        <p key={idx} className="text-sm text-muted-foreground">
                          {fixture}
                        </p>
                      ))}
                      {round.fixtures.length > 3 && (
                        <p className="text-xs text-muted-foreground">
                          +{round.fixtures.length - 3} more fixtures
                        </p>
                      )}
                    </div>
                  )}
                </div>
                <Badge 
                  variant="outline" 
                  className={`${config.badgeClass} shrink-0 text-xs`}
                  data-testid={`badge-status-${round.id}`}
                >
                  <StatusIcon className="h-3 w-3 mr-1" />
                  {config.label}
                </Badge>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
