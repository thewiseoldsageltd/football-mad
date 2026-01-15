import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import type { TransferRumour } from "@/data/transfers-dummy";

interface RumourTransferCardProps {
  rumour: TransferRumour;
}

const tierStyles: Record<string, string> = {
  "Tier A": "bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 border-yellow-500",
  "Tier B": "bg-gray-400/20 text-gray-600 dark:text-gray-300 border-gray-400",
  "Tier C": "bg-amber-700/20 text-amber-700 dark:text-amber-500 border-amber-700 border-dashed",
};

export function RumourTransferCard({ rumour }: RumourTransferCardProps) {
  return (
    <Card className="hover-elevate" data-testid={`card-rumour-${rumour.id}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-lg" data-testid={`text-player-${rumour.id}`}>
                {rumour.playerName}
              </h3>
              {rumour.position && (
                <Badge variant="outline" className="text-xs">
                  {rumour.position}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>{rumour.fromClub}</span>
              <ArrowRight className="h-4 w-4 text-primary" />
              <span>{rumour.toClub}</span>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <Badge variant="secondary">Rumour</Badge>
            {rumour.tier && (
              <Badge variant="outline" className={`text-xs ${tierStyles[rumour.tier] || ""}`}>
                {rumour.tier}
              </Badge>
            )}
          </div>
        </div>

        {rumour.feeText && (
          <p className="text-lg font-bold text-primary mb-2" data-testid={`text-fee-${rumour.id}`}>{rumour.feeText}</p>
        )}

        {rumour.confidence !== undefined && (
          <div className="mb-3" data-testid={`confidence-${rumour.id}`}>
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="text-muted-foreground">Confidence</span>
              <span className="font-medium">{rumour.confidence}%</span>
            </div>
            <Progress value={rumour.confidence} className="h-2" />
          </div>
        )}

        {rumour.sourceLabel && (
          <Badge variant="outline" className="text-xs" data-testid={`badge-source-${rumour.id}`}>
            {rumour.sourceLabel}
          </Badge>
        )}
      </CardContent>
    </Card>
  );
}
