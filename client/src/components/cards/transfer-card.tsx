import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, ExternalLink } from "lucide-react";
import type { Transfer } from "@shared/schema";

interface TransferCardProps {
  transfer: Transfer;
}

const reliabilityColors: Record<string, string> = {
  A: "bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 border-yellow-500",
  B: "bg-gray-400/20 text-gray-600 dark:text-gray-300 border-gray-400",
  C: "bg-amber-700/20 text-amber-700 dark:text-amber-500 border-amber-700 border-dashed",
  D: "bg-gray-300/20 text-gray-500 dark:text-gray-400 border-gray-400 border-dotted",
};

export function TransferCard({ transfer }: TransferCardProps) {
  const isConfirmed = transfer.status === "confirmed";
  
  return (
    <Card className="hover-elevate" data-testid={`card-transfer-${transfer.id}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="flex-1">
            <h3 className="font-semibold text-lg">{transfer.playerName}</h3>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
              <span>{transfer.fromTeamName || "Unknown"}</span>
              <ArrowRight className="h-4 w-4 text-primary" />
              <span>{transfer.toTeamName || "Unknown"}</span>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <Badge
              variant={isConfirmed ? "default" : "secondary"}
              className={isConfirmed ? "bg-primary" : ""}
            >
              {isConfirmed ? "Confirmed" : "Rumour"}
            </Badge>
            {transfer.reliabilityTier && (
              <Badge
                variant="outline"
                className={`text-xs ${reliabilityColors[transfer.reliabilityTier] || ""}`}
              >
                Tier {transfer.reliabilityTier}
              </Badge>
            )}
          </div>
        </div>

        {transfer.fee && (
          <p className="text-lg font-bold text-primary mb-2">{transfer.fee}</p>
        )}

        {transfer.notes && (
          <p className="text-sm text-muted-foreground mb-3">{transfer.notes}</p>
        )}

        {transfer.sourceName && (
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {transfer.sourceUrl ? (
                <a
                  href={transfer.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 hover:text-primary"
                  onClick={(e) => e.stopPropagation()}
                >
                  {transfer.sourceName}
                  <ExternalLink className="h-3 w-3" />
                </a>
              ) : (
                transfer.sourceName
              )}
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
