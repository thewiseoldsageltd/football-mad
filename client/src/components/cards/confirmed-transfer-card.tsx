import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, CheckCircle } from "lucide-react";
import { format } from "date-fns";
import type { ConfirmedTransfer } from "@/data/transfers-dummy";

interface ConfirmedTransferCardProps {
  transfer: ConfirmedTransfer;
}

const moveTypeStyles: Record<string, string> = {
  Permanent: "bg-primary/20 text-primary border-primary",
  Loan: "bg-blue-500/20 text-blue-700 dark:text-blue-400 border-blue-500",
  Free: "bg-green-500/20 text-green-700 dark:text-green-400 border-green-500",
};

const sourceTypeStyles: Record<string, string> = {
  FPL: "bg-purple-500/20 text-purple-700 dark:text-purple-400 border-purple-500",
  Official: "bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border-emerald-500",
};

export function ConfirmedTransferCard({ transfer }: ConfirmedTransferCardProps) {
  const formattedDate = format(new Date(transfer.confirmedAt), "d MMM yyyy");

  return (
    <Card className="hover-elevate" data-testid={`card-confirmed-${transfer.id}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-lg" data-testid={`text-player-${transfer.id}`}>
                {transfer.playerName}
              </h3>
              {transfer.position && (
                <Badge variant="outline" className="text-xs">
                  {transfer.position}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>{transfer.fromClub}</span>
              <ArrowRight className="h-4 w-4 text-primary" />
              <span>{transfer.toClub}</span>
            </div>
          </div>
          <CheckCircle className="h-5 w-5 text-primary shrink-0" />
        </div>

        <div className="flex flex-wrap items-center gap-2 mb-3">
          <Badge variant="outline" className={moveTypeStyles[transfer.moveType]} data-testid={`badge-movetype-${transfer.id}`}>
            {transfer.moveType}
          </Badge>
          {transfer.feeText && (
            <span className="font-bold text-primary" data-testid={`text-fee-${transfer.id}`}>{transfer.feeText}</span>
          )}
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground" data-testid={`text-date-${transfer.id}`}>{formattedDate}</span>
          <Badge variant="outline" className={sourceTypeStyles[transfer.sourceType]} data-testid={`badge-source-${transfer.id}`}>
            {transfer.sourceType}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
