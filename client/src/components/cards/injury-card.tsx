import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ExternalLink, AlertCircle, AlertTriangle, CheckCircle } from "lucide-react";
import type { Injury } from "@shared/schema";

interface InjuryCardProps {
  injury: Injury;
}

const statusConfig: Record<string, { color: string; icon: React.ElementType; bgColor: string }> = {
  OUT: { color: "text-red-600 dark:text-red-400", icon: AlertCircle, bgColor: "bg-red-500/20" },
  DOUBTFUL: { color: "text-amber-600 dark:text-amber-400", icon: AlertTriangle, bgColor: "bg-amber-500/20" },
  FIT: { color: "text-green-600 dark:text-green-400", icon: CheckCircle, bgColor: "bg-green-500/20" },
};

export function InjuryCard({ injury }: InjuryCardProps) {
  const config = statusConfig[injury.status || "OUT"] || statusConfig.OUT;
  const StatusIcon = config.icon;

  return (
    <Card className="hover-elevate" data-testid={`card-injury-${injury.id}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-lg">{injury.playerName}</h3>
              <div className={`p-1 rounded-full ${config.bgColor}`}>
                <StatusIcon className={`h-4 w-4 ${config.color}`} />
              </div>
            </div>
            {injury.teamName && (
              <p className="text-sm text-muted-foreground">{injury.teamName}</p>
            )}
          </div>
          <Badge
            variant="outline"
            className={`${config.color} border-current`}
          >
            {injury.status}
          </Badge>
        </div>

        {injury.injuryType && (
          <p className="text-sm font-medium mb-2">{injury.injuryType}</p>
        )}

        {injury.expectedReturn && (
          <p className="text-sm text-muted-foreground mb-3">
            Expected return: <span className="font-medium text-foreground">{injury.expectedReturn}</span>
          </p>
        )}

        {injury.confidencePercent !== null && injury.confidencePercent !== undefined && (
          <div className="mb-3">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span>Confidence</span>
              <span>{injury.confidencePercent}%</span>
            </div>
            <Progress value={injury.confidencePercent} className="h-2" />
          </div>
        )}

        {injury.notes && (
          <p className="text-sm text-muted-foreground mb-3">{injury.notes}</p>
        )}

        {injury.sourceName && (
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {injury.sourceUrl ? (
                <a
                  href={injury.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 hover:text-primary"
                  onClick={(e) => e.stopPropagation()}
                >
                  {injury.sourceName}
                  <ExternalLink className="h-3 w-3" />
                </a>
              ) : (
                injury.sourceName
              )}
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
