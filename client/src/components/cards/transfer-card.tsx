import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ArrowRight } from "lucide-react";
import { format } from "date-fns";
import { TeamCrest } from "@/components/team-crest";
import type { BlendedTransferItem } from "@/data/transfers-dummy";

interface TransferCardProps {
  transfer: BlendedTransferItem;
}

const USE_DEST_ACCENT = false;

const dealTypeStyles: Record<string, string> = {
  Loan: "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30",
  Permanent: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
  Free: "bg-gray-500/15 text-gray-700 dark:text-gray-400 border-gray-500/30",
};

const tierStyles: Record<string, string> = {
  "Tier A": "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400 border-yellow-500/30",
  "Tier B": "bg-gray-400/15 text-gray-600 dark:text-gray-300 border-gray-400/30",
  "Tier C": "bg-amber-700/15 text-amber-700 dark:text-amber-500 border-amber-700/30 border-dashed",
};

export function TransferCard({ transfer }: TransferCardProps) {
  const isConfirmed = transfer.kind === "confirmed";
  
  const playerName = transfer.playerName;
  const position = transfer.position;
  const fromClub = transfer.fromClub;
  const toClub = transfer.toClub;
  
  const dealType = transfer.moveType;
  const feeText = transfer.feeText;
  const date = isConfirmed ? transfer.confirmedAt : transfer.updatedAt;
  const formattedDate = format(new Date(date), "d MMM yyyy");
  
  const confidence = !isConfirmed ? transfer.confidence : undefined;
  const tier = !isConfirmed ? transfer.tier : undefined;
  const sourceLabel = !isConfirmed ? transfer.sourceLabel : undefined;
  const sourceType = isConfirmed ? transfer.sourceType : undefined;
  
  const statusBadgeText = isConfirmed ? "Confirmed" : "Rumour";
  
  const statusBadgeClass = isConfirmed
    ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30"
    : "bg-gray-500/15 text-gray-600 dark:text-gray-300 border-gray-500/30";

  return (
    <Card 
      className={`hover-elevate overflow-visible ${USE_DEST_ACCENT ? "border-l-[3px] border-l-primary/15" : ""}`}
      data-testid={`card-transfer-${transfer.id}`}
    >
      <CardContent className="p-4 space-y-3">
        {/* HEADER ROW: Player name + position | Status badge */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            <h3 className="font-semibold text-base leading-tight" data-testid={`text-player-${transfer.id}`}>
              {playerName}
            </h3>
            {position && (
              <Badge variant="outline" className="shrink-0 text-xs">
                {position}
              </Badge>
            )}
          </div>
          <Badge 
            variant="outline" 
            className={`${statusBadgeClass} shrink-0 text-xs`}
            data-testid={`badge-status-${transfer.id}`}
          >
            {statusBadgeText}
          </Badge>
        </div>

        {/* CLUB MOVEMENT ROW */}
        <div className="flex items-center gap-2 text-sm" data-testid={`movement-${transfer.id}`}>
          <div className="flex items-center gap-1.5 min-w-0">
            <TeamCrest teamName={fromClub} size="sm" />
            <span className="truncate text-muted-foreground">{fromClub}</span>
          </div>
          <ArrowRight className="h-4 w-4 text-primary shrink-0" />
          <div className="flex items-center gap-1.5 min-w-0">
            <TeamCrest teamName={toClub} size="sm" />
            <span className="truncate">{toClub}</span>
          </div>
        </div>

        {/* DEAL ROW: Deal type pill + fee | Date */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            {dealType && (
              <Badge 
                variant="outline" 
                className={`${dealTypeStyles[dealType] || dealTypeStyles.Permanent} text-xs`}
                data-testid={`badge-dealtype-${transfer.id}`}
              >
                {dealType}
              </Badge>
            )}
            {feeText && (
              <span className="font-semibold text-sm" data-testid={`text-fee-${transfer.id}`}>
                {feeText}
              </span>
            )}
          </div>
          <span className="text-xs text-muted-foreground shrink-0" data-testid={`text-date-${transfer.id}`}>
            {formattedDate}
          </span>
        </div>

        {/* RUMOUR-ONLY META: Confidence bar + tier */}
        {!isConfirmed && confidence !== undefined && (
          <div className="space-y-1.5" data-testid={`confidence-${transfer.id}`}>
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Confidence</span>
                {tier && (
                  <Badge 
                    variant="outline" 
                    className={`${tierStyles[tier] || ""} text-xs`}
                    data-testid={`badge-tier-${transfer.id}`}
                  >
                    {tier}
                  </Badge>
                )}
              </div>
              <span className="font-medium">{confidence}%</span>
            </div>
            <Progress value={confidence} className="h-1.5" />
          </div>
        )}

        {/* FOOTER ROW: Source chip | FPL tag */}
        {(sourceLabel || isConfirmed) && (
          <div className="flex items-center justify-between gap-2 pt-1">
            {sourceLabel ? (
              <Badge 
                variant="outline" 
                className="text-xs text-muted-foreground"
                data-testid={`badge-source-${transfer.id}`}
              >
                {sourceLabel}
              </Badge>
            ) : isConfirmed && sourceType === "Official" ? (
              <Badge 
                variant="outline" 
                className="text-xs text-muted-foreground"
                data-testid={`badge-source-${transfer.id}`}
              >
                Official
              </Badge>
            ) : null}
            {isConfirmed && sourceType === "FPL" && (
              <Badge 
                variant="outline" 
                className="text-xs bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-500/30 ml-auto"
                data-testid={`badge-fpl-${transfer.id}`}
              >
                FPL
              </Badge>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
