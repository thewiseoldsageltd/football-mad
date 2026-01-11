import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ExternalLink, AlertCircle, AlertTriangle, CheckCircle, Ban } from "lucide-react";
import type { Injury } from "@shared/schema";

interface InjuryCardProps {
  injury: Injury;
}

const statusConfig: Record<string, { 
  color: string; 
  icon: React.ElementType; 
  bgColor: string;
  badgeBg: string;
}> = {
  OUT: { 
    color: "text-red-600 dark:text-red-400", 
    icon: AlertCircle, 
    bgColor: "bg-red-500/20",
    badgeBg: "bg-red-600 hover:bg-red-700 text-white"
  },
  DOUBTFUL: { 
    color: "text-amber-600 dark:text-amber-400", 
    icon: AlertTriangle, 
    bgColor: "bg-amber-500/20",
    badgeBg: "bg-amber-500 hover:bg-amber-600 text-white"
  },
  SUSPENDED: { 
    color: "text-orange-600 dark:text-orange-400", 
    icon: Ban, 
    bgColor: "bg-orange-500/20",
    badgeBg: "bg-orange-600 hover:bg-orange-700 text-white"
  },
  AVAILABLE: { 
    color: "text-green-600 dark:text-green-400", 
    icon: CheckCircle, 
    bgColor: "bg-green-500/20",
    badgeBg: "bg-green-600 hover:bg-green-700 text-white"
  },
  FIT: { 
    color: "text-green-600 dark:text-green-400", 
    icon: CheckCircle, 
    bgColor: "bg-green-500/20",
    badgeBg: "bg-green-600 hover:bg-green-700 text-white"
  },
};

export function InjuryCard({ injury }: InjuryCardProps) {
  const config = statusConfig[injury.status || "OUT"] || statusConfig.OUT;
  const StatusIcon = config.icon;

  const getSourceLabel = () => {
    if (!injury.sourceName) return null;
    const name = injury.sourceName.toLowerCase();
    if (name.includes("official") || name.includes("club")) {
      return "Official club statement";
    }
    return injury.sourceName;
  };

  const sourceLabel = getSourceLabel();

  return (
    <Card className="hover-elevate" data-testid={`card-injury-${injury.id}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-base leading-tight">{injury.playerName}</h3>
            {injury.teamName && (
              <p className="text-xs text-muted-foreground mt-0.5">{injury.teamName}</p>
            )}
          </div>
          <Badge className={`${config.badgeBg} shrink-0`}>
            <StatusIcon className="h-3 w-3 mr-1" />
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
              <span className="font-medium">{injury.confidencePercent}%</span>
            </div>
            <Progress value={injury.confidencePercent} className="h-2" />
          </div>
        )}

        {injury.notes && (
          <p className="text-xs text-muted-foreground mb-3">{injury.notes}</p>
        )}

        {sourceLabel && (
          <div className="pt-2 border-t">
            {injury.sourceUrl ? (
              <Button
                variant="outline"
                size="sm"
                asChild
                className="w-full text-xs"
                data-testid={`button-source-${injury.id}`}
              >
                <a
                  href={injury.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                >
                  {sourceLabel}
                  <ExternalLink className="h-3 w-3 ml-1" />
                </a>
              </Button>
            ) : (
              <p className="text-xs text-muted-foreground">Source: {sourceLabel}</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
